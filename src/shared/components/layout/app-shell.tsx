import type { ReactNode } from "react";

import { AppHeader, BottomNav } from "@/features/navigation";

import { PageTransition } from "./page-transition";

/** The chrome around every authenticated screen: header, content, mobile tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pb-10">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
