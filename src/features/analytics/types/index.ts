import type { Database } from "@/lib/supabase/types";

/**
 * The filter set every dashboard query shares. Mirrors the `p_*` arguments
 * that `filtered_gifts` / `filtered_events` take in the database, so a filter
 * added here has exactly one place to be honoured — in SQL, once, rather than
 * in each of a dozen aggregate functions.
 */
export interface DashboardFilters {
  /** The wedding's year, not the gift's date year. */
  year?: number | null;
  eventId?: string | null;
  giftTypeId?: string | null;
  currencyId?: string | null;
  /** Gift-date range, ISO yyyy-mm-dd. */
  from?: string | null;
  to?: string | null;
}

export const EMPTY_FILTERS: DashboardFilters = {};

/** One currency's cash figure. Never summed with another's. */
export interface CashTotal {
  currency_code: string;
  currency_symbol: string | null;
  total_amount: number;
}

export type DashboardTotalsRow = Database["public"]["Functions"]["dashboard_totals"]["Returns"][number];
export type EventStatisticsRow = Database["public"]["Functions"]["event_statistics"]["Returns"][number];
export type GlobalAveragesRow = Database["public"]["Functions"]["global_averages"]["Returns"][number];
export type GiftsByMonthRow = Database["public"]["Functions"]["gifts_by_month"]["Returns"][number];
export type GiftsByYearRow = Database["public"]["Functions"]["gifts_by_year"]["Returns"][number];
export type EventsByYearRow = Database["public"]["Functions"]["events_by_year"]["Returns"][number];
export type GiftTypeDistributionRow = Database["public"]["Functions"]["gift_type_distribution"]["Returns"][number];
export type CashDistributionRow = Database["public"]["Functions"]["cash_distribution"]["Returns"][number];
export type ContributorsGrowthRow = Database["public"]["Functions"]["contributors_growth"]["Returns"][number];
export type TopContributorRow = Database["public"]["Functions"]["top_contributors"]["Returns"][number];

/** dashboard_totals, with the jsonb and numeric-as-string columns parsed. */
export interface DashboardTotals {
  totalEvents: number;
  totalGifts: number;
  totalContributors: number;
  cashTotals: CashTotal[];
  goldWeight: number;
  livestockCount: number;
  otherCount: number;
  lastUpdated: string | null;
  trends: {
    events: number | null;
    gifts: number | null;
    contributors: number | null;
    cash: number | null;
    gold: number | null;
    livestock: number | null;
    other: number | null;
  };
}

export interface EventStatistics {
  totalGifts: number;
  totalContributors: number;
  cashTotals: CashTotal[];
  goldWeight: number;
  goldCount: number;
  livestockCount: number;
  productsCount: number;
  mostCommonType: string | null;
  mostCommonCount: number;
  newestGiftDate: string | null;
  oldestGiftDate: string | null;
}

export interface GlobalAverages {
  totalEvents: number;
  totalGifts: number;
  totalPeople: number;
  avgGiftsPerEvent: number | null;
  avgContributorsPerEvent: number | null;
  avgCashPerEvent: CashTotal[];
  avgLivestockPerEvent: number | null;
  avgGoldPerEvent: number | null;
}

export interface TopContributor {
  giverName: string;
  giftCount: number;
  cashTotals: CashTotal[];
  lastGiftDate: string | null;
  eventCount: number;
}

export interface SearchAnalytics {
  recentSearches: { query: string; created_at: string }[];
  topSearchTerms: { query: string; search_count: number }[];
  mostOpenedEvents: { event_id: string; title: string; view_count: number }[];
}
