"use client";

import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/shared/lib/format";

import { useGlobalAveragesQuery } from "../hooks/use-analytics";
import type { DashboardFilters } from "../types";

/**
 * Averages across every wedding in scope.
 *
 * A definition list, not a chart: these are unrelated figures in different
 * units, and there is no shape to compare — putting them on one axis would be
 * the dual-axis mistake wearing a different hat.
 *
 * A null average means there were no events to divide by. Rendered as an
 * em dash rather than 0, because "no answer" and "zero" are different facts.
 */
export function GlobalAveragesPanel({ filters }: { filters: DashboardFilters }) {
  const t = useTranslations("dashboard.averages");
  const locale = useLocale();
  const query = useGlobalAveragesQuery(filters);

  const rows = query.data
    ? [
        { label: t("giftsPerEvent"), value: query.data.avgGiftsPerEvent },
        { label: t("contributorsPerEvent"), value: query.data.avgContributorsPerEvent },
        { label: t("livestockPerEvent"), value: query.data.avgLivestockPerEvent },
        { label: t("goldPerEvent"), value: query.data.avgGoldPerEvent, suffix: "g" },
      ]
    : [];

  return (
    <Card className="glass-panel gap-0 border-0 py-0 ring-0">
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="text-sm font-semibold">{t("title")}</CardTitle>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
      </CardHeader>

      <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">
        {query.isLoading || !query.data ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <dl className="divide-border/60 divide-y">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
                <dt className="text-muted-foreground text-sm">{row.label}</dt>
                <dd className="text-foreground text-sm font-semibold tabular-nums">
                  {row.value === null ? "—" : `${row.value}${row.suffix ?? ""}`}
                </dd>
              </div>
            ))}

            {/* Cash averaged per currency — a mean across UZS and USD would be
                a number with no unit. */}
            {query.data.avgCashPerEvent.map((cash) => (
              <div key={cash.currency_code} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-muted-foreground text-sm">{t("cashPerEvent", { code: cash.currency_code })}</dt>
                <dd className="text-foreground text-sm font-semibold tabular-nums">
                  {formatAmount(cash.total_amount, { code: cash.currency_code, symbol: cash.currency_symbol }, locale)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
