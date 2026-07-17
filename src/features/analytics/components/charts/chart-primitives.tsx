"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The pieces every chart on this dashboard is built from — so they share one
 * frame, one empty state, one tooltip, and one idea of what a legend looks
 * like, rather than five near-identical variants.
 */

/**
 * The categorical slots, in fixed order.
 *
 * Assigned by position and never cycled: a sixth series does not wrap back to
 * slot 1, it folds into "Other". These are the validated --viz-* tokens (band,
 * chroma, colour-blind separation and contrast all checked against both
 * surfaces) — not the --chart-* accent colours, which fail the chart-fill band
 * outright in dark mode.
 *
 * Read through CSS variables rather than hex so light/dark swap in one place,
 * with the theme, instead of being re-derived here.
 */
export const VIZ_SLOTS = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)", "var(--viz-5)"] as const;

/** For the "one series is the point, the rest are context" case. */
export const VIZ_MUTED = "var(--viz-muted)";

export const CHART_GRID = "var(--viz-grid)";
export const CHART_AXIS = "var(--viz-axis)";

/** Axis/tick text wears text tokens, never a series colour. */
export const axisTickStyle = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
} as const;

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, action, children, className }: ChartCardProps) {
  return (
    <Card className={cn("glass-panel gap-0 border-0 py-0 ring-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-2 sm:p-3">{children}</CardContent>
    </Card>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} />;
}

/**
 * An empty chart is a blank rectangle that reads as broken. This says which it
 * is — no data yet, versus no data matching the current filters — because the
 * user's next action is different in each case.
 */
export function ChartEmpty({ message, height = 220 }: { message: string; height?: number }) {
  return (
    <div className="flex w-full items-center justify-center px-4 text-center" style={{ height }}>
      <p className="text-muted-foreground max-w-[24ch] text-xs">{message}</p>
    </div>
  );
}

export interface TooltipEntry {
  label: string;
  value: string;
  color?: string;
}

/**
 * Shared tooltip body. A swatch carries the series identity beside the label,
 * so the text itself stays in text tokens — a coloured number is harder to
 * read and encodes nothing the swatch does not.
 */
export function ChartTooltipBody({ title, entries }: { title: string; entries: TooltipEntry[] }) {
  return (
    <div className="bg-popover text-popover-foreground ring-border/60 min-w-32 rounded-lg px-2.5 py-2 text-xs shadow-lg ring-1">
      <p className="text-muted-foreground mb-1.5 font-medium">{title}</p>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              {entry.color ? (
                <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: entry.color }} />
              ) : null}
              <span className="text-muted-foreground">{entry.label}</span>
            </span>
            <span className="text-foreground font-medium tabular-nums">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface LegendItem {
  label: string;
  color: string;
  value?: string;
}

/**
 * Always rendered for two or more series: identity must never be colour alone,
 * and the validated palette's colour-blind separation sits in the floor band
 * for tritanopia, where a legend is what makes the chart readable at all.
 * A single-series chart needs none — its title already names it.
 */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  if (items.length < 2) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 pt-1", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: item.color }} />
          <span className="text-muted-foreground text-[11px]">{item.label}</span>
          {item.value ? (
            <span className="text-foreground text-[11px] font-medium tabular-nums">{item.value}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
