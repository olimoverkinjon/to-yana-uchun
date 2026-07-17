import type { DashboardFilters } from "./types";

export const analyticsKeys = {
  all: ["dashboard"] as const,
  totals: (filters: DashboardFilters) => [...analyticsKeys.all, "totals", filters] as const,
  averages: (filters: DashboardFilters) => [...analyticsKeys.all, "averages", filters] as const,
  giftsByMonth: (filters: DashboardFilters, months: number) =>
    [...analyticsKeys.all, "gifts-by-month", months, filters] as const,
  giftsByYear: (filters: DashboardFilters) => [...analyticsKeys.all, "gifts-by-year", filters] as const,
  eventsByYear: (filters: DashboardFilters) => [...analyticsKeys.all, "events-by-year", filters] as const,
  typeDistribution: (filters: DashboardFilters) => [...analyticsKeys.all, "type-distribution", filters] as const,
  cashDistribution: (filters: DashboardFilters) => [...analyticsKeys.all, "cash-distribution", filters] as const,
  growth: (filters: DashboardFilters, months: number) => [...analyticsKeys.all, "growth", months, filters] as const,
  topContributors: (filters: DashboardFilters, limit: number) =>
    [...analyticsKeys.all, "top-contributors", limit, filters] as const,
  searchAnalytics: () => [...analyticsKeys.all, "search-analytics"] as const,
  eventStatistics: (eventId: string) => [...analyticsKeys.all, "event-statistics", eventId] as const,
};
