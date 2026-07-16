"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { GIFTS_PAGE_SIZE, getGift, getGiftAuditHistory, listGifts, listGiftsByGiver } from "../api/gifts-repository";
import type { GiftFilters } from "../types";

export const giftKeys = {
  all: ["gifts"] as const,
  lists: () => [...giftKeys.all, "list"] as const,
  list: (filters: GiftFilters) => [...giftKeys.lists(), filters] as const,
  detail: (id: string) => [...giftKeys.all, "detail", id] as const,
  byGiver: (name: string) => [...giftKeys.all, "by-giver", name] as const,
  auditHistory: (id: string) => [...giftKeys.all, "detail", id, "audit"] as const,
};

/**
 * Paginated gift list.
 *
 * `placeholderData: keepPreviousData` is what makes search feel instant: as
 * the user types, the previous results stay on screen while the next query
 * runs, instead of the list emptying to a skeleton on every keystroke.
 */
export function useGiftsInfiniteQuery(filters: GiftFilters, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: giftKeys.list(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listGifts(createSupabaseBrowserClient(), filters, { offset: pageParam, limit: GIFTS_PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useGiftQuery(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: giftKeys.detail(id),
    queryFn: () => getGift(createSupabaseBrowserClient(), id),
    enabled: options.enabled ?? true,
  });
}

/** Everything one person gave, across every wedding. */
export function useGiftsByGiverQuery(giverName: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: giftKeys.byGiver(giverName),
    queryFn: () => listGiftsByGiver(createSupabaseBrowserClient(), giverName),
    enabled: (options.enabled ?? true) && giverName.trim().length > 0,
  });
}

export function useGiftAuditHistoryQuery(giftId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: giftKeys.auditHistory(giftId),
    queryFn: () => getGiftAuditHistory(createSupabaseBrowserClient(), giftId),
    enabled: options.enabled ?? true,
  });
}
