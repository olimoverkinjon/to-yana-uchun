"use client";

import { isViewportExpanded, useSignal, viewportHeight, viewportStableHeight } from "@telegram-apps/sdk-react";

/** Live Telegram viewport metrics, already expanded to full height at init. */
export function useTelegramViewport() {
  const height = useSignal(viewportHeight);
  const stableHeight = useSignal(viewportStableHeight);
  const isExpanded = useSignal(isViewportExpanded);

  return { height, stableHeight, isExpanded };
}
