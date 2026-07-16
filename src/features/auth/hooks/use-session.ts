"use client";

import { useQuery } from "@tanstack/react-query";

import type { AuthenticatedUser, Permissions } from "../types";

export interface SessionState {
  user: (AuthenticatedUser & { issuedAt: number }) | null;
  permissions: Permissions | null;
}

const SIGNED_OUT: SessionState = { user: null, permissions: null };

async function fetchSession(): Promise<SessionState> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) return SIGNED_OUT;
  return (await response.json()) as SessionState;
}

export const sessionQueryKey = ["auth", "session"] as const;

export function useSessionQuery() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
  });
}
