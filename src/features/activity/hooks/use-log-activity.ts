"use client";

import { useCallback } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/types";

type ActivityAction = Database["public"]["Tables"]["activity_logs"]["Insert"]["action"];
type ActivityMetadata = Record<string, Json>;

/**
 * Records behavioural telemetry. Fire-and-forget by design: activity logging
 * must never add latency to, or break, the thing it is observing.
 */
export function useLogActivity() {
  return useCallback((action: ActivityAction, metadata: ActivityMetadata = {}) => {
    const supabase = createSupabaseBrowserClient();
    void supabase.rpc("log_activity", { p_action: action, p_metadata: metadata }).then(({ error }) => {
      if (error) console.debug("[activity] not logged", error.message);
    });
  }, []);
}
