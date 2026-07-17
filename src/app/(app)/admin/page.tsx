import { Activity, Database, FileText, Gift, Heart, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminHomeStats } from "@/features/admin";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const stats = await getAdminHomeStats(createSupabaseServerClient());
  const cards = [
    { label: "Total Events", value: stats.totalEvents, icon: Heart },
    { label: "Total Gifts", value: stats.totalGifts, icon: Gift },
    { label: "Total Users", value: stats.totalUsers, icon: Users },
    { label: "Audit Logs", value: stats.totalAuditLogs, icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Admin"
        description="Manage users, roles, files, settings and operational health from one enterprise control surface."
        actions={
          <div className="flex gap-3">
            <Link href="/admin/audit" className="text-primary text-sm font-medium">
              Audit history
            </Link>
            <Link href="/admin/users" className="text-primary text-sm font-medium">
              Manage users
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="glass-panel border-0">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-muted-foreground text-sm">{label}</p>
                <p className="text-foreground text-2xl font-semibold tabular-nums">{value}</p>
              </div>
              <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4" />
              Enterprise Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Link href="/admin/audit" className="hover:bg-muted rounded-lg border px-3 py-2 transition-colors">
              Review immutable audit history
            </Link>
            <a
              href="/api/audit/export?format=csv"
              className="hover:bg-muted rounded-lg border px-3 py-2 transition-colors"
            >
              Export audit CSV
            </a>
            <a href="/api/backups/audit" className="hover:bg-muted rounded-lg border px-3 py-2 transition-colors">
              Download audit backup JSON
            </a>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentActivity.length ? (
              stats.recentActivity.map((item) => (
                <div key={item.id} className="bg-muted/40 flex justify-between gap-3 rounded-lg px-3 py-2 text-sm">
                  <span>{item.action}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No activity yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {Object.entries(stats.system).map(([key, value]) => (
              <div key={key} className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                <span className="capitalize">{key}</span>
                <span className="text-foreground flex items-center gap-1.5 font-medium">
                  {key === "database" ? <Database className="size-3.5" /> : null}
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
