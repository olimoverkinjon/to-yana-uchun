"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "framer-motion";

/**
 * Counts from the previous value to the next one.
 *
 * Driven by requestAnimationFrame rather than a CSS transition or a timer:
 * the value is text, not a style, so there is nothing for CSS to interpolate,
 * and a setInterval would tick out of step with the display's refresh and
 * visibly stutter.
 *
 * Respects prefers-reduced-motion by snapping straight to the value — for a
 * viewer who asked for less motion, a number spinning up is exactly the kind
 * of decoration they turned off.
 *
 * Eases out (cubic): fast at the start, settling at the end, so the reader can
 * see the final figure land rather than watching it crawl.
 */
export function useAnimatedNumber(value: number, durationMs = 700): number {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number>(undefined);

  useEffect(() => {
    if (prefersReducedMotion) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;

    if (delta === 0) return;

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      setDisplay(from + delta * eased);

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        // Pinned to the exact target: the eased value would otherwise land a
        // hair short and render, say, 4 999 999 instead of 5 000 000.
        fromRef.current = value;
        setDisplay(value);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      // Where the interrupted animation actually got to, so a value that
      // changes mid-flight continues from there rather than jumping back.
      fromRef.current = display;
    };
    // `display` is deliberately not a dependency — it changes every frame, and
    // depending on it would restart the animation on each one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs, prefersReducedMotion]);

  return display;
}
