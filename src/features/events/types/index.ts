import type { Database } from "@/lib/supabase/types";

import type { EventStatus } from "../schemas/event-schema";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
/** events + gift_count, from the event_summaries view. */
export type EventSummaryRow = Database["public"]["Views"]["event_summaries"]["Row"];
export type EventCashTotalRow = Database["public"]["Views"]["event_cash_totals"]["Row"];
export type EventGiftTypeTotalRow = Database["public"]["Views"]["event_gift_type_totals"]["Row"];

export type EventSortOption = "newest" | "oldest" | "alphabetical" | "recently_updated";

export interface EventFilters {
  /** Free-text query matched against title and the couple's names. */
  search?: string;
  year?: number | null;
  status?: EventStatus | null;
  /** Super-admin-only; a Viewer's RLS policy hides deleted rows regardless. */
  includeDeleted?: boolean;
  sort?: EventSortOption;
}

export interface EventListPage {
  items: EventSummaryRow[];
  /** Offset for the next page, or null when the list is exhausted. */
  nextOffset: number | null;
  totalCount: number;
}
