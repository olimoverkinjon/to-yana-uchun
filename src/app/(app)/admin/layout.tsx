import type { ReactNode } from "react";

import { getPermissions } from "@/features/auth/api/permissions";
import { NoAccessView } from "@/features/auth/components/no-access-view";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = await getPermissions();
  if (!isSuperAdmin) return <NoAccessView />;
  return children;
}
