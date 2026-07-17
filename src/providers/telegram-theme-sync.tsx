"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { useTelegramIsDark } from "@/features/telegram";

/**
 * Makes "Follow Telegram" actually follow Telegram's light/dark side.
 *
 * `html.telegram` maps our semantic tokens onto the --tg-theme-* variables the
 * SDK binds at runtime, which covers backgrounds, text and the primary colour.
 * But Telegram does not publish a palette for everything we need — there is no
 * --tg-theme-destructive-color, no chart or data-viz ramp. Those tokens fall
 * through to :root, i.e. their *light* values, which on a dark Telegram client
 * means a red that does not read as red and chart fills that vanish into the
 * card.
 *
 * So when Telegram is dark, we add the `dark` class alongside `telegram`. The
 * cascade then resolves exactly right: `html.telegram` (specificity 0,1,1)
 * still wins for everything Telegram does define, and `.dark` (0,1,0) supplies
 * sensible values for everything it does not.
 *
 * Only touches the class in telegram mode — an explicit Light or Dark choice
 * is the user's, and next-themes owns it.
 */
export function TelegramThemeSync() {
  const { theme } = useTheme();
  const isTelegramDark = useTelegramIsDark();

  useEffect(() => {
    if (theme !== "telegram") return;

    const root = document.documentElement;
    root.classList.toggle("dark", isTelegramDark);

    return () => {
      // Leaving telegram mode must not strand the class we added; next-themes
      // sets its own from here.
      root.classList.remove("dark");
    };
  }, [theme, isTelegramDark]);

  return null;
}
