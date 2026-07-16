"use client";

import { useEffect, useState } from "react";

/**
 * Delays a rapidly-changing value until it settles.
 *
 * Used for search inputs: the typed value drives the input (so it stays
 * responsive on every keystroke) while the debounced value drives the query,
 * so a five-letter name is one request rather than five. 250ms is short enough
 * to feel immediate and long enough to cover normal typing.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
