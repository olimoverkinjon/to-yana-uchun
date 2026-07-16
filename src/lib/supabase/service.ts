import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv, serverEnv } from "@/lib/env";

import type { Database } from "./types";

/**
 * Service-role client — bypasses Row Level Security entirely. Reserved for
 * trusted server-only operations that run before a user session exists,
 * such as verifying Telegram initData and upserting the corresponding
 * profile row. Never import this outside `app/api/**` route handlers.
 */
export function createSupabaseServiceClient() {
  return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
