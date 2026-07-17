"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  /** Percentage change, or null when there is no honest answer. */
  value: number | null;
  className?: string;
}

/**
 * A trend indicator that says what it means.
 *
 * Three deliberate choices:
 *
 * 1. It carries an icon and a label, never colour alone — a red number is
 *    invisible as "bad" to a colourblind reader, and this sits next to figures
 *    people make decisions on.
 * 2. A null value renders as "new", not "0%" or "+100%". Growth from a zero
 *    baseline has no percentage; the database returns null rather than invent
 *    one, and this is where that honesty has to survive into the UI.
 * 3. It always names the comparison window. "+12%" alone is unreadable — 12%
 *    against what?
 */
export function TrendBadge({ value, className }: TrendBadgeProps) {
  const t = useTranslations("dashboard.trend");
  const format = useFormatter();

  if (value === null) {
    return (
      <span className={cn("text-muted-foreground inline-flex items-center gap-1 text-xs", className)}>
        <Minus className="size-3" />
        {t("noComparison")}
      </span>
    );
  }

  const isFlat = value === 0;
  const isUp = value > 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        isFlat ? "text-muted-foreground" : isUp ? "text-success" : "text-muted-foreground",
        className,
      )}
      // Screen readers get the full sentence rather than "up 12 percent" with
      // no referent.
      aria-label={t("label", { value: format.number(Math.abs(value), { maximumFractionDigits: 1 }) })}
    >
      <Icon className="size-3" aria-hidden />
      {isFlat ? t("flat") : `${isUp ? "+" : "−"}${format.number(Math.abs(value), { maximumFractionDigits: 1 })}%`}
    </span>
  );
}
