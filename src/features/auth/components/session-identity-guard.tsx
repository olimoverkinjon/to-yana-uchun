"use client";

import { retrieveRawInitData } from "@telegram-apps/sdk-react";
import { useEffect, useRef } from "react";

import { useTelegramContext } from "@/features/telegram";

import { useTelegramAuthMutation } from "../hooks/use-telegram-auth";
import { useSessionQuery } from "../hooks/use-session";

/**
 * Telegram desktop/mobile webviews can preserve cookies longer than expected.
 * If a different Telegram account opens the mini app in that same webview,
 * the old cookie must not keep rendering the previous user's name/role.
 */
export function SessionIdentityGuard() {
  const { isReady, isTelegramEnvironment } = useTelegramContext();
  const session = useSessionQuery();
  const authMutation = useTelegramAuthMutation();
  const attemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !isTelegramEnvironment || session.isLoading || !session.data?.user) return;

    let rawInitData: string | undefined;
    try {
      rawInitData = retrieveRawInitData();
    } catch {
      rawInitData = undefined;
    }
    if (!rawInitData || attemptedFor.current === rawInitData) return;

    const telegramUserId = readTelegramUserId(rawInitData);
    if (!telegramUserId || telegramUserId === session.data.user.telegramId) return;

    attemptedFor.current = rawInitData;
    authMutation.mutate(rawInitData);
  }, [authMutation, isReady, isTelegramEnvironment, session.data?.user, session.isLoading]);

  return null;
}

function readTelegramUserId(rawInitData: string): number | null {
  try {
    const user = new URLSearchParams(rawInitData).get("user");
    if (!user) return null;
    const parsed = JSON.parse(user) as { id?: unknown };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}
