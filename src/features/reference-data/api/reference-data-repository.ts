import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type GiftTypeRow = Database["public"]["Tables"]["gift_types"]["Row"];
export type CurrencyRow = Database["public"]["Tables"]["currencies"]["Row"];

type Client = SupabaseClient<Database>;

/**
 * Reference data reads, written once and called from both sides.
 *
 * Each takes the Supabase client rather than creating one, so the exact same
 * query runs on the server (to prefetch into the query cache) and in the
 * browser (to refetch or subscribe). Two implementations of "list the gift
 * types" would be two chances to filter or sort them differently.
 */
export async function listGiftTypes(supabase: Client): Promise<GiftTypeRow[]> {
  const { data, error } = await supabase
    .from("gift_types")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listCurrencies(supabase: Client): Promise<CurrencyRow[]> {
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
