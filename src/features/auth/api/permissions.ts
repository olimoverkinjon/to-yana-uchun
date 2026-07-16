import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppError } from "@/shared/lib/errors";

import { getSession } from "./session";
import type { Permissions } from "../types";

const NO_ACCESS: Permissions = { isSuperAdmin: false, hasAccess: false, roles: [] };

/**
 * The current caller's permissions, straight from the database.
 *
 * Deliberately not read from the session cookie: a role granted or revoked by
 * a Super Admin has to take effect on the user's next request, not whenever
 * their month-long cookie happens to expire. Wrapped in React's `cache` so
 * the several components that ask about permissions during one render share a
 * single round trip.
 */
export const getPermissions = cache(async (): Promise<Permissions> => {
  const session = await getSession();
  if (!session) return NO_ACCESS;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("my_permissions").single();

  if (error || !data) {
    if (error) console.error("[auth] failed to resolve permissions", error);
    return NO_ACCESS;
  }

  return {
    isSuperAdmin: data.is_super_admin ?? false,
    hasAccess: data.is_viewer_or_above ?? false,
    roles: data.roles ?? [],
  };
});

/**
 * Server-side gate for mutating actions.
 *
 * The database would reject an unauthorized write on its own — RLS is the
 * real boundary and this cannot be relied on in its place. It exists so a
 * Viewer who calls a server action directly gets a clean "forbidden" instead
 * of a raw Postgres policy violation, and so the intent is stated at the top
 * of every action rather than inferred from an error three layers down.
 */
export async function requireSuperAdmin(): Promise<AppError | null> {
  const session = await getSession();
  if (!session) return { code: "unauthenticated" };

  const { isSuperAdmin } = await getPermissions();
  if (!isSuperAdmin) return { code: "forbidden" };

  return null;
}
