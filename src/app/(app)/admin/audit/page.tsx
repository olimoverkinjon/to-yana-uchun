import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { getAuditStatistics } from "@/features/audit";
import { AuditExplorer } from "@/features/audit/components/audit-explorer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const stats = await getAuditStatistics(createSupabaseServerClient());

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Audit History"
        description="Immutable database history with diffs, version restore, realtime timeline updates and export."
        actions={
          <Link href="/admin" className="text-primary text-sm font-medium">
            Admin home
          </Link>
        }
      />

      <section className="grid gap-3 lg:grid-cols-5">
        {stats.map((item) => (
          <div key={item.label} className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary size-4" />
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{item.label}</p>
            </div>
            <p className="mt-2 truncate text-lg font-semibold">{item.value}</p>
            {item.detail ? <p className="text-muted-foreground mt-1 text-xs">{item.detail}</p> : null}
          </div>
        ))}
      </section>

      <AuditExplorer
        initialFilters={{
          search: params.search,
          action: params.action,
          table: params.table,
          severity: params.severity,
          from: params.from,
          to: params.to,
        }}
      />
    </div>
  );
}
