import type { Metadata } from "next";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { DashboardView } from "@/features/analytics";
import {
  getCashDistribution,
  getContributorsGrowth,
  getDashboardTotals,
  getEventsByYear,
  getGiftTypeDistribution,
  getGlobalAverages,
  getGiftsByMonth,
  getSearchAnalytics,
  getTopContributors,
} from "@/features/analytics/api/analytics-repository";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { getPermissions } from "@/features/auth/api/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — Wedding Registry",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const filters = {};
  const supabase = createSupabaseServerClient();
  const permissions = await getPermissions();
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.totals(filters),
      queryFn: () => getDashboardTotals(supabase, filters),
    }),
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.averages(filters),
      queryFn: () => getGlobalAverages(supabase, filters),
    }),
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.giftsByMonth(filters, 12),
      queryFn: () => getGiftsByMonth(supabase, filters, 12),
    }),
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.typeDistribution(filters),
      queryFn: () => getGiftTypeDistribution(supabase, filters),
    }),
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.cashDistribution(filters),
      queryFn: () => getCashDistribution(supabase, filters),
    }),
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.growth(filters, 24),
      queryFn: () => getContributorsGrowth(supabase, filters, 24),
    }),
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.eventsByYear(filters),
      queryFn: () => getEventsByYear(supabase, filters),
    }),
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.topContributors(filters, 10),
      queryFn: () => getTopContributors(supabase, filters, 10),
    }),
    permissions.isSuperAdmin
      ? queryClient.prefetchQuery({
          queryKey: analyticsKeys.searchAnalytics(),
          queryFn: () => getSearchAnalytics(supabase),
        })
      : Promise.resolve(),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView />
    </HydrationBoundary>
  );
}
