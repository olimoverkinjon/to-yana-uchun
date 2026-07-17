"use client";

import { Banknote, CalendarHeart, Coins, Gem, Gift, Package, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { ErrorState } from "@/shared/components/ui/error-state";
import { formatAmount, formatRelativeTime, formatWeight } from "@/shared/lib/format";

import { useDashboardTotalsQuery } from "../hooks/use-analytics";
import type { DashboardFilters } from "../types";

import { StatTile, StatTileSkeleton } from "./stat-tile";

/**
 * The currencies that get a card of their own, in this order.
 *
 * A card per currency rather than one "total cash" figure, because there is no
 * such number: adding UZS to USD produces a quantity with no unit. Currencies
 * outside this list still exist in the data and appear on the Cash Distribution
 * chart; these three are simply the ones the product ships with and the ones
 * this layout has room to lead with.
 */
const HEADLINE_CURRENCIES = ["UZS", "USD", "EUR"] as const;

interface DashboardStatGridProps {
  filters: DashboardFilters;
}

export function DashboardStatGrid({ filters }: DashboardStatGridProps) {
  const t = useTranslations("dashboard.cards");
  const locale = useLocale();
  const query = useDashboardTotalsQuery(filters);

  const cashByCode = useMemo(
    () => new Map((query.data?.cashTotals ?? []).map((entry) => [entry.currency_code, entry])),
    [query.data],
  );

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </div>
    );
  }

  const stats = query.data;
  const lastUpdated = stats.lastUpdated ? formatRelativeTime(stats.lastUpdated, locale) : null;
  const updatedLine = lastUpdated ? t("lastUpdated", { time: lastUpdated }) : t("neverUpdated");

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <StatTile
        index={0}
        icon={CalendarHeart}
        label={t("totalEvents.label")}
        value={stats.totalEvents}
        description={updatedLine}
        trend={stats.trends.events}
      />
      <StatTile
        index={1}
        icon={Gift}
        label={t("totalGifts.label")}
        value={stats.totalGifts}
        description={t("totalGifts.description")}
        trend={stats.trends.gifts}
      />
      <StatTile
        index={2}
        icon={Users}
        label={t("totalContributors.label")}
        value={stats.totalContributors}
        // Says out loud that this counts distinct names, not verified people —
        // the number is honest about what it can know.
        description={t("totalContributors.description")}
        trend={stats.trends.contributors}
      />

      {HEADLINE_CURRENCIES.map((code, index) => {
        const entry = cashByCode.get(code);
        return (
          <StatTile
            key={code}
            index={3 + index}
            icon={code === "UZS" ? Banknote : Coins}
            label={t("cash.label", { code })}
            value={entry?.total_amount ?? 0}
            formattedValue={formatAmount(
              entry?.total_amount ?? 0,
              { code, symbol: entry?.currency_symbol ?? null },
              locale,
            )}
            description={t("cash.description")}
            trend={entry ? stats.trends.cash : null}
          />
        );
      })}

      <StatTile
        index={6}
        icon={Gem}
        label={t("gold.label")}
        value={stats.goldWeight}
        formattedValue={formatWeight(stats.goldWeight, "g", locale)}
        description={t("gold.description")}
        trend={stats.trends.gold}
      />
      <StatTile
        index={7}
        icon={Package}
        label={t("livestock.label")}
        value={stats.livestockCount}
        description={t("livestock.description")}
        trend={stats.trends.livestock}
      />
      <StatTile
        index={8}
        icon={Package}
        label={t("other.label")}
        value={stats.otherCount}
        description={t("other.description")}
        trend={stats.trends.other}
      />
    </div>
  );
}
