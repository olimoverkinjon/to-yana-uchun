"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/shared/lib/format";

import { useCashDistributionQuery } from "../../hooks/use-analytics";
import type { DashboardFilters } from "../../types";

import { ChartCard, ChartEmpty, VIZ_SLOTS } from "./chart-primitives";

/**
 * Colour pinned to the currency itself, not to its position in the results.
 *
 * This is the rule that a filter must not repaint the survivors: if UZS drops
 * out of the current filter, USD must stay the colour it was, or the reader
 * learns that colour means nothing. A stable map does that; ordering by amount
 * and colouring by index would not.
 *
 * Currencies beyond these fall back to the last slot — deliberately shared,
 * because inventing a hue per currency is what the palette rules forbid.
 */
const CURRENCY_SLOT: Record<string, string> = {
  UZS: VIZ_SLOTS[0],
  USD: VIZ_SLOTS[1],
  EUR: VIZ_SLOTS[2],
};

const fallbackSlot = VIZ_SLOTS[3];

interface CashDistributionChartProps {
  filters: DashboardFilters;
}

/**
 * Cash received, per currency.
 *
 * Deliberately not a chart with a shared axis. Every other distribution here
 * compares like with like; these bars cannot be compared to each other at all
 * — 500,000 UZS and 100 USD are different units, and putting them on one scale
 * would draw UZS as five thousand times "bigger", which is meaningless without
 * an exchange rate this app does not have and will not invent.
 *
 * So each currency gets its own meter, scaled within its own ledger: the bar
 * shows this currency's share of *its own* cash records, and the figure beside
 * it is the real total. The comparison the reader can honestly make — how much
 * of each — is the one on offer.
 */
export function CashDistributionChart({ filters }: CashDistributionChartProps) {
  const t = useTranslations("dashboard.charts.cash");
  const tCommon = useTranslations("dashboard.charts");
  const locale = useLocale();
  const query = useCashDistributionQuery(filters);

  const rows = useMemo(() => {
    const data = query.data ?? [];
    const maxCount = Math.max(...data.map((row) => row.giftCount), 1);

    return data.map((row) => ({
      ...row,
      color: CURRENCY_SLOT[row.code] ?? fallbackSlot,
      // Width tracks record count, which IS comparable across currencies —
      // unlike the amounts.
      widthPct: (row.giftCount / maxCount) * 100,
    }));
  }, [query.data]);

  return (
    <ChartCard title={t("title")} description={t("description")}>
      {query.isLoading ? (
        <div className="space-y-3 p-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <ChartEmpty message={tCommon("empty")} height={140} />
      ) : (
        <ul className="space-y-3 p-2">
          {rows.map((row) => (
            <li key={row.currencyId} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: row.color }} />
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{row.code}</span>
                </span>
                <span className="text-foreground text-sm font-semibold tabular-nums">
                  {formatAmount(row.totalAmount, { code: row.code, symbol: row.symbol }, locale)}
                </span>
              </div>

              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${row.widthPct}%`, background: row.color }}
                  role="img"
                  aria-label={t("meterLabel", { code: row.code, count: row.giftCount })}
                />
              </div>

              <p className="text-muted-foreground text-[11px] tabular-nums">
                {t("giftCount", { count: row.giftCount })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
