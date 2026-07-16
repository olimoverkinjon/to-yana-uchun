import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSession } from "@/features/auth/api/session";
import { clientEnv } from "@/lib/env";

import { mintSupabaseAccessToken } from "./jwt";
import type { Database } from "./types";

/**
 * Server-side Supabase client for Server Components, Route Handlers, and
 * Server Actions. There is no Supabase Auth session to sync (see
 * session.ts) — RLS instead sees whatever `accessToken()` returns on each
 * request, freshly minted from our own session cookie. No session means no
 * token, which means every RLS policy correctly treats the request as
 * unauthenticated.
 */
export function createSupabaseServerClient() {
  return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    accessToken: async () => {
      const session = await getSession();
      return session ? mintSupabaseAccessToken(session.profileId) : null;
    },
  });
}
