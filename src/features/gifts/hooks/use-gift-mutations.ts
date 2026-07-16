"use client";

import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import type { CurrencyRow, GiftTypeRow } from "@/features/reference-data";
import type { ActionResult } from "@/shared/lib/errors";

import { createGiftAction, deleteGiftAction, restoreGiftAction, updateGiftAction } from "../api/gift-actions";
import type { GiftFormOutput } from "../schemas/gift-schema";
import type { GiftFilters, GiftListPage, GiftRow, GiftWithRelations } from "../types";

import { giftKeys } from "./use-gifts";

async function unwrap<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw result.error;
  return result.data;
}

type GiftListData = InfiniteData<GiftListPage, number>;

function useInvalidateGifts() {
  const queryClient = useQueryClient();

  return (eventId?: string) => {
    void queryClient.invalidateQueries({ queryKey: giftKeys.all });
    // A gift changes its event's gift_count and cash totals.
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (eventId) void queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] });
  };
}

/**
 * Whether a newly created gift can be safely shown at the top of a given
 * cached list before the server confirms it.
 *
 * Only when the list is this event's default view: unfiltered and sorted
 * newest-first. Under any other filter or sort the correct position — or
 * whether the gift belongs in that list at all — depends on data the client
 * does not have, and guessing would flash a row into a list it should never
 * appear in. Those lists just refetch instead.
 */
function acceptsOptimisticInsert(filters: GiftFilters, eventId: string): boolean {
  return (
    filters.eventId === eventId &&
    !filters.search &&
    !filters.giftTypeId &&
    !filters.currencyId &&
    !filters.year &&
    !filters.includeDeleted &&
    (filters.sort === undefined || filters.sort === "newest")
  );
}

/**
 * A stand-in row rendered while the insert is in flight. `id` is a temporary
 * client-side value; the real row replaces it on invalidation.
 */
function buildOptimisticGift(
  eventId: string,
  values: GiftFormOutput,
  giftType: GiftTypeRow | undefined,
  currency: CurrencyRow | undefined,
): GiftWithRelations {
  const now = new Date().toISOString();

  return {
    id: `optimistic-${crypto.randomUUID()}`,
    event_id: eventId,
    giver_name: values.giverName,
    gift_type_id: values.giftTypeId,
    amount: values.amount,
    currency_id: values.currencyId,
    weight: values.weight,
    unit: values.unit,
    description: values.description,
    gift_date: values.giftDate,
    notes: values.notes,
    created_by: "",
    updated_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    search_vector: null,
    gift_type: giftType ? { id: giftType.id, name: giftType.name, slug: giftType.slug, icon: giftType.icon } : null,
    currency: currency ? { id: currency.id, code: currency.code, symbol: currency.symbol } : null,
    created_by_profile: null,
  };
}

export function useCreateGiftMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateGifts();

  return useMutation({
    mutationFn: (input: {
      eventId: string;
      values: GiftFormOutput;
      reason?: string;
      /** Reference rows for the optimistic row's labels — not sent to the server. */
      giftType?: GiftTypeRow;
      currency?: CurrencyRow;
    }) => unwrap(createGiftAction({ eventId: input.eventId, values: input.values, reason: input.reason })),

    onMutate: async ({ eventId, values, giftType, currency }) => {
      await queryClient.cancelQueries({ queryKey: giftKeys.lists() });
      const snapshot = queryClient.getQueriesData<GiftListData>({ queryKey: giftKeys.lists() });

      const optimistic = buildOptimisticGift(eventId, values, giftType, currency);

      // Walked explicitly rather than via setQueriesData, whose updater only
      // receives the data — and the decision below needs the query key, since
      // that is where the filters live.
      for (const [key, data] of snapshot) {
        if (!data?.pages.length) continue;

        const filters = (key[2] ?? {}) as GiftFilters;
        if (!acceptsOptimisticInsert(filters, eventId)) continue;

        const [firstPage, ...rest] = data.pages;
        queryClient.setQueryData<GiftListData>(key, {
          ...data,
          pages: [
            { ...firstPage, items: [optimistic, ...firstPage.items], totalCount: firstPage.totalCount + 1 },
            ...rest,
          ],
        });
      }

      return { snapshot };
    },

    onError: (_error, _input, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },

    onSettled: (_data, _error, { eventId }) => invalidate(eventId),
  });
}

export function useUpdateGiftMutation() {
  const invalidate = useInvalidateGifts();

  return useMutation({
    mutationFn: (input: { id: string; values: GiftFormOutput; reason?: string }) => unwrap(updateGiftAction(input)),
    onSuccess: (gift) => invalidate(gift.event_id),
  });
}

/**
 * Removing a row is the one optimistic case that is always safe: a gift that
 * no longer qualifies for a list cannot be in the wrong position in it.
 */
export function useDeleteGiftMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateGifts();

  return useMutation({
    mutationFn: (input: { id: string; eventId: string; reason?: string }) =>
      unwrap(deleteGiftAction({ id: input.id, reason: input.reason })),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: giftKeys.lists() });
      const snapshot = queryClient.getQueriesData<GiftListData>({ queryKey: giftKeys.lists() });

      queryClient.setQueriesData<GiftListData>({ queryKey: giftKeys.lists() }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => {
            const items = page.items.filter((gift) => gift.id !== id);
            const removed = page.items.length - items.length;
            return { ...page, items, totalCount: page.totalCount - removed };
          }),
        };
      });

      return { snapshot };
    },

    onError: (_error, _input, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },

    onSettled: (_data, _error, { eventId }) => invalidate(eventId),
  });
}

export function useRestoreGiftMutation() {
  const invalidate = useInvalidateGifts();

  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) => unwrap(restoreGiftAction(input)),
    onSuccess: (gift) => invalidate(gift.event_id),
  });
}

export type { GiftRow };
