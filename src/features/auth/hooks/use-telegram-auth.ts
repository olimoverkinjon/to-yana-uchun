"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AuthenticatedUser } from "../types";
import { sessionQueryKey, type SessionState } from "./use-session";

class TelegramAuthError extends Error {}

async function authenticate(initData: string): Promise<AuthenticatedUser> {
  const response = await fetch("/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  if (!response.ok) {
    throw new TelegramAuthError("Telegram initData verification failed");
  }

  const data = (await response.json()) as {
    user: {
      id: number;
      firstName: string;
      lastName?: string;
      username?: string;
      photoUrl?: string;
      languageCode?: string;
      isPremium: boolean;
    };
  };

  return {
    telegramId: data.user.id,
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    username: data.user.username,
    photoUrl: data.user.photoUrl,
    languageCode: data.user.languageCode,
    isPremium: data.user.isPremium,
  };
}

/** Posts verified Telegram initData once and seeds the session query cache on success. */
export function useTelegramAuthMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authenticate,
    onSuccess: (user) => {
      queryClient.setQueryData<SessionState>(sessionQueryKey, {
        user: { ...user, issuedAt: Date.now() },
        permissions: null,
      });
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });
}
