"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  EVENTS_PAGE_SIZE,
  getEvent,
  getEventAuditHistory,
  getEventCashTotals,
  getEventGiftTypeTotals,
  listEventYears,
  listEvents,
} from "../api/events-repository";
import type { EventFilters } from "../types";

export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  cashTotals: (id: string) => [...eventKeys.detail(id), "cash-totals"] as const,
  giftTypeTotals: (id: string) => [...eventKeys.detail(id), "gift-type-totals"] as const,
  auditHistory: (id: string) => [...eventKeys.detail(id), "audit"] as const,
  years: () => [...eventKeys.all, "years"] as const,
};

/**
 * Paginated event list. Infinite rather than page-numbered because the list is
 * a scrolling feed on a phone, where "load more as you reach the bottom" is
 * the only interaction that makes sense.
 *
 * `filters` is part of the key, so changing a filter reads from cache
 * instantly if that combination was seen before — which is what makes the
 * filter chips feel immediate rather than like a new request each time.
 */
export function useEventsInfiniteQuery(filters: EventFilters) {
  return useInfiniteQuery({
    queryKey: eventKeys.list(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listEvents(createSupabaseBrowserClient(), filters, { offset: pageParam, limit: EVENTS_PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}

export function useEventQuery(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(createSupabaseBrowserClient(), id),
    enabled: options.enabled ?? true,
  });
}

export function useEventCashTotalsQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.cashTotals(eventId),
    queryFn: () => getEventCashTotals(createSupabaseBrowserClient(), eventId),
  });
}

export function useEventGiftTypeTotalsQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.giftTypeTotals(eventId),
    queryFn: () => getEventGiftTypeTotals(createSupabaseBrowserClient(), eventId),
  });
}

/**
 * Audit history. Enabled only for Super Admins — a Viewer's RLS policy would
 * return an empty list anyway, so skipping the request avoids a round trip
 * whose answer is already known.
 */
export function useEventAuditHistoryQuery(eventId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: eventKeys.auditHistory(eventId),
    queryFn: () => getEventAuditHistory(createSupabaseBrowserClient(), eventId),
    enabled: options.enabled ?? true,
  });
}

export function useEventYearsQuery() {
  return useQuery({
    queryKey: eventKeys.years(),
    queryFn: () => listEventYears(createSupabaseBrowserClient()),
    staleTime: 5 * 60 * 1000,
  });
}
