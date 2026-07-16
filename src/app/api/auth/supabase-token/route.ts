import { NextResponse } from "next/server";

import { getSession } from "@/features/auth/api/session";
import { mintSupabaseAccessToken, SUPABASE_ACCESS_TOKEN_TTL_SECONDS } from "@/lib/supabase/jwt";

/**
 * Issues a short-lived Supabase access token for the browser client (used
 * for direct queries and Realtime subscriptions). Requires an existing
 * first-party session — this never accepts a Telegram initData payload
 * itself, it only re-mints a token for whoever /api/auth/telegram already
 * verified and signed in.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const accessToken = mintSupabaseAccessToken(session.profileId);
  return NextResponse.json({ accessToken, expiresIn: SUPABASE_ACCESS_TOKEN_TTL_SECONDS });
}
