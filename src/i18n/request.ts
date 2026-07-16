import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale, localeCookieName } from "./config";

/**
 * This app has no localized URLs (a Telegram Mini App has a single deep-link
 * entry point, so /uz/dashboard-style routing doesn't apply). Locale is
 * resolved from a cookie set by middleware.ts on first visit, and updated
 * instantly by the language switcher via a server action + router.refresh().
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
