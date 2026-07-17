import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { createSession } from "@/features/auth/api/session";
import { InitDataVerificationError, verifyTelegramInitData } from "@/features/auth/api/verify-init-data";
import { localeCookieName, normalizeLocale } from "@/i18n/config";
import { serverEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/lib/supabase/types";
import { rateLimit, rateLimitHeaders, rateLimitKey } from "@/shared/lib/rate-limit";

const bodySchema = z.object({ initData: z.string().min(1) });
const NO_STORE = { "Cache-Control": "no-store" };

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Detect → verify → upsert profile → create session (PRD §9). Never trusts
 * a Telegram user object sent directly by the client — only the signed
 * `initData` string, which is re-verified here from scratch. The profile
 * upsert runs through the service-role client because, at this point in the
 * flow, there is no session/JWT yet for RLS to check — upsert_telegram_profile
 * is exactly the "every Telegram user automatically gets a profile" rule,
 * centralized in the database (see its migration for why it's security
 * definer and revoked from every client role).
 */
export async function POST(request: Request) {
  const limited = rateLimit(rateLimitKey(request, "auth:telegram"), 20, 5 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(limited) });
  }

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const ipAddress = clientIp(requestHeaders);
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    await logSecurityEvent("auth", "warning", "Invalid Telegram auth request", { ipAddress, userAgent });
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const { user, startParam } = verifyTelegramInitData(parsed.data.initData);

    const supabase = createSupabaseServiceClient();
    const { data: profile, error } = await supabase
      .rpc("upsert_telegram_profile", {
        p_telegram_id: user.id,
        p_first_name: user.firstName,
        p_is_premium: user.isPremium,
        // Generated `Args` types are `string`, not `string | null`, because
        // Postgres function parameter types don't carry column-level
        // nullability the way table types do — these text params genuinely
        // accept (and are meant to receive) null for an absent value.
        p_username: (user.username ?? null) as string,
        p_last_name: (user.lastName ?? null) as string,
        p_photo_url: (user.photoUrl ?? null) as string,
        p_language_code: (user.languageCode ?? null) as string,
      })
      .single<ProfileRow>();

    if (error || !profile) {
      console.error("[api/auth/telegram] profile upsert failed", error);
      await logSecurityEvent("auth", "error", "Telegram profile upsert failed", {
        ipAddress,
        userAgent,
        error: error?.message,
      });
      return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
    }

    await grantRoleIfMissing(supabase, profile.id, "viewer");
    await syncExclusiveSuperAdmin(supabase, profile.id, user.id);
    await syncGroupMembership(supabase, profile.id, user.id, startParam);

    await createSession({
      profileId: profile.id,
      telegramId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      photoUrl: user.photoUrl,
      languageCode: user.languageCode,
      isPremium: user.isPremium,
    });

    const insertInto = supabase.from as unknown as (table: string) => {
      insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
    await insertInto("activity_logs").insert({
      user_id: profile.id,
      action: "login",
      group_id: await resolveCurrentGroupId(supabase, profile.id),
      metadata: { telegram_id: user.id, start_param: startParam ?? null },
      ip_address: ipAddress ?? null,
      user_agent: userAgent,
    });

    const response = NextResponse.json({ ok: true, user }, { headers: NO_STORE });
    response.cookies.set(localeCookieName, normalizeLocale(user.languageCode), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    if (error instanceof InitDataVerificationError) {
      await logSecurityEvent("auth", "warning", "Telegram initData verification failed", { ipAddress, userAgent });
      return NextResponse.json({ error: "verification_failed" }, { status: 401, headers: NO_STORE });
    }
    console.error("[api/auth/telegram] unexpected error", error);
    await logSecurityEvent("auth", "error", "Unexpected Telegram authentication error", {
      ipAddress,
      userAgent,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}

function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headerList.get("x-real-ip");
}

async function syncExclusiveSuperAdmin(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  profileId: string,
  telegramId: number,
) {
  const configuredIds = serverEnv()
    .BOOTSTRAP_SUPER_ADMIN_TELEGRAM_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const isConfiguredOwner = configuredIds?.includes(String(telegramId)) ?? false;

  if (isConfiguredOwner) {
    await grantRoleIfMissing(supabase, profileId, "super_admin");
    await revokeSuperAdminFromEveryoneElse(supabase, profileId);
    return;
  }

  await revokeRoleIfPresent(supabase, profileId, "super_admin");
}

async function grantRoleIfMissing(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  profileId: string,
  roleName: "viewer" | "super_admin",
) {
  const { data: role, error: roleError } = await supabase.from("roles").select("id").eq("name", roleName).single();

  if (roleError || !role) {
    console.error(`[api/auth/telegram] ${roleName} role lookup failed`, roleError);
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", profileId)
    .eq("role_id", role.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) {
    console.error(`[api/auth/telegram] ${roleName} role check failed`, existingError);
    return;
  }

  if (existing) return;

  const { error: insertError } = await supabase.from("user_roles").insert({
    user_id: profileId,
    role_id: role.id,
    granted_by: null,
  });

  if (insertError) {
    console.error(`[api/auth/telegram] ${roleName} role grant failed`, insertError);
  }
}

async function revokeRoleIfPresent(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  profileId: string,
  roleName: "viewer" | "super_admin",
) {
  const { data: role, error: roleError } = await supabase.from("roles").select("id").eq("name", roleName).single();

  if (roleError || !role) {
    console.error(`[api/auth/telegram] ${roleName} role lookup failed`, roleError);
    return;
  }

  const { error } = await supabase
    .from("user_roles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", profileId)
    .eq("role_id", role.id)
    .is("deleted_at", null);

  if (error) {
    console.error(`[api/auth/telegram] ${roleName} role revoke failed`, error);
  }
}

async function revokeSuperAdminFromEveryoneElse(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  ownerProfileId: string,
) {
  const { data: role, error: roleError } = await supabase.from("roles").select("id").eq("name", "super_admin").single();

  if (roleError || !role) {
    console.error("[api/auth/telegram] super_admin role lookup failed", roleError);
    return;
  }

  const { error } = await supabase
    .from("user_roles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("role_id", role.id)
    .neq("user_id", ownerProfileId)
    .is("deleted_at", null);

  if (error) {
    console.error("[api/auth/telegram] exclusive super_admin revoke failed", error);
  }
}

async function syncGroupMembership(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  profileId: string,
  telegramId: number,
  startParam?: string,
) {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
  const configuredIds = serverEnv()
    .BOOTSTRAP_SUPER_ADMIN_TELEGRAM_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (configuredIds?.includes(String(telegramId))) {
    const { error } = await rpc("ensure_owner_default_group", { p_profile_id: profileId });
    if (error) console.error("[api/auth/telegram] owner group sync failed", error);
    return;
  }

  const inviteCode = startParam?.trim();
  if (!inviteCode) return;

  const { error } = await rpc("join_group_by_invite", {
    p_profile_id: profileId,
    p_invite_code: inviteCode,
  });
  if (error) console.error("[api/auth/telegram] invite join failed", error);
}

async function resolveCurrentGroupId(supabase: ReturnType<typeof createSupabaseServiceClient>, profileId: string) {
  const from = supabase.from as unknown as (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        is: (
          column: string,
          value: null,
        ) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => {
            limit: (count: number) => {
              maybeSingle: () => Promise<{ data: { group_id: string | null } | null; error: unknown }>;
            };
          };
        };
      };
    };
  };
  const { data, error } = await from("group_members")
    .select("group_id")
    .eq("user_id", profileId)
    .is("deleted_at", null)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/auth/telegram] current group lookup failed", error);
    return null;
  }

  return data?.group_id ?? null;
}

async function logSecurityEvent(
  source: string,
  level: "warning" | "error",
  message: string,
  metadata: Record<string, Json | undefined>,
) {
  const supabase = createSupabaseServiceClient();
  await supabase.from("system_logs").insert({ source, level, message, metadata });
}
