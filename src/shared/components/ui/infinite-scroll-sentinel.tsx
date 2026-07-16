"use client";

import { useEffect, useRef } from "react";

interface InfiniteScrollSentinelProps {
  onIntersect: () => void;
  disabled?: boolean;
  /** Distance below the viewport at which to start loading. */
  rootMargin?: string;
}

/**
 * Invisible marker that loads the next page as it nears the viewport.
 *
 * An IntersectionObserver rather than a scroll listener: a scroll handler
 * fires on every frame and has to be told what "near the bottom" means in
 * pixels, which breaks the moment the layout changes. The default rootMargin
 * starts the fetch 400px early, so on a normal scroll the next page has
 * usually arrived before the user reaches the end and never sees a spinner.
 */
export function InfiniteScrollSentinel({
  onIntersect,
  disabled = false,
  rootMargin = "400px",
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Kept in a ref so a new inline callback each render does not tear down and
  // rebuild the observer.
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (disabled) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) callbackRef.current();
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled, rootMargin]);

  return <div ref={ref} aria-hidden className="h-px w-full" />;
}
