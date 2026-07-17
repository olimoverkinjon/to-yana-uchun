"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useContributorsGrowthQuery } from "../../hooks/use-analytics";
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

interface ContributorsGrowthChartProps {
  filters: DashboardFilters;
}

/**
 * How the circle of contributors has grown.
 *
 * An area chart for a single series over time — the fill reads as accumulation,
 * which is exactly what a cumulative count is. The line is 2px and the fill is
 * a soft gradient of the same hue, so the shape carries the meaning and the
 * fill stays recessive.
 *
 * The series is cumulative by construction in SQL, so it only ever rises. A
 * per-month count of distinct givers would dip to zero in any month without a
 * wedding and read as "we lost contributors", which would be false.
 */
export function ContributorsGrowthChart({ filters }: ContributorsGrowthChartProps) {
  const t = useTranslations("dashboard.charts.growth");
  const tCommon = useTranslations("dashboard.charts");
  const locale = useLocale();
  const query = useContributorsGrowthQuery(filters, 24);

  const data = useMemo(
    () =>
      (query.data ?? []).map((point) => ({
        key: point.bucket,
        label: new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(new Date(point.bucket)),
        total: point.totalContributors,
        added: point.newContributors,
      })),
    [query.data, locale],
  );

  const hasData = data.some((point) => point.total > 0);

  return (
    <ChartCard title={t("title")} description={t("description")}>
      {query.isLoading ? (
        <ChartSkeleton />
      ) : !hasData ? (
        <ChartEmpty message={tCommon("empty")} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VIZ_SLOTS[0]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={VIZ_SLOTS[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={false}
              // 24 monthly labels will not fit on a phone; showing every third
              // keeps the axis readable rather than a grey smear.
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip
              cursor={{ stroke: CHART_GRID, strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as (typeof data)[number];
                return (
                  <ChartTooltipBody
                    title={String(label)}
                    entries={[
                      { label: t("totalLabel"), value: String(point.total), color: VIZ_SLOTS[0] },
                      { label: t("newLabel"), value: `+${point.added}` },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={VIZ_SLOTS[0]}
              strokeWidth={2}
              fill="url(#growth-fill)"
              // Points appear on hover only: a dot on all 24 months is noise,
              // but the hovered value needs a visible anchor.
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
