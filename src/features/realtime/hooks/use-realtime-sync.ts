"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { usePermissions } from "@/features/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type RealtimeStatus = "connecting" | "live" | "error";

/**
 * Keeps every open session current without a refresh.
 *
 * When a Super Admin adds a gift, Postgres publishes the change, Realtime
 * fans it out, and each connected Viewer's query cache is invalidated — so
 * their list refetches on its own. Subscriptions carry the same JWT as normal
 * requests, so Realtime applies the identical RLS policies: a Viewer's socket
 * only ever receives rows their SELECT policy already allows. Nothing here
 * needs its own authorization rules.
 *
 * The payload is deliberately discarded and the cache invalidated instead of
 * patched. A change event describes one row, but the screens showing it are
 * aggregates and joins — gift counts, per-currency totals, filtered pages.
 * Refetching is one cheap request that is always right; reconstructing those
 * views from a row diff would be a second, subtly different implementation of
 * every query in the module.
 *
 * Mounted once, from the app shell.
 */
export function useRealtimeSync(): RealtimeStatus {
  const queryClient = useQueryClient();
  const { hasAccess } = usePermissions();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    // Without a role there is nothing to receive — RLS would filter every
    // message — so don't hold a socket open for it.
    if (!hasAccess) return;

    const supabase = createSupabaseBrowserClient();

    const invalidateEvents = () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const invalidateGifts = () => {
      void queryClient.invalidateQueries({ queryKey: ["gifts"] });
      // A gift changes its event's gift_count and cash totals, both of which
      // live under the events key.
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const channel = supabase
      .channel("wedding-registry-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, invalidateEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "gifts" }, invalidateGifts)
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => {
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
