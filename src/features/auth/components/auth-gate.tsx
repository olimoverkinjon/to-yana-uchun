"use client";

import { retrieveRawInitData } from "@telegram-apps/sdk-react";
import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useTelegramContext } from "@/features/telegram";
import { SplashScreen } from "@/shared/components/layout/splash-screen";
import { isLocalDemoMode } from "@/shared/lib/local-demo";

import { useTelegramAuthMutation } from "../hooks/use-telegram-auth";
import { useSessionQuery } from "../hooks/use-session";

/**
 * The whole of PRD §9 in one component: detect the Telegram user, verify
 * identity server-side, create a session, redirect to the dashboard.
 * Rendered from the root page so every other route can assume a session
 * already exists by the time it mounts.
 */
export function AuthGate() {
  const router = useRouter();
  const t = useTranslations("auth");
  const { isReady, isTelegramEnvironment } = useTelegramContext();
  const session = useSessionQuery();
  const authMutation = useTelegramAuthMutation();
  const attempted = useRef(false);

  // The query always resolves to an object — `{ user: null }` for a signed-out
  // visitor — so signed-in-ness is the presence of `user`, not of `data`.
  const signedInUser = session.data?.user ?? null;

  useEffect(() => {
    if (isLocalDemoMode()) {
      router.replace("/dashboard");
      return;
    }
    if (!isReady || session.isLoading || signedInUser || attempted.current) return;
    if (!isTelegramEnvironment) return;

    attempted.current = true;
    let rawInitData: string | undefined;
    try {
      rawInitData = retrieveRawInitData();
    } catch {
      rawInitData = undefined;
    }

    if (rawInitData) {
      authMutation.mutate(rawInitData);
    }
  }, [isReady, isTelegramEnvironment, session.isLoading, signedInUser, authMutation, router]);

  useEffect(() => {
    if (signedInUser) {
      router.replace("/dashboard");
    }
  }, [signedInUser, router]);

  const hasFailed = (isReady && !isTelegramEnvironment) || authMutation.isError;

  if (hasFailed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="space-y-1.5">
          <p className="text-foreground text-lg font-semibold">{t("failedTitle")}</p>
          <p className="text-muted-foreground max-w-sm text-sm">{t("failedBody")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            attempted.current = false;
            authMutation.reset();
          }}
        >
          <RotateCw className="mr-2 size-4" />
          {t("retryButton")}
        </Button>
      </div>
    );
  }

  return <SplashScreen />;
}
