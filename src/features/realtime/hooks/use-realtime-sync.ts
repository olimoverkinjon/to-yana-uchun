"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { usePermissions } from "@/features/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLocalDemoMode } from "@/shared/lib/local-demo";

export type RealtimeStatus = "connecting" | "live" | "error";

/**
 * Keeps every open session current without a refresh. Realtime carries the
 * same JWT as normal requests, so RLS scopes socket events exactly like reads.
 */
export function useRealtimeSync(): RealtimeStatus {
  const queryClient = useQueryClient();
  const { hasAccess } = usePermissions();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    if (isLocalDemoMode()) {
      setStatus("live");
      return;
    }

    if (!hasAccess) return;

    const supabase = createSupabaseBrowserClient();

    const invalidateEvents = () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const invalidateGifts = () => {
      void queryClient.invalidateQueries({ queryKey: ["gifts"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const channel = supabase
      .channel("wedding-registry-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, invalidateEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "gifts" }, invalidateGifts)
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["audit"] });
        void queryClient.invalidateQueries({ queryKey: ["activity"] });
      })
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("error");
        else if (state === "CLOSED") setStatus("connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, hasAccess]);

  return status;
}
