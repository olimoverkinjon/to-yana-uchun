"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeProvider } from "@/features/realtime";
import { TelegramProvider } from "@/features/telegram";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

/**
 * Composition root for every app-wide provider. Order matters: Theme and
 * Query have no dependency on Telegram, but Tooltip/Toaster are rendered
 * innermost so portals they create still sit under the theme class on
 * `<html>` for CSS variables to resolve correctly.
 *
 * Realtime sits inside Query — it works by invalidating that cache — and owns
 * the app's single subscription, so a live gift list does not mean one
 * WebSocket per component that wants one.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TelegramProvider>
          <RealtimeProvider>
            <TooltipProvider delay={200}>
              {children}
              <Toaster />
            </TooltipProvider>
          </RealtimeProvider>
        </TelegramProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
