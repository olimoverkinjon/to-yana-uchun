"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useGiftTypeDistributionQuery } from "../../hooks/use-analytics";
import type { DashboardFilters } from "../../types";

import {
  ChartCard,
  ChartEmpty,
  ChartSkeleton,
  ChartTooltipBody,
  VIZ_MUTED,
  VIZ_SLOTS,
  axisTickStyle,
} from "./chart-primitives";

/** Past this, the tail folds into "Other" rather than growing the chart. */
const MAX_ROWS = 6;

interface GiftTypeChartProps {
  filters: DashboardFilters;
}

/**
 * Which kinds of gift come in most.
 *
 * Two decisions worth stating:
 *
 * A horizontal bar chart, not a pie. The reader's job is to compare magnitudes
 * and rank them — something people do accurately with length and badly with
 * angle — and gift type names are long enough that radial labels would collide.
 *
 * One hue, not a categorical palette. The job here is magnitude, and length
 * already encodes it; a colour per bar would be a second encoding of the same
 * fact, and — because the bars are ordered by count — a filter that changed
 * the ranking would repaint every bar, making the colours look meaningful when
 * they carry nothing. The exception is "Other", which is grey because it is a
 * genuinely different kind of thing: an aggregate, not a type.
 */
export function GiftTypeChart({ filters }: GiftTypeChartProps) {
  const t = useTranslations("dashboard.charts.giftTypes");
  const tCommon = useTranslations("dashboard.charts");
  const query = useGiftTypeDistributionQuery(filters);

  const data = useMemo(() => {
    const rows = query.data ?? [];
    if (rows.length === 0) return [];

    // Already ordered by count, descending, from the database.
    const head = rows.slice(0, MAX_ROWS);
    const tail = rows.slice(MAX_ROWS);

    const points = head.map((row) => ({
      name: row.name,
      count: row.giftCount,
      share: row.sharePct,
      isOther: false,
    }));

    if (tail.length > 0) {
      points.push({
        name: t("other", { count: tail.length }),
        count: tail.reduce((sum, row) => sum + row.giftCount, 0),
        share: Math.round(tail.reduce((sum, row) => sum + row.sharePct, 0) * 10) / 10,
        isOther: true,
      });
    }

    return points;
  }, [query.data, t]);

  return (
    <ChartCard title={t("title")} description={t("description")}>
      {query.isLoading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <ChartEmpty message={tCommon("empty")} />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, bottom: 4, left: 4 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={axisTickStyle} tickLine={false} axisLine={false} width={96} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as (typeof data)[number];
                return (
                  <ChartTooltipBody
                    title={point.name}
                    entries={[
                      {
                        label: t("countLabel"),
                        value: String(point.count),
                        color: point.isOther ? VIZ_MUTED : VIZ_SLOTS[0],
                      },
                      { label: t("shareLabel"), value: `${point.share}%` },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((point) => (
                <Cell key={point.name} fill={point.isOther ? VIZ_MUTED : VIZ_SLOTS[0]} />
              ))}
              {/* Direct value labels: with a hidden x-axis the bar length is
                  relative-only, so the actual count has to be readable. */}
              <LabelList
                dataKey="count"
                position="right"
                offset={6}
                style={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
