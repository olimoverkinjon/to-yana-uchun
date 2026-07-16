"use client";

import { Coins, Gift, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatWeight } from "@/shared/lib/format";

import { useEventCashTotalsQuery, useEventGiftTypeTotalsQuery } from "../hooks/use-events";

interface EventStatsProps {
  eventId: string;
  giftCount: number;
}

/**
 * Gift types whose totals are worth a line of their own. Matched on slug —
 * the stable machine key — rather than the display name, which is translatable
 * and editable. A type not listed here still appears under "other gifts"; this
 * only decides what gets a headline.
 */
const LIVESTOCK_SLUGS = new Set(["cow", "sheep", "goat"]);
const PRECIOUS_SLUGS = new Set(["gold", "silver"]);

export function EventStats({ eventId, giftCount }: EventStatsProps) {
  const t = useTranslations("events.details");
  const locale = useLocale();

  const cashQuery = useEventCashTotalsQuery(eventId);
  const typeQuery = useEventGiftTypeTotalsQuery(eventId);

  const { precious, livestock, other, guestCount } = useMemo(() => {
    const rows = typeQuery.data ?? [];
    return {
      precious: rows.filter((row) => row.gift_type_slug && PRECIOUS_SLUGS.has(row.gift_type_slug)),
      livestock: rows.filter((row) => row.gift_type_slug && LIVESTOCK_SLUGS.has(row.gift_type_slug)),
      other: rows.filter(
        (row) =>
          row.gift_type_slug && !PRECIOUS_SLUGS.has(row.gift_type_slug) && !LIVESTOCK_SLUGS.has(row.gift_type_slug),
      ),
      guestCount: rows.reduce((sum, row) => sum + (row.gift_count ?? 0), 0),
    };
  }, [typeQuery.data]);

  const isLoading = cashQuery.isLoading || typeQuery.isLoading;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Gift} label={t("totalGifts")} value={String(giftCount)} />
        <StatTile icon={Users} label={t("totalGuests")} value={String(guestCount)} />
      </div>

      <Card className="glass-panel gap-0 border-0 py-0 ring-0">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Coins className="text-primary size-4" />
            <h3 className="text-foreground text-sm font-medium">{t("cashTotals")}</h3>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : (cashQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noCash")}</p>
          ) : (
            /*
              One row per currency, never a single blended figure. Summing UZS
              and USD into one number would be arithmetic on incomparable
              units — the database's views group by currency for the same
              reason.
            */
            <ul className="divide-border/60 divide-y">
              {(cashQuery.data ?? []).map((row) => (
                <li
                  key={row.currency_id}
                  className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {row.currency_code}
                  </span>
                  <span className="text-foreground text-base font-semibold tabular-nums">
                    {formatAmount(
                      row.total_amount,
                      { code: row.currency_code ?? "", symbol: row.currency_symbol },
                      locale,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : precious.length + livestock.length + other.length === 0 ? null : (
        <Card className="glass-panel gap-0 border-0 py-0 ring-0">
          <CardContent className="space-y-3 p-4">
            <h3 className="text-foreground text-sm font-medium">{t("otherTotals")}</h3>
            <ul className="divide-border/60 divide-y">
              {[...precious, ...livestock, ...other].map((row) => (
                <li
                  key={row.gift_type_id}
                  className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-foreground text-sm">{row.gift_type_name}</span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {/*
                      A weight is only meaningful for types that carry one;
                      for a refrigerator the count is the whole story.
                    */}
                    {row.total_weight !== null && row.total_weight !== undefined
                      ? `${formatWeight(row.total_weight, null, locale)} · ${row.gift_count}`
                      : row.gift_count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Gift; label: string; value: string }) {
  return (
    <Card className="glass-panel gap-0 border-0 py-0 ring-0">
      <CardContent className="flex flex-col gap-1.5 p-4">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="text-foreground text-xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
