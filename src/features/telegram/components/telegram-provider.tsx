"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { initTelegramSdk } from "../lib/init-telegram";

interface TelegramContextValue {
  /** True once the SDK has finished mounting (or failed) — never blocks forever. */
  isReady: boolean;
  /** False when opened outside Telegram, e.g. a plain browser tab in dev. */
  isTelegramEnvironment: boolean;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TelegramContextValue>({
    isReady: false,
    isTelegramEnvironment: false,
  });

  useEffect(() => {
    let cancelled = false;

    withTimeout(initTelegramSdk(), 6000)
      .then(({ isTelegramEnvironment }) => {
        if (!cancelled) setState({ isReady: true, isTelegramEnvironment });
      })
      .catch((error: unknown) => {
        console.error("[telegram] SDK initialization failed", error);
        if (!cancelled) setState({ isReady: true, isTelegramEnvironment: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <TelegramContext.Provider value={state}>{children}</TelegramContext.Provider>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Telegram SDK initialization timed out")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function useTelegramContext(): TelegramContextValue {
  const ctx = useContext(TelegramContext);
  if (!ctx) {
    throw new Error("useTelegramContext must be used within <TelegramProvider>");
  }
  return ctx;
}
