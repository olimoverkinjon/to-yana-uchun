import { CalendarHeart, FileClock, Gift, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getAdminHomeStats } from "@/features/admin";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const t = await getTranslations("adminHome");
  const stats = await getAdminHomeStats(createSupabaseServerClient());
  const cards = [
    { label: t("totalEvents"), value: stats.totalEvents, icon: CalendarHeart },
    { label: t("totalGifts"), value: stats.totalGifts, icon: Gift },
    { label: t("totalUsers"), value: stats.totalUsers, icon: Users },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="glass-panel border-0">
            <CardContent className="flex items-center justify-between p-5">
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-sm">{label}</p>
                <p className="text-foreground text-2xl font-semibold tabular-nums">{value}</p>
              </div>
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="glass-panel hover:bg-muted/35 flex items-center gap-3 rounded-2xl p-4 transition-colors"
        >
          <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Users className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="text-foreground block font-semibold">{t("usersTitle")}</span>
            <span className="text-muted-foreground block text-sm">{t("usersDescription")}</span>
          </span>
        </Link>

        <Link
          href="/admin/audit"
          className="glass-panel hover:bg-muted/35 flex items-center gap-3 rounded-2xl p-4 transition-colors"
        >
          <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            <FileClock className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="text-foreground block font-semibold">{t("historyTitle")}</span>
            <span className="text-muted-foreground block text-sm">{t("historyDescription")}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
