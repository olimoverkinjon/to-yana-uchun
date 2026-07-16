"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Three real appearance modes plus "system": "light" and "dark" are
 * explicit user choices; "telegram" (the default) mirrors whatever the
 * host Telegram client's palette is, live, via the CSS variables the
 * Telegram SDK binds to :root (see globals.css `html.telegram`).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="telegram"
      themes={["light", "dark", "telegram", "system"]}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
