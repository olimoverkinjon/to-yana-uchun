import type { SupabaseClient } from "@supabase/supabase-js";

import {
  demoCashDistribution,
  demoDashboardTotals,
  demoEvents,
  demoGlobalAverages,
  demoGrowth,
  demoMonths,
  demoTopContributors,
} from "@/features/demo/demo-data";
import type { Database } from "@/lib/supabase/types";
import { isLocalDemoMode } from "@/shared/lib/local-demo";

import type {
  CashTotal,
  DashboardFilters,
  DashboardTotals,
  EventStatistics,
  GlobalAverages,
  SearchAnalytics,
  TopContributor,
} from "../types";

type Client = SupabaseClient<Database>;

/**
 * Reads for every dashboard figure. Each is a single RPC that aggregates in
 * the database rather than pulling rows to the client and adding them up here
 * — the totals stay correct for large ledgers, and (more importantly) the
 * numbers are computed once, in one place, so a card and a chart cannot
 * quietly disagree about what "total gifts" means.
 *
 * Every function takes the Supabase client, so the same code runs on the
 * server (prefetch) and in the browser (refetch after a realtime event).
 */

/**
 * Postgres `numeric` arrives from PostgREST as a string: a numeric can hold
 * values a JS number cannot, so the driver refuses to round silently. Every
 * money and weight column below is numeric, hence this rather than a bare
 * Number() scattered through the components.
 */
function num(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** As above, but keeps null meaningful — a null trend means "no honest answer". */
function nullableNum(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The cash_totals columns are jsonb, so they land as untyped Json. */
function parseCashTotals(value: unknown): CashTotal[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      currency_code: String(entry.currency_code ?? ""),
      currency_symbol: (entry.currency_symbol as string | null) ?? null,
      total_amount: num(entry.total_amount as number | string),
    }))
    .filter((entry) => entry.currency_code !== "");
}

/** Maps our camelCase filters onto the RPCs' p_* arguments. */
function filterArgs(filters: DashboardFilters) {
  return {
    p_year: filters.year ?? undefined,
    p_event_id: filters.eventId ?? undefined,
    p_gift_type_id: filters.giftTypeId ?? undefined,
    p_currency_id: filters.currencyId ?? undefined,
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
  };
}

export async function getDashboardTotals(supabase: Client, filters: DashboardFilters = {}): Promise<DashboardTotals> {
  if (isLocalDemoMode()) return demoDashboardTotals;

  const { data, error } = await supabase.rpc("dashboard_totals", filterArgs(filters)).single();
  if (error) throw error;

  return {
    totalEvents: num(data.total_events),
    totalGifts: num(data.total_gifts),
    totalContributors: num(data.total_contributors),
    cashTotals: parseCashTotals(data.cash_totals),
    goldWeight: num(data.gold_weight),
    livestockCount: num(data.livestock_count),
    otherCount: num(data.other_count),
    lastUpdated: data.last_updated,
    trends: {
      events: nullableNum(data.events_trend_pct),
      gifts: nullableNum(data.gifts_trend_pct),
      contributors: nullableNum(data.contributors_trend_pct),
      cash: nullableNum(data.cash_trend_pct),
      gold: nullableNum(data.gold_trend_pct),
      livestock: nullableNum(data.livestock_trend_pct),
      other: nullableNum(data.other_trend_pct),
    },
  };
}

export async function getEventStatistics(supabase: Client, eventId: string): Promise<EventStatistics> {
  if (isLocalDemoMode()) {
    return {
      totalGifts: 3,
      totalContributors: 3,
      cashTotals: demoDashboardTotals.cashTotals,
      goldWeight: 12.5,
      goldCount: 1,
      livestockCount: 0,
      productsCount: 1,
      mostCommonType: "Cash",
      mostCommonCount: 2,
      newestGiftDate: "2026-07-17",
      oldestGiftDate: "2026-07-17",
    };
  }

  const { data, error } = await supabase.rpc("event_statistics", { p_event_id: eventId }).single();
  if (error) throw error;

  return {
    totalGifts: num(data.total_gifts),
    totalContributors: num(data.total_contributors),
    cashTotals: parseCashTotals(data.cash_totals),
    goldWeight: num(data.gold_weight),
    goldCount: num(data.gold_count),
    livestockCount: num(data.livestock_count),
    productsCount: num(data.products_count),
    mostCommonType: data.most_common_type,
    mostCommonCount: num(data.most_common_count),
    newestGiftDate: data.newest_gift_date,
    oldestGiftDate: data.oldest_gift_date,
  };
}

export async function getGlobalAverages(supabase: Client, filters: DashboardFilters = {}): Promise<GlobalAverages> {
  if (isLocalDemoMode()) return demoGlobalAverages;

  const { data, error } = await supabase
    .rpc("global_averages", {
      p_year: filters.year ?? undefined,
      p_event_id: filters.eventId ?? undefined,
      p_from: filters.from ?? undefined,
      p_to: filters.to ?? undefined,
    })
    .single();
  if (error) throw error;

  return {
    totalEvents: num(data.total_events),
    totalGifts: num(data.total_gifts),
    totalPeople: num(data.total_people),
    avgGiftsPerEvent: nullableNum(data.avg_gifts_per_event),
    avgContributorsPerEvent: nullableNum(data.avg_contributors_per_event),
    avgCashPerEvent: parseCashTotals(data.avg_cash_per_event),
    avgLivestockPerEvent: nullableNum(data.avg_livestock_per_event),
    avgGoldPerEvent: nullableNum(data.avg_gold_per_event),
  };
}

export interface MonthPoint {
  bucket: string;
  giftCount: number;
  contributors: number;
}

export async function getGiftsByMonth(
  supabase: Client,
  filters: DashboardFilters = {},
  months = 12,
): Promise<MonthPoint[]> {
  if (isLocalDemoMode()) return demoMonths;

  const { data, error } = await supabase.rpc("gifts_by_month", { p_months: months, ...filterArgs(filters) });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    bucket: row.bucket,
    giftCount: num(row.gift_count),
    contributors: num(row.contributors),
  }));
}

export interface YearPoint {
  bucket: number;
  giftCount: number;
  contributors: number;
}

export async function getGiftsByYear(supabase: Client, filters: DashboardFilters = {}): Promise<YearPoint[]> {
  if (isLocalDemoMode()) return [{ bucket: 2026, giftCount: 3, contributors: 3 }];

  const { data, error } = await supabase.rpc("gifts_by_year", filterArgs(filters));
  if (error) throw error;

  return (data ?? []).map((row) => ({
    bucket: row.bucket,
    giftCount: num(row.gift_count),
    contributors: num(row.contributors),
  }));
}

export async function getEventsByYear(
  supabase: Client,
  filters: DashboardFilters = {},
): Promise<{ bucket: number; eventCount: number }[]> {
  if (isLocalDemoMode()) return [{ bucket: 2026, eventCount: demoEvents.length }];

  const { data, error } = await supabase.rpc("events_by_year", {
    p_year: filters.year ?? undefined,
    p_event_id: filters.eventId ?? undefined,
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({ bucket: row.bucket, eventCount: num(row.event_count) }));
}

export interface GiftTypeSlice {
  giftTypeId: string;
  name: string;
  slug: string;
  category: string;
  giftCount: number;
  totalWeight: number | null;
  sharePct: number;
}

export async function getGiftTypeDistribution(
  supabase: Client,
  filters: DashboardFilters = {},
): Promise<GiftTypeSlice[]> {
  if (isLocalDemoMode()) {
    return [
      {
        giftTypeId: "cash",
        name: "Cash",
        slug: "cash",
        category: "cash",
        giftCount: 2,
        totalWeight: null,
        sharePct: 66.7,
      },
      {
        giftTypeId: "gold",
        name: "Gold",
        slug: "gold",
        category: "gold",
        giftCount: 1,
        totalWeight: 12.5,
        sharePct: 33.3,
      },
    ];
  }

  const { data, error } = await supabase.rpc("gift_type_distribution", {
    p_year: filters.year ?? undefined,
    p_event_id: filters.eventId ?? undefined,
    p_currency_id: filters.currencyId ?? undefined,
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    giftTypeId: row.gift_type_id,
    name: row.gift_type_name,
    slug: row.gift_type_slug,
    category: row.category,
    giftCount: num(row.gift_count),
    totalWeight: nullableNum(row.total_weight),
    sharePct: num(row.share_pct),
  }));
}

export interface CashSlice {
  currencyId: string;
  code: string;
  symbol: string | null;
  totalAmount: number;
  giftCount: number;
  countSharePct: number;
}

export async function getCashDistribution(supabase: Client, filters: DashboardFilters = {}): Promise<CashSlice[]> {
  if (isLocalDemoMode()) return demoCashDistribution;

  const { data, error } = await supabase.rpc("cash_distribution", {
    p_year: filters.year ?? undefined,
    p_event_id: filters.eventId ?? undefined,
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    currencyId: row.currency_id,
    code: row.currency_code,
    symbol: row.currency_symbol,
    totalAmount: num(row.total_amount),
    giftCount: num(row.gift_count),
    countSharePct: num(row.count_share_pct),
  }));
}

export interface GrowthPoint {
  bucket: string;
  totalContributors: number;
  newContributors: number;
}

export async function getContributorsGrowth(
  supabase: Client,
  filters: DashboardFilters = {},
  months = 24,
): Promise<GrowthPoint[]> {
  if (isLocalDemoMode()) return demoGrowth;

  const { data, error } = await supabase.rpc("contributors_growth", {
    p_months: months,
    p_year: filters.year ?? undefined,
    p_event_id: filters.eventId ?? undefined,
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    bucket: row.bucket,
    totalContributors: num(row.total_contributors),
    newContributors: num(row.new_contributors),
  }));
}

export async function getTopContributors(
  supabase: Client,
  filters: DashboardFilters = {},
  limit = 10,
): Promise<TopContributor[]> {
  if (isLocalDemoMode()) return demoTopContributors.slice(0, limit);

  const { data, error } = await supabase.rpc("top_contributors", {
    p_limit: limit,
    p_year: filters.year ?? undefined,
    p_event_id: filters.eventId ?? undefined,
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    giverName: row.giver_name,
    giftCount: num(row.gift_count),
    cashTotals: parseCashTotals(row.cash_totals),
    lastGiftDate: row.last_gift_date,
    eventCount: num(row.event_count),
  }));
}

export async function getSearchAnalytics(supabase: Client, limit = 10, days = 90): Promise<SearchAnalytics> {
  if (isLocalDemoMode()) {
    return {
      recentSearches: [{ query: "Rustam", created_at: new Date().toISOString() }],
      topSearchTerms: [{ query: "cash", search_count: 9 }],
      mostOpenedEvents: [{ event_id: demoEvents[0]?.id ?? "", title: demoEvents[0]?.title ?? "Demo", view_count: 5 }],
    };
  }

  const { data, error } = await supabase.rpc("search_analytics", { p_limit: limit, p_days: days }).single();
  if (error) throw error;

  const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

  return {
    recentSearches: asArray(data.recent_searches),
    topSearchTerms: asArray(data.top_search_terms),
    mostOpenedEvents: asArray(data.most_opened_events),
  };
}
