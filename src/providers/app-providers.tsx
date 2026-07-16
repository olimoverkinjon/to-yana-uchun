"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TelegramProvider } from "@/features/telegram";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

/**
 * Composition root for every app-wide provider. Order matters: Theme and
 * Query have no dependency on Telegram, but Tooltip/Toaster are rendered
 * innermost so portals they create still sit under the theme class on
 * `<html>` for CSS variables to resolve correctly.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TelegramProvider>
          <TooltipProvider delay={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </TelegramProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
