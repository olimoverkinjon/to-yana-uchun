"use client";

import { CalendarHeart, Search as SearchIcon, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogActivity } from "@/features/activity";
import { useEventsInfiniteQuery } from "@/features/events";
import { useGiftsInfiniteQuery } from "@/features/gifts";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { formatAmount, formatDate, formatEventDate, formatWeight } from "@/shared/lib/format";

/**
 * Search across every wedding at once.
 *
 * Two queries rather than one union RPC: events and gifts have genuinely
 * different shapes and the results are shown in separate sections, so merging
 * them in SQL only to split them again in the UI would buy nothing. Running
 * them separately also means each caches on its own, and the gifts section can
 * render the moment it arrives without waiting on the other.
 *
 * A year typed as a query ("2024") matches events by year through the same
 * path, since the events filter accepts one.
 */
export function GlobalSearch() {
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [input, setInput] = useState("");
  const query = useDebouncedValue(input.trim(), 250);
  const hasQuery = query.length > 0;

  // Logged off the debounced value, not the raw input, so one search is one
  // record rather than one per keystroke. The ref stops React's re-renders
  // (and Strict Mode's double-invoke in dev) logging the same term twice.
  const logActivity = useLogActivity();
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (!hasQuery || lastLogged.current === query) return;
    lastLogged.current = query;
    logActivity("search", { query });
  }, [query, hasQuery, logActivity]);

  // A bare 4-digit number is almost certainly a year, not someone's name.
  const asYear = useMemo(() => {
    const parsed = Number(query);
    return /^\d{4}$/.test(query) && parsed >= 1900 && parsed <= 2100 ? parsed : null;
  }, [query]);

  const eventsQuery = useEventsInfiniteQuery(
    asYear ? { year: asYear, sort: "newest" } : { search: query, sort: "newest" },
  );
  const giftsQuery = useGiftsInfiniteQuery({ search: query, sort: "newest" }, { enabled: hasQuery && !asYear });

  const events = useMemo(
    () => (hasQuery ? (eventsQuery.data?.pages.flatMap((page) => page.items) ?? []) : []),
    [eventsQuery.data, hasQuery],
  );
  const gifts = useMemo(
    () => (hasQuery && !asYear ? (giftsQuery.data?.pages.flatMap((page) => page.items) ?? []) : []),
    [giftsQuery.data, hasQuery, asYear],
  );

  const isLoading = hasQuery && (eventsQuery.isLoading || (!asYear && giftsQuery.isLoading));
  const isEmpty = hasQuery && !isLoading && events.length === 0 && gifts.length === 0;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("hint")}</p>
      </div>

      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("placeholder")}
          className="h-11 pr-9 pl-9 text-base"
          type="search"
          autoFocus
          aria-label={tCommon("search")}
        />
        {input ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setInput("")}
            className="absolute top-1/2 right-2 -translate-y-1/2"
            aria-label={tCommon("clear")}
          >
            <X />
          </Button>
        ) : null}
      </div>

      {!hasQuery ? (
        <EmptyState icon={SearchIcon} title={t("hint")} />
      ) : isLoading ? (
        <SearchSkeleton />
      ) : isEmpty ? (
        <EmptyState icon={SearchIcon} title={t("noResults", { query })} body={t("noResultsBody")} />
      ) : (
        <div className="space-y-6">
          {events.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
                {t("eventsSection")} · {t("resultCount", { count: events.length })}
              </h2>
              <ul className="space-y-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.id}`}>
                      <Card className="glass-panel hover:bg-muted/40 gap-0 border-0 py-0 ring-0 transition-colors">
                        <CardContent className="flex items-center gap-3 p-3">
                          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                            <CalendarHeart className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-sm font-medium">{event.title}</p>
                            <p className="text-muted-foreground truncate text-xs tabular-nums">
                              {formatEventDate(event.event_date, event.event_year ?? 0, locale)}
                              {event.location ? ` · ${event.location}` : ""}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {gifts.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
                {t("giftsSection")} · {t("resultCount", { count: gifts.length })}
              </h2>
              <ul className="space-y-2">
                {gifts.map((gift) => {
                  const value =
                    gift.amount !== null && gift.amount !== undefined
                      ? formatAmount(gift.amount, gift.currency, locale)
                      : gift.weight !== null && gift.weight !== undefined
                        ? formatWeight(gift.weight, gift.unit, locale)
                        : (gift.description ?? "—");

                  return (
                    <li key={gift.id}>
                      {/* Links to the wedding the gift belongs to — a gift on
                          its own is not a place you can stand. */}
                      <Link href={`/events/${gift.event_id}`}>
                        <Card className="glass-panel hover:bg-muted/40 gap-0 border-0 py-0 ring-0 transition-colors">
                          <CardContent className="flex items-center gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground truncate text-sm font-medium">{gift.giver_name}</p>
                              <p className="text-muted-foreground truncate text-xs tabular-nums">
                                {gift.gift_type?.name}
                                {" · "}
                                {formatDate(gift.gift_date, locale)}
                              </p>
                            </div>
                            <span className="text-foreground shrink-0 text-sm font-semibold tabular-nums">{value}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}
