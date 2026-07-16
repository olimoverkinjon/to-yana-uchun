import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type {
  EventCashTotalRow,
  EventFilters,
  EventGiftTypeTotalRow,
  EventListPage,
  EventRow,
  EventSummaryRow,
} from "../types";

type Client = SupabaseClient<Database>;

export const EVENTS_PAGE_SIZE = 12;

/**
 * Every read the Events module performs, in one place, each taking the
 * Supabase client as an argument.
 *
 * That signature is the point: the identical function runs on the server (to
 * prefetch a page into the query cache so the first paint has real content)
 * and in the browser (to paginate, refetch after a realtime event, or
 * re-filter). Nothing here decides *who* may see a row — that is RLS's job,
 * and these queries are written as though every row were visible, because the
 * database will narrow them per caller.
 */

/**
 * Escapes a user's search text for PostgREST's `or` filter grammar, where
 * `,` separates conditions and `.` separates operands. An unescaped comma
 * would not just break the query — it would let typed input restructure the
 * filter. The wildcards are ours to add, so `%` and `_` are escaped too.
 */
function escapeSearchTerm(term: string): string {
  return term
    .replace(/[\\%_]/g, "\\$&")
    .replace(/[,().*:"']/g, " ")
    .trim();
}

/**
 * Structural shape of the part of PostgREST's builder this needs. Spelling it
 * out keeps applySort reusable across the summary and base-table queries
 * without naming (and pinning ourselves to) the builder's full generic type.
 */
interface Orderable<T> {
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): T;
}

function applySort<T extends Orderable<T>>(query: T, sort: EventFilters["sort"]): T {
  switch (sort) {
    case "oldest":
      return query.order("event_year", { ascending: true }).order("event_date", { ascending: true, nullsFirst: false });
    case "alphabetical":
      return query.order("title", { ascending: true });
    case "recently_updated":
      return query.order("updated_at", { ascending: false });
    case "newest":
    default:
      // Year first, then date: an event recorded with only a year still sorts
      // sensibly among events that have a full date in the same year.
      return query
        .order("event_year", { ascending: false })
        .order("event_date", { ascending: false, nullsFirst: false });
  }
}

export async function listEvents(
  supabase: Client,
  filters: EventFilters = {},
  { offset = 0, limit = EVENTS_PAGE_SIZE }: { offset?: number; limit?: number } = {},
): Promise<EventListPage> {
  let query = supabase.from("event_summaries").select("*", { count: "exact" });

  if (!filters.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.year) {
    query = query.eq("event_year", filters.year);
  }

  const search = filters.search?.trim();
  if (search) {
    const term = escapeSearchTerm(search);
    if (term) {
      query = query.or(`title.ilike.%${term}%,bride_name.ilike.%${term}%,groom_name.ilike.%${term}%`);
    }
  }

  query = applySort(query, filters.sort);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const items = (data ?? []) as EventSummaryRow[];
  const totalCount = count ?? 0;
  const consumed = offset + items.length;

  return {
    items,
    nextOffset: consumed < totalCount ? consumed : null,
    totalCount,
  };
}

/** Returns null when the event does not exist *or* RLS hides it — see the RPCs. */
export async function getEvent(supabase: Client, id: string): Promise<EventSummaryRow | null> {
  const { data, error } = await supabase.from("event_summaries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEventCashTotals(supabase: Client, eventId: string): Promise<EventCashTotalRow[]> {
  const { data, error } = await supabase
    .from("event_cash_totals")
    .select("*")
    .eq("event_id", eventId)
    .order("currency_code", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getEventGiftTypeTotals(supabase: Client, eventId: string): Promise<EventGiftTypeTotalRow[]> {
  const { data, error } = await supabase
    .from("event_gift_type_totals")
    .select("*")
    .eq("event_id", eventId)
    .order("gift_count", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Distinct years that have at least one event, for the year filter. */
export async function listEventYears(supabase: Client): Promise<number[]> {
  const { data, error } = await supabase
    .from("events")
    .select("event_year")
    .is("deleted_at", null)
    .order("event_year", { ascending: false });

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.event_year))];
}

/**
 * Audit history for one event. Super-admin-only by RLS, so a Viewer simply
 * gets an empty list rather than an error.
 */
export async function getEventAuditHistory(supabase: Client, eventId: string, limit = 50) {
  const { data, error } = await supabase
    .from("recent_activity")
    .select("*")
    .eq("table_name", "events")
    .eq("record_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export type { EventRow, EventSummaryRow };
