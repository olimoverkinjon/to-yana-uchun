"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useRealtimeSync, type RealtimeStatus } from "../hooks/use-realtime-sync";

const RealtimeContext = createContext<RealtimeStatus>("connecting");

/**
 * Owns the single Realtime subscription for the whole app. Mounted once so
 * that N components caring about live data does not mean N sockets; anything
 * that wants to show connection state reads it from context.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const status = useRealtimeSync();
  return <RealtimeContext.Provider value={status}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeContext);
}
