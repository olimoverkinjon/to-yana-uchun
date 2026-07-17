import type { ReactNode } from "react";

import { SessionIdentityGuard } from "@/features/auth";
import { AppHeader, BottomNav } from "@/features/navigation";

import { PageTransition } from "./page-transition";

/** The chrome around every authenticated screen: header, content, mobile tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col supports-[padding:max(0px)]:pt-[max(0px,env(safe-area-inset-top))]">
      <SessionIdentityGuard />
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-10">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
