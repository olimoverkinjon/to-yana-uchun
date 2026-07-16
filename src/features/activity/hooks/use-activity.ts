"use client";

import { useQuery } from "@tanstack/react-query";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { listRecentActivity, listRecordActivity } from "../api/activity-repository";

export const activityKeys = {
  all: ["activity"] as const,
  recent: (limit: number) => [...activityKeys.all, "recent", limit] as const,
  record: (table: string, id: string) => [...activityKeys.all, "record", table, id] as const,
};

/**
 * `enabled` defaults to true but callers pass the Super Admin check: RLS would
 * return an empty list for a Viewer anyway, so skipping the request avoids a
 * round trip whose answer is already known.
 */
export function useRecentActivityQuery(limit = 20, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: activityKeys.recent(limit),
    queryFn: () => listRecentActivity(createSupabaseBrowserClient(), limit),
    enabled: options.enabled ?? true,
  });
}

export function useRecordActivityQuery(table: string, recordId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: activityKeys.record(table, recordId),
    queryFn: () => listRecordActivity(createSupabaseBrowserClient(), table, recordId),
    enabled: options.enabled ?? true,
  });
}
