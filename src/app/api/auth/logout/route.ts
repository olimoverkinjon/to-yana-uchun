import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { destroySession, getSession } from "@/features/auth/api/session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { rateLimit, rateLimitHeaders, rateLimitKey } from "@/shared/lib/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const limited = rateLimit(rateLimitKey(request, "auth:logout"), 60, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, ...rateLimitHeaders(limited) } },
    );
  }

  const session = await getSession();
  const headerList = await headers();

  if (session) {
    const supabase = createSupabaseServiceClient();
    await supabase.from("activity_logs").insert({
      user_id: session.profileId,
      action: "logout",
      metadata: {
        telegram_id: session.telegramId,
        session_duration_ms: Math.max(Date.now() - session.issuedAt, 0),
      },
      ip_address: clientIp(headerList),
      user_agent: headerList.get("user-agent"),
    });
  }

  await destroySession();
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headerList.get("x-real-ip");
}
