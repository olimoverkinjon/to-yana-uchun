"use client";

import { Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { cn } from "@/lib/utils";
import { formatAmount, formatDate, initialsOf } from "@/shared/lib/format";

import { useTopContributorsQuery } from "../hooks/use-analytics";
import type { DashboardFilters } from "../types";

interface TopContributorsProps {
  filters: DashboardFilters;
  limit?: number;
}

/**
 * The people who give most often.
 *
 * Ranked by gift count, not by value — and that is not a shortcut. Ranking by
 * value would require adding UZS to USD to a cow, which needs an exchange rate
 * and a livestock market this app has neither of. Count is a fact; "who gave
 * the most" is not answerable here, and pretending otherwise would put a false
 * league table in front of a family.
 *
 * A table rather than a chart: with ten named rows and several figures each,
 * this is a list of facts to read, not a shape to compare.
 */
export function TopContributors({ filters, limit = 10 }: TopContributorsProps) {
  const t = useTranslations("dashboard.contributors");
  const locale = useLocale();
  const query = useTopContributorsQuery(filters, limit);

  return (
    <Card className="glass-panel gap-0 border-0 py-0 ring-0">
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="text-sm font-semibold">{t("title")}</CardTitle>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
      </CardHeader>

      <CardContent className="p-2 sm:p-3">
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : (query.data ?? []).length === 0 ? (
          <EmptyState icon={Trophy} title={t("empty")} className="py-10" />
        ) : (
          <ol className="space-y-0.5">
            {(query.data ?? []).map((contributor, index) => (
              <li
                key={contributor.giverName}
                className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
              >
                <span
                  className={cn(
                    "w-4 shrink-0 text-center text-xs font-semibold tabular-nums",
                    // Only the top three get emphasis; past that the rank is
                    // information, not an award.
                    index < 3 ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>

                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-[10px] font-medium">
                    {initialsOf(contributor.giverName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-foreground truncate text-sm font-medium">{contributor.giverName}</p>
                  <p className="text-muted-foreground truncate text-xs tabular-nums">
                    {t("giftCount", { count: contributor.giftCount })}
                    {contributor.eventCount > 1 ? ` · ${t("eventCount", { count: contributor.eventCount })}` : ""}
                    {contributor.lastGiftDate ? ` · ${formatDate(contributor.lastGiftDate, locale)}` : ""}
                  </p>
                </div>

                {contributor.cashTotals.length > 0 ? (
                  <div className="shrink-0 space-y-0.5 text-right">
                    {/* One line per currency. Never one blended figure. */}
                    {contributor.cashTotals.map((cash) => (
                      <p key={cash.currency_code} className="text-foreground text-xs font-medium tabular-nums">
                        {formatAmount(
                          cash.total_amount,
                          { code: cash.currency_code, symbol: cash.currency_symbol },
                          locale,
                        )}
                      </p>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
