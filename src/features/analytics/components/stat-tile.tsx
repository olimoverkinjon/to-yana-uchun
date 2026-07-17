"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useFormatter } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/shared/hooks/use-animated-number";

import { TrendBadge } from "./trend-badge";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  /** The figure to count up to. */
  value: number;
  /** Renders instead of the formatted number — for money, which carries a symbol. */
  formattedValue?: string;
  description?: string;
  /** Percentage change vs the previous window, or null for "no comparison". */
  trend?: number | null;
  /** Extra lines under the figure — e.g. the other currencies. */
  secondary?: string[];
  index?: number;
  fractionDigits?: number;
}

/**
 * One headline figure.
 *
 * A stat tile rather than a one-bar chart, per the rule that a single current
 * value with a delta is not a chart — a bar of length 1 encodes nothing the
 * number does not already say.
 *
 * The value animates from its previous figure, which is not decoration here:
 * this dashboard updates live over realtime, so a number that changes needs to
 * be *seen* changing or the reader will not notice it did.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  formattedValue,
  description,
  trend,
  secondary,
  index = 0,
  fractionDigits = 0,
}: StatTileProps) {
  const format = useFormatter();
  const animated = useAnimatedNumber(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="glass-panel h-full gap-0 border-0 py-0 ring-0 transition-shadow duration-300 hover:shadow-lg">
        <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium sm:text-sm">{label}</span>
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-4" />
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-foreground text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
              {formattedValue ?? format.number(animated, { maximumFractionDigits: fractionDigits })}
            </p>

            {secondary?.length ? (
              <div className="space-y-0.5">
                {secondary.map((line) => (
                  <p key={line} className="text-muted-foreground text-xs tabular-nums">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className={cn("mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1")}>
            {description ? <span className="text-muted-foreground text-[11px]">{description}</span> : <span />}
            {trend !== undefined ? <TrendBadge value={trend} /> : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StatTileSkeleton() {
  return (
    <Card className="glass-panel h-full gap-0 border-0 py-0 ring-0">
      <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="size-8 rounded-xl" />
        </div>
        <Skeleton className="h-7 w-24" />
        <div className="mt-auto flex justify-between pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </CardContent>
    </Card>
  );
}
