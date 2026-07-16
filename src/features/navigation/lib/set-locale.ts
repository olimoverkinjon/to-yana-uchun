"use server";

import { cookies } from "next/headers";

import { isLocale, localeCookieName, type Locale } from "@/i18n/config";

/**
 * Called from the client language switcher; the caller follows up with
 * `router.refresh()` so the server re-renders with the new locale without
 * a full browser navigation (no localized URLs to redirect to — see
 * i18n/request.ts).
 */
export async function setLocaleAction(locale: Locale) {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
