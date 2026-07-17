"use client";

import { useEffect, useRef } from "react";

import { useTelegramContext } from "@/features/telegram";

import { useTelegramAuthMutation } from "../hooks/use-telegram-auth";
import { useSessionQuery } from "../hooks/use-session";
import { readTelegramInitData } from "../lib/telegram-init-data";

/**
 * Telegram desktop/mobile webviews can preserve cookies longer than expected.
 * If a different Telegram account opens the mini app in that same webview,
 * the old cookie must not keep rendering the previous user's name/role.
 */
export function SessionIdentityGuard() {
  const { isReady } = useTelegramContext();
  const session = useSessionQuery();
  const authMutation = useTelegramAuthMutation();
  const attemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || session.isLoading || !session.data?.user) return;

    const rawInitData = readTelegramInitData();
    if (!rawInitData || attemptedFor.current === rawInitData) return;

    const telegramUserId = readTelegramUserId(rawInitData);
    if (!telegramUserId || telegramUserId === session.data.user.telegramId) return;

    attemptedFor.current = rawInitData;
    authMutation.mutate({ initData: rawInitData });
  }, [authMutation, isReady, session.data?.user, session.isLoading]);

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
