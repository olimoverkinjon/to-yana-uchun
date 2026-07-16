import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSession } from "@/features/auth/api/session";
import { AppShell } from "@/shared/components/layout/app-shell";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return <AppShell>{children}</AppShell>;
}
