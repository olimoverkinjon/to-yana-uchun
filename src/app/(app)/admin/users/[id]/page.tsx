import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminActionButton } from "@/features/admin/components/admin-action-button";
import { getAdminUser } from "@/features/admin";
import { setUserDisabledAction } from "@/features/admin/api/admin-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const user = await getAdminUser(supabase, id);
  if (!user) notFound();

  const [events, gifts, activity, audit] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", id),
    supabase.from("gifts").select("id", { count: "exact", head: true }).eq("created_by", id),
    supabase.from("activity_logs").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(8),
    supabase.from("audit_logs").select("*").eq("changed_by", id).order("created_at", { ascending: false }).limit(8),
  ]);

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || String(user.telegram_id);
  const disabled = Boolean(user.deleted_at);

  return (
    <div className="space-y-5">
      <AdminPageHeader title={fullName} description={`Telegram ID ${user.telegram_id}`} />

      <section className="glass-panel grid gap-4 rounded-xl p-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={disabled ? "destructive" : "secondary"}>{disabled ? "Disabled" : "Active"}</Badge>
            {user.roles.map((role) => (
              <Badge key={role.id}>{role.name}</Badge>
            ))}
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Username</dt>
              <dd>{user.username ? `@${user.username}` : "None"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Language</dt>
              <dd>{user.language_code ?? "None"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Premium</dt>
              <dd>{user.is_premium ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last login</dt>
              <dd>{user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : "Never"}</dd>
            </div>
          </dl>
        </div>
        <AdminActionButton
          label={disabled ? "Enable" : "Disable"}
          title={disabled ? "Enable this user?" : "Disable this user?"}
          description="This destructive admin action is audited and can be undone for 10 seconds."
          variant={disabled ? "default" : "destructive"}
          action={(reason) => setUserDisabledAction({ userId: user.id, disabled: !disabled, reason })}
          success={disabled ? "User enabled" : "User disabled"}
          undo={() => setUserDisabledAction({ userId: user.id, disabled, reason: "Undo profile status change" })}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Events created" value={events.count ?? 0} />
        <Metric label="Gifts created" value={gifts.count ?? 0} />
        <Metric label="Activity entries" value={activity.data?.length ?? 0} />
        <Metric label="Audit entries" value={audit.data?.length ?? 0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Timeline
          title="Recent activity"
          items={(activity.data ?? []).map((item) => ({
            id: item.id,
            title: item.action,
            subtitle: new Date(item.created_at).toLocaleString(),
          }))}
        />
        <Timeline
          title="Audit trail"
          items={(audit.data ?? []).map((item) => ({
            id: item.id,
            title: `${item.action} ${item.table_name}`,
            subtitle: item.reason ?? new Date(item.created_at).toLocaleString(),
          }))}
        />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function Timeline({ title, items }: { title: string; items: { id: string; title: string; subtitle: string }[] }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border-border/70 rounded-lg border p-3">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-muted-foreground mt-1 text-xs">{item.subtitle}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">No records yet</p>
          <p className="text-muted-foreground mt-1 text-xs">Important admin activity will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}
