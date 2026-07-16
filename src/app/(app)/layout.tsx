import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getPermissions } from "@/features/auth/api/permissions";
import { getSession } from "@/features/auth/api/session";
import { NoAccessView } from "@/features/auth/components/no-access-view";
import { AppShell } from "@/shared/components/layout/app-shell";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  /**
   * A verified Telegram user is not automatically a Viewer — access to the
   * ledger is granted per person by a Super Admin, because these records pair
   * real names with cash and gold amounts. Without a grant, every query would
   * legitimately return nothing, so this says why instead of rendering a set
   * of convincingly empty screens.
   */
  const { hasAccess } = await getPermissions();
  if (!hasAccess) {
    return <NoAccessView />;
  }

  return <AppShell>{children}</AppShell>;
}
