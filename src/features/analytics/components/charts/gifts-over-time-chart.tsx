"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { useGiftsByMonthQuery, useGiftsByYearQuery } from "../../hooks/use-analytics";
import type { DashboardFilters } from "../../types";

import {
  CHART_GRID,
  ChartCard,
  ChartEmpty,
  ChartSkeleton,
  ChartTooltipBody,
  VIZ_SLOTS,
  axisTickStyle,
} from "./chart-primitives";

type Granularity = "month" | "year";

interface GiftsOverTimeChartProps {
  filters: DashboardFilters;
}

/**
 * Gifts recorded over time.
 *
 * A column chart, not a line: these are counts in discrete buckets, and a line
 * would imply a continuous quantity passing through the space between two
 * months — there is no "half of March".
 *
 * One series, so one hue and no legend — the title names it. Month and year
 * are the same chart with a different bucket, so they share one component
 * rather than being two that could drift apart.
 */
export function GiftsOverTimeChart({ filters }: GiftsOverTimeChartProps) {
  const t = useTranslations("dashboard.charts.giftsOverTime");
  const tCommon = useTranslations("dashboard.charts");
  const locale = useLocale();
  const [granularity, setGranularity] = useState<Granularity>("month");

  const monthQuery = useGiftsByMonthQuery(filters, 12);
  const yearQuery = useGiftsByYearQuery(filters);

  const query = granularity === "month" ? monthQuery : yearQuery;

  const data = useMemo(() => {
    if (granularity === "year") {
      return (yearQuery.data ?? []).map((point) => ({
        key: String(point.bucket),
        label: String(point.bucket),
        gifts: point.giftCount,
      }));
    }

    return (monthQuery.data ?? []).map((point) => ({
      key: point.bucket,
      label: new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(point.bucket)),
      gifts: point.giftCount,
    }));
  }, [granularity, monthQuery.data, yearQuery.data, locale]);

  const hasData = data.some((point) => point.gifts > 0);

  return (
    <ChartCard
      title={t("title")}
      description={granularity === "month" ? t("descriptionMonth") : t("descriptionYear")}
      action={
        <div className="flex gap-1">
          <Button
            size="xs"
            variant={granularity === "month" ? "secondary" : "ghost"}
            onClick={() => setGranularity("month")}
          >
            {t("month")}
          </Button>
          <Button
            size="xs"
            variant={granularity === "year" ? "secondary" : "ghost"}
            onClick={() => setGranularity("year")}
          >
            {t("year")}
          </Button>
        </div>
      }
    >
      {query.isLoading ? (
        <ChartSkeleton />
      ) : !hasData ? (
        <ChartEmpty message={tCommon("empty")} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            {/* Horizontal only: vertical lines add ink without helping compare
                bar heights, which is the one thing this chart is read for. */}
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltipBody
                    title={String(label)}
                    entries={[
                      {
                        label: t("giftsLabel"),
                        value: String(payload[0]?.value ?? 0),
                        color: VIZ_SLOTS[0],
                      },
                    ]}
                  />
                );
              }}
            />
            {/* Rounded top corners only — the baseline end stays square so the
                bar reads as anchored to zero rather than floating. */}
            <Bar dataKey="gifts" fill={VIZ_SLOTS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
