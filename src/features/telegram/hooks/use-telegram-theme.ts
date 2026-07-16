"use client";

import { isThemeParamsDark, useSignal } from "@telegram-apps/sdk-react";

/** Reactively tracks whether Telegram's own client is currently in dark mode. */
export function useTelegramIsDark(): boolean {
  return useSignal(isThemeParamsDark);
}
