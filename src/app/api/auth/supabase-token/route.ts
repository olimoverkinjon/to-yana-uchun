import { NextResponse } from "next/server";

import { getSession } from "@/features/auth/api/session";
import { mintSupabaseAccessToken, SUPABASE_ACCESS_TOKEN_TTL_SECONDS } from "@/lib/supabase/jwt";
import { rateLimit, rateLimitHeaders, rateLimitKey } from "@/shared/lib/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Issues a short-lived Supabase access token for the browser client (used
 * for direct queries and Realtime subscriptions). Requires an existing
 * first-party session — this never accepts a Telegram initData payload
 * itself, it only re-mints a token for whoever /api/auth/telegram already
 * verified and signed in.
 */
export async function GET(request: Request) {
  const limited = rateLimit(rateLimitKey(request, "auth:supabase-token"), 120, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, ...rateLimitHeaders(limited) } },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401, headers: NO_STORE });
  }

  const accessToken = mintSupabaseAccessToken(session.profileId);
  return NextResponse.json({ accessToken, expiresIn: SUPABASE_ACCESS_TOKEN_TTL_SECONDS }, { headers: NO_STORE });
}
