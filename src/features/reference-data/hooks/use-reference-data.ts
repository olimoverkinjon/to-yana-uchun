"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { listCurrencies, listGiftTypes, type CurrencyRow, type GiftTypeRow } from "../api/reference-data-repository";

export const referenceDataKeys = {
  giftTypes: ["reference-data", "gift-types"] as const,
  currencies: ["reference-data", "currencies"] as const,
};

/**
 * Gift types and currencies change about once a year, but every gift form
 * needs them. A long staleTime keeps the form instant on repeat opens without
 * pinning the data forever — a Super Admin adding a category still sees it
 * after a refetch, rather than never.
 */
const REFERENCE_STALE_TIME = 30 * 60 * 1000;

export function useGiftTypesQuery() {
  return useQuery({
    queryKey: referenceDataKeys.giftTypes,
    queryFn: () => listGiftTypes(createSupabaseBrowserClient()),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useCurrenciesQuery() {
  return useQuery({
    queryKey: referenceDataKeys.currencies,
    queryFn: () => listCurrencies(createSupabaseBrowserClient()),
    staleTime: REFERENCE_STALE_TIME,
  });
}

/** Both lists plus id→row lookups, for the gift form's dynamic field logic. */
export function useReferenceData() {
  const giftTypes = useGiftTypesQuery();
  const currencies = useCurrenciesQuery();

  const giftTypeById = useMemo(() => new Map((giftTypes.data ?? []).map((type) => [type.id, type])), [giftTypes.data]);
  const currencyById = useMemo(
    () => new Map((currencies.data ?? []).map((currency) => [currency.id, currency])),
    [currencies.data],
  );

  return {
    giftTypes: (giftTypes.data ?? []) as GiftTypeRow[],
    currencies: (currencies.data ?? []) as CurrencyRow[],
    giftTypeById,
    currencyById,
    isLoading: giftTypes.isLoading || currencies.isLoading,
    isError: giftTypes.isError || currencies.isError,
  };
}
