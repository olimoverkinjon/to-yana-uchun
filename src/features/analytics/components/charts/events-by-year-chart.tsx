"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useEventsByYearQuery } from "../../hooks/use-analytics";
import type { DashboardFilters } from "../../types";

import {
  CHART_GRID,
  ChartCard,
  ChartEmpty,
  ChartSkeleton,
  ChartTooltipBody,
  VIZ_MUTED,
  VIZ_SLOTS,
  axisTickStyle,
} from "./chart-primitives";

interface EventsByYearChartProps {
  filters: DashboardFilters;
}

/**
 * Weddings per year, and which years were busiest.
 *
 * Emphasis rather than categorical: the busiest year is the point, and the
 * rest are the context that makes it a point. One accent hue on the peak, the
 * de-emphasis grey everywhere else — which says "this one" far more directly
 * than a rainbow of equal-weight bars, and stays readable under any form of
 * colour-blindness because the peak is also the tallest bar.
 *
 * The colour follows the data, not the rank: the peak is whichever year has
 * the most weddings, and it stays the peak whatever else is filtered out.
 */
export function EventsByYearChart({ filters }: EventsByYearChartProps) {
  const t = useTranslations("dashboard.charts.eventsByYear");
  const tCommon = useTranslations("dashboard.charts");
  const query = useEventsByYearQuery(filters);

  const { data, peak } = useMemo(() => {
    const rows = query.data ?? [];
    const max = Math.max(...rows.map((row) => row.eventCount), 0);
    return {
      data: rows.map((row) => ({
        year: String(row.bucket),
        count: row.eventCount,
        isPeak: row.eventCount === max && max > 0,
      })),
      peak: max,
    };
  }, [query.data]);

  const hasData = peak > 0;

  return (
    <ChartCard title={t("title")} description={t("description")}>
      {query.isLoading ? (
        <ChartSkeleton height={180} />
      ) : !hasData ? (
        <ChartEmpty message={tCommon("empty")} height={180} />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as (typeof data)[number];
                return (
                  <ChartTooltipBody
                    title={String(label)}
                    entries={[
                      {
                        label: t("countLabel"),
                        value: String(point.count),
                        color: point.isPeak ? VIZ_SLOTS[0] : VIZ_MUTED,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((point) => (
                <Cell key={point.year} fill={point.isPeak ? VIZ_SLOTS[0] : VIZ_MUTED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
