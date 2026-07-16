"use client";

import { Coins, Gift, PartyPopper, Users } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/shared/components/ui/error-state";
import { formatAmount } from "@/shared/lib/format";

import { useDashboardStatsQuery } from "../hooks/use-dashboard-stats";

import { StatCard } from "./stat-card";

export function StatGrid() {
  const t = useTranslations("dashboard.stats");
  const format = useFormatter();
  const locale = useLocale();
  const query = useDashboardStatsQuery();

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  if (query.isLoading || !query.data) {
    return <StatGridSkeleton />;
  }

  const stats = query.data;
  // The largest currency leads and the rest sit beneath it. They are never
  // added together: a figure combining UZS and USD is not a number.
  const [primaryCash, ...restCash] = [...stats.totalCashByCurrency].sort((a, b) => b.amount - a.amount);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard index={0} icon={PartyPopper} label={t("totalEvents")} value={format.number(stats.totalEvents)} />
      <StatCard index={1} icon={Gift} label={t("totalGifts")} value={format.number(stats.totalGifts)} />
      <StatCard index={2} icon={Users} label={t("totalGuests")} value={format.number(stats.totalGuests)} />
      <StatCard
        index={3}
        icon={Coins}
        label={t("totalMoney")}
        value={
          primaryCash
            ? formatAmount(primaryCash.amount, { code: primaryCash.currency, symbol: primaryCash.symbol }, locale)
            : "—"
        }
        secondaryLines={restCash.map((entry) =>
          formatAmount(entry.amount, { code: entry.currency, symbol: entry.symbol }, locale),
        )}
      />
    </div>
  );
}

function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="glass-panel gap-0 border-0 py-0 ring-0">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
