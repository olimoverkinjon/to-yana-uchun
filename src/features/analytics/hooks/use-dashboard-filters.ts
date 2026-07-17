"use client";

import { useCallback, useMemo, useState } from "react";

import { EMPTY_FILTERS, type DashboardFilters } from "../types";

export interface DashboardFilterState {
  filters: DashboardFilters;
  /** True when anything is narrowing the view — drives the Reset button. */
  isFiltered: boolean;
  activeCount: number;
  set: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  setRange: (from: string | null, to: string | null) => void;
  reset: () => void;
}

/**
 * The dashboard's filter state, owned in one place and passed to every card
 * and chart.
 *
 * A single object rather than a filter per component: the whole point is that
 * the cards, the charts and the contributor list are all describing the *same*
 * slice. If each held its own state they could drift, and a dashboard whose
 * panels answer different questions is worse than one with no filters at all.
 *
 * Null clears a filter; the empty object is the unfiltered view.
 */
export function useDashboardFilters(initial: DashboardFilters = EMPTY_FILTERS): DashboardFilterState {
  const [filters, setFilters] = useState<DashboardFilters>(initial);

  const set = useCallback<DashboardFilterState["set"]>((key, value) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      // Dropped rather than kept as null, so the object is also the query key:
      // { year: null } and {} describe the same slice and must not cache twice.
      if (value === null || value === undefined || value === "") delete next[key];
      return next;
    });
  }, []);

  const setRange = useCallback((from: string | null, to: string | null) => {
    setFilters((current) => {
      const next = { ...current };
      if (from) next.from = from;
      else delete next.from;
      if (to) next.to = to;
      else delete next.to;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFilters((current) => (current.eventId ? { eventId: current.eventId } : {}));
  }, []);

  const activeCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => key !== "eventId" && value !== null && value !== undefined && value !== "",
      ).length,
    [filters],
  );

  return { filters, isFiltered: activeCount > 0, activeCount, set, setRange, reset };
}
