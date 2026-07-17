"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { listAuditLogs } from "../api/audit-repository";
import type { AuditFilters } from "../types";

export const auditKeys = {
  all: ["audit"] as const,
  list: (filters: AuditFilters) => [...auditKeys.all, "list", filters] as const,
};

export function useAuditLogsInfiniteQuery(filters: AuditFilters) {
  return useInfiniteQuery({
    queryKey: auditKeys.list(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listAuditLogs(createSupabaseBrowserClient(), filters, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
