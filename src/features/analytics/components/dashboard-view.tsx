"use client";

import { Activity } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityList, useRecentActivityQuery } from "@/features/activity";
import { usePermissions } from "@/features/auth";
import { useTelegramUser } from "@/features/telegram";
import { ExportMenu } from "@/features/reports/components/export-menu";

import { useDashboardFilters } from "../hooks/use-dashboard-filters";

import { ChartSkeleton } from "./charts/chart-primitives";
import { DashboardFiltersBar } from "./dashboard-filters-bar";
import { DashboardStatGrid } from "./dashboard-stat-grid";
import { RealtimeIndicator } from "./realtime-indicator";

const GiftsOverTimeChart = dynamic(
  () => import("./charts/gifts-over-time-chart").then((module) => module.GiftsOverTimeChart),
  { loading: ChartPanelSkeleton },
);
const GiftTypeChart = dynamic(() => import("./charts/gift-type-chart").then((module) => module.GiftTypeChart), {
  loading: ChartPanelSkeleton,
});
const CashDistributionChart = dynamic(
  () => import("./charts/cash-distribution-chart").then((module) => module.CashDistributionChart),
  { loading: ChartPanelSkeleton },
);
const ContributorsGrowthChart = dynamic(
  () => import("./charts/contributors-growth-chart").then((module) => module.ContributorsGrowthChart),
  { loading: ChartPanelSkeleton },
);
const EventsByYearChart = dynamic(
  () => import("./charts/events-by-year-chart").then((module) => module.EventsByYearChart),
  {
    loading: ChartPanelSkeleton,
  },
);
const GlobalAveragesPanel = dynamic(
  () => import("./global-averages-panel").then((module) => module.GlobalAveragesPanel),
  {
    loading: PanelSkeleton,
  },
);
const TopContributors = dynamic(() => import("./top-contributors").then((module) => module.TopContributors), {
  loading: PanelSkeleton,
});
const SearchAnalyticsPanel = dynamic(
  () => import("./search-analytics-panel").then((module) => module.SearchAnalyticsPanel),
  {
    loading: PanelSkeleton,
  },
);

/**
 * The dashboard.
 *
 * One filter state, threaded to every panel, so the cards, the charts and the
 * contributor list are always describing the same slice — the whole point of a
 * dashboard is that its parts agree.
 *
 * Everything below reads live data through RLS, so a Viewer and a Super Admin
 * see the same numbers for the rows they can both read, and the Super-Admin-only
 * panels (activity, search analytics, export) simply do not render for a Viewer
 * rather than showing them an empty box.
 */
export function DashboardView() {
  const t = useTranslations("dashboard");
  const user = useTelegramUser();
  const { isSuperAdmin } = usePermissions();
  const filterState = useDashboardFilters();
  const { filters } = filterState;

  const activity = useRecentActivityQuery(8, { enabled: isSuperAdmin });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="space-y-3 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:space-y-0">
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-foreground truncate text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
          {user ? (
            <p className="text-muted-foreground truncate text-xs sm:text-sm">
              {t("greeting", { name: user.first_name })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RealtimeIndicator />
          <ExportMenu filters={filters} />
          <DashboardFiltersBar state={filterState} />
        </div>
      </div>

      <DashboardStatGrid filters={filters} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GiftsOverTimeChart filters={filters} />
        <GiftTypeChart filters={filters} />
        <CashDistributionChart filters={filters} />
        <ContributorsGrowthChart filters={filters} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EventsByYearChart filters={filters} />
        <GlobalAveragesPanel filters={filters} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopContributors filters={filters} />

        {isSuperAdmin ? (
          <div className="space-y-4">
            <Card className="glass-panel gap-0 border-0 py-0 ring-0">
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  <Activity className="size-3.5" />
                  {t("stats.recentActivity")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 sm:p-3 sm:pt-0">
                <ActivityList
                  items={activity.data ?? []}
                  isLoading={activity.isLoading}
                  emptyTitle={t("emptyActivity")}
                />
              </CardContent>
            </Card>

            <SearchAnalyticsPanel />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChartPanelSkeleton() {
  return <ChartSkeleton />;
}

function PanelSkeleton() {
  return <ChartSkeleton height={260} />;
}
