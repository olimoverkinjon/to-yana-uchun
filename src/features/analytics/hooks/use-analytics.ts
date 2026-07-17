"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { usePermissions } from "@/features/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  getCashDistribution,
  getContributorsGrowth,
  getDashboardTotals,
  getEventStatistics,
  getEventsByYear,
  getGiftTypeDistribution,
  getGiftsByMonth,
  getGiftsByYear,
  getGlobalAverages,
  getSearchAnalytics,
  getTopContributors,
} from "../api/analytics-repository";
import { analyticsKeys } from "../query-keys";
import type { DashboardFilters } from "../types";

export { analyticsKeys };

/**
 * Every dashboard query is keyed on the filters and uses keepPreviousData, so
 * changing a filter leaves the current numbers and charts on screen while the
 * next set loads. Without it the whole dashboard would blink to skeletons on
 * every filter change, which reads as slower than it is even though the
 * request is the same.
 *
 * All of them live under the `dashboard` key, which the realtime layer already
 * invalidates whenever an event or gift changes — so the dashboard updates
 * itself with no extra wiring.
 */
const dashboardQueryOptions = {
  placeholderData: keepPreviousData,
  staleTime: 30 * 1000,
};

export function useDashboardTotalsQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.totals(filters),
    queryFn: () => getDashboardTotals(createSupabaseBrowserClient(), filters),
    ...dashboardQueryOptions,
  });
}

export function useGlobalAveragesQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.averages(filters),
    queryFn: () => getGlobalAverages(createSupabaseBrowserClient(), filters),
    ...dashboardQueryOptions,
  });
}

export function useGiftsByMonthQuery(filters: DashboardFilters, months = 12) {
  return useQuery({
    queryKey: analyticsKeys.giftsByMonth(filters, months),
    queryFn: () => getGiftsByMonth(createSupabaseBrowserClient(), filters, months),
    ...dashboardQueryOptions,
  });
}

export function useGiftsByYearQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.giftsByYear(filters),
    queryFn: () => getGiftsByYear(createSupabaseBrowserClient(), filters),
    ...dashboardQueryOptions,
  });
}

export function useEventsByYearQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.eventsByYear(filters),
    queryFn: () => getEventsByYear(createSupabaseBrowserClient(), filters),
    ...dashboardQueryOptions,
  });
}

export function useGiftTypeDistributionQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.typeDistribution(filters),
    queryFn: () => getGiftTypeDistribution(createSupabaseBrowserClient(), filters),
    ...dashboardQueryOptions,
  });
}

export function useCashDistributionQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: analyticsKeys.cashDistribution(filters),
    queryFn: () => getCashDistribution(createSupabaseBrowserClient(), filters),
    ...dashboardQueryOptions,
  });
}

export function useContributorsGrowthQuery(filters: DashboardFilters, months = 24) {
  return useQuery({
    queryKey: analyticsKeys.growth(filters, months),
    queryFn: () => getContributorsGrowth(createSupabaseBrowserClient(), filters, months),
    ...dashboardQueryOptions,
  });
}

export function useTopContributorsQuery(filters: DashboardFilters, limit = 10) {
  return useQuery({
    queryKey: analyticsKeys.topContributors(filters, limit),
    queryFn: () => getTopContributors(createSupabaseBrowserClient(), filters, limit),
    ...dashboardQueryOptions,
  });
}

/**
 * Super-admin-only: this is a record of what individuals looked for, not part
 * of the ledger. The RPC returns empty arrays for anyone else, so skipping the
 * request just avoids a round trip whose answer is already known.
 */
export function useSearchAnalyticsQuery() {
  const { isSuperAdmin } = usePermissions();

  return useQuery({
    queryKey: analyticsKeys.searchAnalytics(),
    queryFn: () => getSearchAnalytics(createSupabaseBrowserClient()),
    enabled: isSuperAdmin,
    staleTime: 60 * 1000,
  });
}

export function useEventStatisticsQuery(eventId: string) {
  return useQuery({
    queryKey: analyticsKeys.eventStatistics(eventId),
    queryFn: () => getEventStatistics(createSupabaseBrowserClient(), eventId),
  });
}
