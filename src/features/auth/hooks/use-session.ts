"use client";

import { useQuery } from "@tanstack/react-query";

import type { AuthenticatedUser } from "../types";

async function fetchSession(): Promise<AuthenticatedUser | null> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) return null;

  const data = (await response.json()) as { user: (AuthenticatedUser & { issuedAt: number }) | null };
  return data.user;
}

export function useSessionQuery() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
  });
}
