import { z } from "zod";

/**
 * Env vars are validated once at import time so a missing/misconfigured
 * value fails loudly at boot instead of surfacing as a mysterious runtime
 * bug three components deep. Client and server schemas are kept separate
 * so a server secret can never accidentally end up in a client bundle.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const serverOnlySchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // The project's legacy shared JWT secret (Project Settings > API > JWT
  // Settings). Signing our own Telegram-derived JWTs with this exact secret
  // is what lets PostgREST/Realtime verify them as valid `authenticated`
  // sessions without registering a separate third-party auth provider.
  SUPABASE_JWT_SECRET: z.string().min(32, "SUPABASE_JWT_SECRET must be at least 32 characters"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

function readClientEnv() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid client environment variables:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  return parsed.data;
}

function readServerEnv() {
  const parsed = serverOnlySchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    SESSION_SECRET: process.env.SESSION_SECRET,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  return parsed.data;
}

export const clientEnv = readClientEnv();

/**
 * Lazy on purpose: importing this module must be safe from client
 * components (they'll only ever call clientEnv), while serverEnv()
 * throws immediately if evaluated outside a server context that has
 * the secrets available.
 */
export function serverEnv() {
  return readServerEnv();
}
