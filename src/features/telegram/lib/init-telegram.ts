import "client-only";

import {
  bindThemeParamsCssVars,
  bindViewportCssVars,
  expandViewport,
  init,
  isTMA,
  mockTelegramEnv,
  mountBackButton,
  mountMainButton,
  mountThemeParamsSync,
  mountViewport,
  restoreInitData,
} from "@telegram-apps/sdk-react";

export interface TelegramInitResult {
  /** False when running outside Telegram (e.g. a plain browser tab). */
  isTelegramEnvironment: boolean;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
    TelegramWebviewProxy?: unknown;
  }

  interface External {
    notify?: (message: string) => void;
  }
}

let initPromise: Promise<TelegramInitResult> | null = null;

/**
 * Boots the Telegram Mini Apps SDK exactly once per page load: mounts the
 * back button, main button, viewport, and theme params components, and
 * binds Telegram's CSS variables so `--tg-theme-*` custom properties are
 * available for the theme layer. Outside Telegram in local development, it
 * mocks a launch environment instead of failing, so the app stays usable
 * from a regular browser tab while building UI.
 */
export function initTelegramSdk(): Promise<TelegramInitResult> {
  if (!initPromise) {
    initPromise = boot();
  }
  return initPromise;
}

async function boot(): Promise<TelegramInitResult> {
  const hasHostProvidedLaunchParams = hasTelegramHost() || hasTelegramLaunchParams();
  const isRealTelegramEnvironment = hasHostProvidedLaunchParams || (await isTMA("complete"));
  let usable = isRealTelegramEnvironment;

  if (!isRealTelegramEnvironment) {
    if (process.env.NODE_ENV !== "development") {
      return { isTelegramEnvironment: false };
    }
    // Local dev outside Telegram: mock a launch environment so the rest of
    // the SDK (and this function's mount calls below) work exactly as they
    // would inside a real client.
    mockDevelopmentEnvironment();
    usable = true;
  }

  init();
  restoreInitData();

  if (mountBackButton.isAvailable()) mountBackButton();
  if (mountMainButton.isAvailable()) mountMainButton();

  if (mountThemeParamsSync.isAvailable()) {
    mountThemeParamsSync();
    if (bindThemeParamsCssVars.isAvailable()) bindThemeParamsCssVars();
  }

  // Unlike theme params, viewport dimensions genuinely require a
  // request/response round trip with the native host — there is nothing to
  // mount locally. A real Telegram client answers in milliseconds; a mocked
  // dev environment never answers at all, so this must never be allowed to
  // block the rest of boot() from resolving.
  if (mountViewport.isAvailable()) {
    try {
      await mountViewport({ timeout: 1000 });
      if (bindViewportCssVars.isAvailable()) bindViewportCssVars();
      if (expandViewport.isAvailable()) expandViewport();
    } catch (error) {
      console.warn("[telegram] viewport mount skipped (no response from host)", error);
    }
  }

  return { isTelegramEnvironment: usable };
}

function hasTelegramHost() {
  return Boolean(window.Telegram?.WebApp?.initData || window.TelegramWebviewProxy || window.external?.notify);
}

function hasTelegramLaunchParams() {
  const href = window.location.href.replace(/^[^?#]*[?#]/, "").replace(/[?#]/g, "&");
  return href.includes("tgWebAppData=") || window.localStorage.getItem("launchParams")?.includes("tgWebAppData=");
}

function mockDevelopmentEnvironment() {
  mockTelegramEnv({
    launchParams: {
      tgWebAppData: new URLSearchParams([
        [
          "user",
          JSON.stringify({
            id: 279058397,
            first_name: "Dev",
            last_name: "User",
            username: "dev_user",
            language_code: "uz",
            is_premium: false,
            allows_write_to_pm: true,
          }),
        ],
        ["auth_date", String(Math.floor(Date.now() / 1000))],
        ["signature", "dev-mode-mock-signature"],
        ["hash", "dev-mode-mock-hash"],
      ]),
      tgWebAppStartParam: "",
      tgWebAppThemeParams: {
        bg_color: "#ffffff",
        text_color: "#1b2030",
        hint_color: "#7b839a",
        link_color: "#2b3a67",
        button_color: "#2b3a67",
        button_text_color: "#ffffff",
        secondary_bg_color: "#f5f6f8",
      },
      tgWebAppVersion: "8.0",
      tgWebAppPlatform: "web",
    },
  });
}
