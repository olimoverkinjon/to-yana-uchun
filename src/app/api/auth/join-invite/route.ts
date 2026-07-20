import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { getSession } from "@/features/auth/api/session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";
import { rateLimit, rateLimitHeaders, rateLimitKey } from "@/shared/lib/rate-limit";

const bodySchema = z.object({
  inviteCode: z.string().trim().min(1).max(80),
});
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const limited = rateLimit(rateLimitKey(request, "auth:join-invite"), 30, 5 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(limited) });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401, headers: NO_STORE });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const inviteCode = parsed.data.inviteCode.trim();
  const requestHeaders = await headers();
  const supabase = createSupabaseServiceClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: { group_id?: string | null } | null; error: { message?: string } | null }>;

  const { data, error } = await rpc("join_group_by_invite", {
    p_profile_id: session.profileId,
    p_invite_code: inviteCode,
  });

  if (error) {
    console.warn("[api/auth/join-invite] invite join failed", error.message);
    await supabase.from("system_logs").insert({
      source: "auth",
      level: "warning",
      message: "Invite join failed",
      metadata: {
        telegram_id: session.telegramId,
        invite_code: inviteCode,
        error: error.message ?? null,
      } satisfies Record<string, Json>,
    });
    return NextResponse.json({ error: "invite_join_failed" }, { status: 400, headers: NO_STORE });
  }

  await supabase.from("activity_logs").insert({
    user_id: session.profileId,
    action: "group_join",
    group_id: data?.group_id ?? null,
    metadata: { telegram_id: session.telegramId, invite_code: inviteCode },
    ip_address: clientIp(requestHeaders),
    user_agent: requestHeaders.get("user-agent"),
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headerList.get("x-real-ip");
}
