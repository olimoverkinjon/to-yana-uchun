import { createClient } from "@supabase/supabase-js";

import { clientEnv } from "@/lib/env";

import type { Database } from "./types";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function fetchAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch("/api/auth/supabase-token");
  if (!response.ok) {
    cachedToken = null;
    return null;
  }

  const data = (await response.json()) as { accessToken: string; expiresIn: number };
  // Refresh 60s before real expiry so a request never races an
  // about-to-expire token.
  cachedToken = { token: data.accessToken, expiresAt: Date.now() + (data.expiresIn - 60) * 1000 };
  return cachedToken.token;
}

/**
 * Browser-side Supabase client. Safe to import from client components — it
 * only ever sees the public URL and anon key. Per-request identity comes
 * from a short-lived access token fetched from our own session endpoint
 * (see /api/auth/supabase-token), not from Supabase's own auth cookies,
 * which this app never sets. Required for Realtime subscriptions to be
 * scoped by RLS to the signed-in user, same as any other query.
 */
export function createSupabaseBrowserClient() {
  return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    accessToken: fetchAccessToken,
  });
}
