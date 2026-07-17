import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { getAuditLog, listRecordAuditLogs } from "@/features/audit";
import { DiffViewer } from "@/features/audit/components/diff-viewer";
import { RestoreVersionButton } from "@/features/audit/components/restore-version-button";
import { VersionCompare } from "@/features/audit/components/version-compare";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const audit = await getAuditLog(supabase, id);
  if (!audit) notFound();

  const versions = await listRecordAuditLogs(supabase, audit.table_name, audit.record_id, 100);
  const canRestore = audit.table_name === "events" || audit.table_name === "gifts";
  const recordHref = audit.related_event_id ? `/events/${audit.related_event_id}` : null;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={`${audit.action} ${audit.table_name}`}
        description={`Immutable audit entry from ${new Date(audit.created_at).toLocaleString()}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" render={<Link href="/admin/audit" />}>
              <ArrowLeft className="mr-1.5 size-3.5" />
              Audit
            </Button>
            {recordHref ? (
              <Button variant="outline" size="sm" render={<Link href={recordHref} />}>
                <ExternalLink className="mr-1.5 size-3.5" />
                Record
              </Button>
            ) : null}
            {canRestore ? (
              <RestoreVersionButton auditId={audit.id} tableName={audit.table_name as "events" | "gifts"} />
            ) : null}
          </div>
        }
      />

      <section className="glass-panel grid gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Meta
          label="Actor"
          value={
            [audit.actor_first_name, audit.actor_last_name].filter(Boolean).join(" ") ||
            audit.actor_username ||
            "System"
          }
        />
        <Meta label="Telegram ID" value={audit.telegram_user_id ? String(audit.telegram_user_id) : "None"} />
        <Meta label="Role" value={audit.actor_role ?? "None"} />
        <Meta
          label="Severity"
          value={<Badge variant={audit.severity === "critical" ? "destructive" : "secondary"}>{audit.severity}</Badge>}
        />
        <Meta label="Browser" value={audit.browser ?? "Unknown"} />
        <Meta label="OS" value={audit.os ?? "Unknown"} />
        <Meta label="Device" value={audit.device ?? "Unknown"} />
        <Meta label="Request ID" value={audit.request_id ?? "None"} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Before vs after</h2>
        <DiffViewer changedFields={audit.changed_fields} before={audit.old_data} after={audit.new_data} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Compare any two historical versions</h2>
        <VersionCompare versions={versions} />
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}
