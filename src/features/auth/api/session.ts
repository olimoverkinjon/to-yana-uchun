import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { serverEnv } from "@/lib/env";
import { demoProfileId } from "@/features/demo/demo-data";
import { isLocalDemoMode } from "@/shared/lib/local-demo";

const SESSION_COOKIE_NAME = "wr_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

const sessionPayloadSchema = z.object({
  /** profiles.id — the `sub` claim minted into every Supabase access token for this session. */
  profileId: z.string(),
  telegramId: z.number(),
  firstName: z.string(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  photoUrl: z.string().optional(),
  languageCode: z.string().optional(),
  isPremium: z.boolean(),
  issuedAt: z.number(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/**
 * First-party, HMAC-signed, httpOnly session cookie. This is not a Supabase
 * Auth session — there still isn't one, by design (Telegram-only identity,
 * no email/OAuth). Instead, `profileId` is what lib/supabase/jwt.ts uses to
 * mint a short-lived Supabase-compatible access token per request, which is
 * what lets RLS's `auth.uid()` resolve correctly for this user.
 */
export async function createSession(user: Omit<SessionPayload, "issuedAt">) {
  const payload: SessionPayload = { ...user, issuedAt: Date.now() };
  const token = sign(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  if (isLocalDemoMode()) {
    return {
      profileId: demoProfileId,
      telegramId: 7990560340,
      firstName: "Local",
      lastName: "Admin",
      username: "local_admin",
      photoUrl: undefined,
      languageCode: "uz",
      isPremium: false,
      issuedAt: Date.now(),
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", serverEnv().SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verify(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = crypto.createHmac("sha256", serverEnv().SESSION_SECRET).update(body).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsedJson = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    // A validly *signed* cookie can still be the wrong *shape* — e.g. one
    // issued before a field like profileId existed. Treating that as "no
    // session" (rather than trusting it and blowing up three layers deeper,
    // as an undefined profileId reaching mintSupabaseAccessToken did during
    // this exact migration) makes the app self-heal by forcing a fresh
    // Telegram re-verification instead of erroring.
    const result = sessionPayloadSchema.safeParse(parsedJson);
    if (!result.success) return null;

    const age = Date.now() - result.data.issuedAt;
    if (age < 0 || age > SESSION_MAX_AGE_MS) return null;

    return result.data;
  } catch {
    return null;
  }
}
