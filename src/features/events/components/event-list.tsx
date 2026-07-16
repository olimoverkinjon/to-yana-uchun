"use client";

import { CalendarHeart, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { InfiniteScrollSentinel } from "@/shared/components/ui/infinite-scroll-sentinel";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useEventsInfiniteQuery } from "../hooks/use-events";
import type { EventFilters } from "../types";

import { EventCard } from "./event-card";
import { EventCardSkeleton, EventListSkeleton } from "./event-card-skeleton";
import { EventFiltersBar } from "./event-filters-bar";
import { EventFormSheet } from "./event-form-sheet";

export function EventList() {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const { isSuperAdmin } = usePermissions();

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<EventFilters>({ sort: "newest" });
  const [isCreating, setIsCreating] = useState(false);

  // The input updates on every keystroke; the query waits for a pause. Both
  // values live here so the filter bar stays responsive while the request does
  // not fire five times for a five-letter word.
  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const activeFilters = useMemo<EventFilters>(
    () => ({ ...filters, search: debouncedSearch.trim() || undefined }),
    [filters, debouncedSearch],
  );

  const query = useEventsInfiniteQuery(activeFilters);

  const events = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.totalCount ?? 0;
  const hasFiltersApplied = Boolean(
    activeFilters.search || activeFilters.year || activeFilters.status || activeFilters.includeDeleted,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        {isSuperAdmin ? (
          <Button onClick={() => setIsCreating(true)} className="shrink-0">
            <Plus className="mr-1.5" />
            <span className="hidden sm:inline">{t("create")}</span>
          </Button>
        ) : null}
      </div>

      <EventFiltersBar
        filters={filters}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onChange={setFilters}
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <EventListSkeleton />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title={hasFiltersApplied ? t("emptyFiltered") : t("empty")}
          body={hasFiltersApplied ? t("emptyFilteredBody") : t("emptyBody")}
          action={
            !hasFiltersApplied && isSuperAdmin ? (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-1.5" />
                {t("create")}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}

            {/*
              Placeholders for the page being fetched, so the grid grows to its
              final height as the request lands instead of jumping afterwards.
            */}
            {query.isFetchingNextPage
              ? Array.from({ length: 2 }, (_, index) => <EventCardSkeleton key={`loading-${index}`} />)
              : null}
          </div>

          <InfiniteScrollSentinel
            onIntersect={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
            }}
            disabled={!query.hasNextPage || query.isFetchingNextPage}
          />

          {!query.hasNextPage && events.length > 0 ? (
            <p className="text-muted-foreground pt-1 text-center text-xs tabular-nums">
              {tCommon("showing", { count: events.length, total })}
            </p>
          ) : null}
        </>
      )}

      <EventFormSheet open={isCreating} onOpenChange={setIsCreating} navigateOnCreate />
    </div>
  );
}
