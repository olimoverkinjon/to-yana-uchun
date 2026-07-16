import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { clientEnv } from "@/lib/env";

import type { Database } from "./types";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function fetchAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch("/api/auth/supabase-token");
  if (!response.ok) {
    cachedToken = null;
    // An empty string, not a throw: supabase-js calls this for every request
    // including ones made before sign-in. No token simply means RLS treats
    // the caller as unauthenticated, which is the correct answer here.
    return "";
  }

  const data = (await response.json()) as { accessToken: string; expiresIn: number };
  // Refresh 60s before real expiry so a request never races an
  // about-to-expire token.
  cachedToken = { token: data.accessToken, expiresAt: Date.now() + (data.expiresIn - 60) * 1000 };
  return cachedToken.token;
}

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Browser-side Supabase client. Safe to import from client components — it
 * only ever sees the public URL and anon key. Per-request identity comes from
 * a short-lived access token fetched from our own session endpoint (see
 * /api/auth/supabase-token), not from Supabase's auth cookies, which this app
 * never sets. That is also what scopes Realtime subscriptions by RLS: the
 * client hands the same token to the Realtime socket, so a Viewer's socket
 * receives exactly the rows their SELECT policy allows.
 *
 * A singleton, deliberately. Every `createClient` call builds its own
 * RealtimeClient, so returning a fresh instance per caller would open a
 * WebSocket per subscribing component and leave the rest orphaned.
 */
export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  browserClient ??= createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      accessToken: fetchAccessToken,
    },
  );
  return browserClient;
}

/**
 * Drops the cached access token so the next request mints a fresh one. Call
 * after sign-in, when the session the token is derived from has changed.
 */
export function resetSupabaseAccessToken() {
  cachedToken = null;
}
