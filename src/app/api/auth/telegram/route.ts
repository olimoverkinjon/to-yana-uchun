import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession } from "@/features/auth/api/session";
import { InitDataVerificationError, verifyTelegramInitData } from "@/features/auth/api/verify-init-data";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

const bodySchema = z.object({ initData: z.string().min(1) });

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
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const { user } = verifyTelegramInitData(parsed.data.initData);

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
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

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

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof InitDataVerificationError) {
      return NextResponse.json({ error: "verification_failed" }, { status: 401 });
    }
    console.error("[api/auth/telegram] unexpected error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
