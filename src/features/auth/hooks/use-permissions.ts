"use client";

import { useSessionQuery } from "./use-session";

export interface PermissionState {
  isSuperAdmin: boolean;
  /** Has any role granted — i.e. may see the ledger at all. */
  hasAccess: boolean;
  /** True until the session query resolves; treat gated UI as unavailable. */
  isLoading: boolean;
}

/**
 * What the current user may do, as answered by the database's own
 * my_permissions() — the same functions the RLS policies call.
 *
 * This is for *rendering*, never for enforcement. Hiding a button is a
 * courtesy so a Viewer isn't invited to do something that will fail; the
 * write is stopped by RLS regardless of what the UI shows, and the server
 * action checks again before it ever reaches the database.
 *
 * Defaults to no access while loading, so a permission-gated control can
 * never flash into view before we know the answer.
 */
export function usePermissions(): PermissionState {
  const { data, isLoading } = useSessionQuery();

  return {
    isSuperAdmin: data?.permissions?.isSuperAdmin ?? false,
    hasAccess: data?.permissions?.hasAccess ?? false,
    isLoading,
  };
}
