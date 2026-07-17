import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { PersonalGiftWithCurrency } from "../types";

type Client = SupabaseClient<Database>;

const PERSONAL_GIFT_SELECT = `
  *,
  currency:currencies!personal_gifts_currency_id_fkey (id, code, symbol)
` as const;

export async function listPersonalGifts(supabase: Client): Promise<PersonalGiftWithCurrency[]> {
  const { data, error } = await supabase
    .from("personal_gifts")
    .select(PERSONAL_GIFT_SELECT)
    .is("deleted_at", null)
    .order("gift_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PersonalGiftWithCurrency[];
}
