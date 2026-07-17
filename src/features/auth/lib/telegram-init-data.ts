"use client";

import { retrieveRawInitData } from "@telegram-apps/sdk-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }
}

export function readTelegramInitData(): string | undefined {
  try {
    const fromSdk = retrieveRawInitData();
    if (fromSdk) return fromSdk;
  } catch {
    // Fall through to Telegram's global object and raw launch params.
  }

  const fromGlobal = window.Telegram?.WebApp?.initData;
  if (fromGlobal) return fromGlobal;

  return readInitDataFromLocation();
}

function readInitDataFromLocation(): string | undefined {
  const sources = [window.location.hash.replace(/^#/, ""), window.location.search.replace(/^\?/, "")];

  for (const source of sources) {
    if (!source) continue;
    const params = new URLSearchParams(source);
    const raw = params.get("tgWebAppData");
    if (raw) return raw;
  }

  return undefined;
}
