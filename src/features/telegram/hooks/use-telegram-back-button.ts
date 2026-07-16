"use client";

import { useEffect } from "react";

import { hideBackButton, onBackButtonClick, showBackButton } from "@telegram-apps/sdk-react";

/**
 * Shows/hides Telegram's native Back Button for the lifetime of the
 * calling component and wires it to `onClick` (typically `router.back()`).
 * A page that isn't the dashboard root calls this with `visible: true`.
 */
export function useTelegramBackButton(visible: boolean, onClick?: () => void) {
  useEffect(() => {
    if (visible && showBackButton.isAvailable()) {
      showBackButton();
    } else if (!visible && hideBackButton.isAvailable()) {
      hideBackButton();
    }
  }, [visible]);

  useEffect(() => {
    if (!onClick || !onBackButtonClick.isAvailable()) return;
    return onBackButtonClick(onClick);
  }, [onClick]);
}
