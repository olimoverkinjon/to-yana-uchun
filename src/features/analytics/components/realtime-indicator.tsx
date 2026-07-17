"use client";

import { useTranslations } from "next-intl";

import { useRealtimeStatus } from "@/features/realtime";
import { cn } from "@/lib/utils";

/**
 * Whether the dashboard's figures are live.
 *
 * Worth the pixels because this dashboard updates itself: a reader looking at
 * a number needs to know whether it is current or the last one that arrived
 * before the connection dropped. "Offline — showing the last loaded data" is
 * the difference between stale and wrong.
 *
 * Carries a label as well as a dot, so the state is not colour-alone.
 */
export function RealtimeIndicator() {
  const t = useTranslations("realtime");
  const status = useRealtimeStatus();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium",
        status === "live" && "text-success bg-success/10",
        status === "connecting" && "text-muted-foreground bg-muted",
        status === "error" && "text-muted-foreground bg-muted",
      )}
      role="status"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "live" && "bg-success animate-pulse",
          status === "connecting" && "bg-muted-foreground/60",
          status === "error" && "bg-destructive",
        )}
      />
      <span className="hidden sm:inline">{t(status)}</span>
    </span>
  );
}
