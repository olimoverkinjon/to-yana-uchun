"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query.
 *
 * Starts false and corrects after mount rather than reading matchMedia during
 * render: the server has no viewport, so any initial guess would differ from
 * the client's first paint and trip a hydration mismatch. Consumers should
 * pick the mobile branch as their default — this app is mobile-first, and
 * Telegram's own clients are overwhelmingly phones.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Matches Tailwind's `sm` breakpoint. */
export const useIsDesktop = () => useMediaQuery("(min-width: 640px)");
