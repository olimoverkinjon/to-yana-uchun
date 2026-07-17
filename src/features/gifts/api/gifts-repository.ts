import type { SupabaseClient } from "@supabase/supabase-js";

import { demoAuditLogs, demoGifts } from "@/features/demo/demo-data";
import type { Database } from "@/lib/supabase/types";
import { isLocalDemoMode } from "@/shared/lib/local-demo";

import type { GiftFilters, GiftListPage, GiftWithRelations } from "../types";

type Client = SupabaseClient<Database>;

export const GIFTS_PAGE_SIZE = 20;

/**
 * The joined shape every gift view needs. Declared once: the giver's name is
 * never useful without knowing what they gave, in which currency, and who
 * recorded it. Named FK hints (`gifts_created_by_fkey`) rather than bare
 * `profiles` because gifts references profiles twice — created_by and
 * updated_by — and PostgREST cannot guess which one is meant.
 */
const GIFT_SELECT = `
  *,
  gift_type:gift_types!gifts_gift_type_id_fkey (id, name, slug, icon),
  currency:currencies!gifts_currency_id_fkey (id, code, symbol),
  created_by_profile:profiles!gifts_created_by_fkey (id, first_name, last_name, username, photo_url)
` as const;

/** See the matching helper in the events repository for why this exists. */
function escapeSearchTerm(term: string): string {
  return term
    .replace(/[\\%_]/g, "\\$&")
    .replace(/[,().*:"']/g, " ")
    .trim();
}

interface Orderable<T> {
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): T;
}

function applySort<T extends Orderable<T>>(query: T, sort: GiftFilters["sort"]): T {
  switch (sort) {
    case "oldest":
      return query.order("gift_date", { ascending: true }).order("created_at", { ascending: true });
    case "highest_amount":
      // nullsFirst: false keeps non-cash gifts (which have no amount) out of
      // the way when the user asked to see the largest amounts.
      return query.order("amount", { ascending: false, nullsFirst: false });
    case "lowest_amount":
      return query.order("amount", { ascending: true, nullsFirst: false });
    case "alphabetical":
      return query.order("giver_name", { ascending: true });
    case "newest":
    default:
      return query.order("gift_date", { ascending: false }).order("created_at", { ascending: false });
  }
}

export async function listGifts(
  supabase: Client,
  filters: GiftFilters = {},
  { offset = 0, limit = GIFTS_PAGE_SIZE }: { offset?: number; limit?: number } = {},
): Promise<GiftListPage> {
  if (isLocalDemoMode()) {
    const filtered = filters.eventId ? demoGifts.filter((gift) => gift.event_id === filters.eventId) : demoGifts;
    const items = filtered.slice(offset, offset + limit);
    return {
      items,
      totalCount: filtered.length,
      nextOffset: offset + items.length < filtered.length ? offset + items.length : null,
    };
  }

  let query = supabase.from("gifts").select(GIFT_SELECT, { count: "exact" });

  if (filters.eventId) query = query.eq("event_id", filters.eventId);
  if (!filters.includeDeleted) query = query.is("deleted_at", null);
  if (filters.giftTypeId) query = query.eq("gift_type_id", filters.giftTypeId);
  if (filters.currencyId) query = query.eq("currency_id", filters.currencyId);

  if (filters.year) {
    query = query.gte("gift_date", `${filters.year}-01-01`).lte("gift_date", `${filters.year}-12-31`);
  }

  const search = filters.search?.trim();
  if (search) {
    const term = escapeSearchTerm(search);
    if (term) {
      query = query.or(`giver_name.ilike.%${term}%,description.ilike.%${term}%,notes.ilike.%${term}%`);
    }
  }

  query = applySort(query, filters.sort);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const items = (data ?? []) as unknown as GiftWithRelations[];
  const totalCount = count ?? 0;
  const consumed = offset + items.length;

  return {
    items,
    nextOffset: consumed < totalCount ? consumed : null,
    totalCount,
  };
}

export async function getGift(supabase: Client, id: string): Promise<GiftWithRelations | null> {
  if (isLocalDemoMode()) return demoGifts.find((gift) => gift.id === id) ?? demoGifts[0] ?? null;

  const { data, error } = await supabase.from("gifts").select(GIFT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as GiftWithRelations) ?? null;
}

/**
 * Everything one person ever gave, across every wedding — the single most
 * common real-world question this product answers ("what did they give us, so
 * we know what to reciprocate?").
 */
export async function listGiftsByGiver(supabase: Client, giverName: string, limit = 50): Promise<GiftWithRelations[]> {
  if (isLocalDemoMode()) {
    return demoGifts.filter((gift) => gift.giver_name.toLowerCase().includes(giverName.toLowerCase())).slice(0, limit);
  }

  const term = escapeSearchTerm(giverName);
  if (!term) return [];

  const { data, error } = await supabase
    .from("gifts")
    .select(GIFT_SELECT)
    .ilike("giver_name", `%${term}%`)
    .is("deleted_at", null)
    .order("gift_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as GiftWithRelations[];
}

export async function getGiftAuditHistory(supabase: Client, giftId: string, limit = 50) {
  if (isLocalDemoMode()) return demoAuditLogs.filter((row) => row.related_gift_id === giftId).slice(0, limit);

  const { data, error } = await supabase
    .from("recent_activity")
    .select("*")
    .eq("table_name", "gifts")
    .eq("record_id", giftId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
