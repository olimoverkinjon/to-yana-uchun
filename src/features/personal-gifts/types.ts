import type { Database } from "@/lib/supabase/types";

export type PersonalGiftRow = Database["public"]["Tables"]["personal_gifts"]["Row"];
export type PersonalGiftInsert = Database["public"]["Tables"]["personal_gifts"]["Insert"];

export interface PersonalGiftWithCurrency extends PersonalGiftRow {
  currency: Pick<Database["public"]["Tables"]["currencies"]["Row"], "id" | "code" | "symbol"> | null;
}
