"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityList, useRecentActivityQuery } from "@/features/activity";
import { usePermissions } from "@/features/auth";

/**
 * The audit trail's most recent entries.
 *
 * Super-Admin-only, matching the permission matrix and the RLS policy on
 * audit_logs. For anyone else the query is skipped and the card is not
 * rendered — a Viewer is not shown an empty box implying there is something
 * here they failed to load.
 */
export function RecentActivityList() {
  const t = useTranslations("dashboard");
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();

  const query = useRecentActivityQuery(10, { enabled: isSuperAdmin });

  if (!isSuperAdmin && !permissionsLoading) return null;

  return (
    <Card className="glass-panel gap-0 border-0 py-0 ring-0">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-base font-semibold">{t("stats.recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <ActivityList
          items={query.data ?? []}
          isLoading={permissionsLoading || query.isLoading}
          emptyTitle={t("emptyActivity")}
        />
      </CardContent>
    </Card>
  );
}
