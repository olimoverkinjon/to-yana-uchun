import "server-only";

import crypto from "node:crypto";

import { serverEnv } from "@/lib/env";

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

/**
 * Sentinel hash produced by `mockDevelopmentEnvironment()` in
 * features/telegram/lib/init-telegram.ts. There is no real bot token to
 * sign against when developing outside Telegram, so this lets the *rest*
 * of the auth flow (session creation, redirect) be exercised locally
 * without weakening verification for any request that isn't this exact,
 * hardcoded, non-production value.
 */
const DEV_MOCK_HASH = "dev-mode-mock-hash";

export class InitDataVerificationError extends Error {}

export interface VerifiedTelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium: boolean;
}

export interface VerifiedInitData {
  authDate: Date;
  user: VerifiedTelegramUser;
  startParam?: string;
}

/**
 * Verifies Telegram's WebApp `initData` per the official algorithm:
 * HMAC-SHA256 the sorted "key=value" pairs (minus `hash`) using a secret
 * derived from the bot token, then compare in constant time. This is the
 * entire security perimeter for the app (§12 of the PRD) — every other
 * permission decision downstream assumes this already ran.
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(rawInitData: string): VerifiedInitData {
  const params = new URLSearchParams(rawInitData);

  const hash = params.get("hash");
  if (!hash) throw new InitDataVerificationError("initData is missing a hash");

  const isDevMock = process.env.NODE_ENV === "development" && hash === DEV_MOCK_HASH;

  if (!isDevMock) {
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(serverEnv().TELEGRAM_BOT_TOKEN).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (!timingSafeEqualHex(computedHash, hash)) {
      throw new InitDataVerificationError("initData signature does not match");
    }
  }

  return parseVerifiedFields(params);
}

function parseVerifiedFields(params: URLSearchParams): VerifiedInitData {
  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) throw new InitDataVerificationError("initData is missing auth_date");

  const authDate = new Date(Number(authDateRaw) * 1000);
  const ageSeconds = (Date.now() - authDate.getTime()) / 1000;
  if (Number.isNaN(ageSeconds) || ageSeconds > MAX_INIT_DATA_AGE_SECONDS || ageSeconds < -60) {
    throw new InitDataVerificationError("initData has expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new InitDataVerificationError("initData is missing the user field");

  let parsedUser: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  try {
    parsedUser = JSON.parse(userRaw);
  } catch {
    throw new InitDataVerificationError("initData user field is not valid JSON");
  }

  return {
    authDate,
    startParam: params.get("start_param") ?? undefined,
    user: {
      id: parsedUser.id,
      firstName: parsedUser.first_name,
      lastName: parsedUser.last_name,
      username: parsedUser.username,
      photoUrl: parsedUser.photo_url,
      languageCode: parsedUser.language_code,
      isPremium: parsedUser.is_premium ?? false,
    },
  };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
