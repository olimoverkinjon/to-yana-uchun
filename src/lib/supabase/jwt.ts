import "server-only";

import jwt from "jsonwebtoken";

import { serverEnv } from "@/lib/env";

/** Matches Supabase's own default JWT lifetime. */
export const SUPABASE_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

/**
 * Mints a Supabase-compatible access token for a given profile, signed with
 * the project's own JWT secret (the "legacy" shared HS256 secret every
 * Supabase project already has under Project Settings > API). PostgREST and
 * Realtime verify any token signed with this secret as a valid session —
 * no Supabase Auth user, email, or OAuth flow is involved.
 *
 * `sub` is profiles.id, which is exactly what RLS's `auth.uid()` reads. This
 * is the entire bridge between "we verified a Telegram user ourselves" and
 * "the database enforces permissions for that user via ordinary RLS."
 */
export function mintSupabaseAccessToken(profileId: string): string {
  return jwt.sign(
    {
      role: "authenticated",
      aud: "authenticated",
    },
    serverEnv().SUPABASE_JWT_SECRET,
    {
      subject: profileId,
      expiresIn: SUPABASE_ACCESS_TOKEN_TTL_SECONDS,
      algorithm: "HS256",
    },
  );
}
