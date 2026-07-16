import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, localeCookieName, locales } from "@/i18n/config";

/**
 * Resolves the visitor's locale on first contact only. There is no
 * URL-based locale routing (see i18n/request.ts) — this middleware's only
 * job is to seed the NEXT_LOCALE cookie once, from the Accept-Language
 * header, so the very first server render already picks a sensible
 * language before the Telegram SDK has told us the user's language_code.
 */
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(localeCookieName)?.value;
  if (isLocale(existing)) {
    return NextResponse.next();
  }

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const negotiated = locales.find((locale) => acceptLanguage.toLowerCase().includes(locale)) ?? defaultLocale;

  const response = NextResponse.next();
  response.cookies.set(localeCookieName, negotiated, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
