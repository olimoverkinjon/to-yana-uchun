"use client";

import { initDataUser, useSignal } from "@telegram-apps/sdk-react";

/** The Telegram profile of the current viewer, or undefined before init resolves. */
export function useTelegramUser() {
  return useSignal(initDataUser);
}
