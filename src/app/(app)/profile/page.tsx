import { Crown, Languages, ShieldCheck, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPermissions } from "@/features/auth/api/permissions";
import { getSession } from "@/features/auth/api/session";
import { LanguageSwitcher } from "@/features/navigation/components/language-switcher";
import { ThemeSwitcher } from "@/features/navigation/components/theme-switcher";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const t = await getTranslations("profile");
  const permissions = await getPermissions();
  const displayName = [session.firstName, session.lastName].filter(Boolean).join(" ") || session.username || "User";
  const initials = `${session.firstName?.[0] ?? ""}${session.lastName?.[0] ?? ""}`.trim().toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="from-primary/12 via-accent/10 to-background border-b bg-gradient-to-br p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="bg-background size-16 border shadow-sm">
                <AvatarImage src={session.photoUrl} alt={displayName} />
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-muted-foreground text-sm font-medium">{t("eyebrow")}</p>
                <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
                <p className="text-muted-foreground text-sm">@{session.username ?? "telegram_user"}</p>
              </div>
            </div>
            <div className="bg-background/80 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm">
              <ShieldCheck className="text-primary size-4" />
              {permissions.isSuperAdmin ? t("superAdmin") : permissions.hasAccess ? t("viewer") : t("noAccess")}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
          <InfoCard icon={UserRound} label={t("telegramId")} value={String(session.telegramId)} />
          <InfoCard icon={Languages} label={t("language")} value={(session.languageCode ?? "uz").toUpperCase()} />
          <InfoCard icon={Crown} label={t("premium")} value={session.isPremium ? t("enabled") : t("notEnabled")} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-2xl border p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold tracking-tight">{t("language")}</h2>
            <p className="text-muted-foreground text-sm">{t("languageDescription")}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="bg-card rounded-2xl border p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold tracking-tight">{t("theme")}</h2>
            <p className="text-muted-foreground text-sm">{t("themeDescription")}</p>
          </div>
          <ThemeSwitcher />
        </div>
      </section>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="bg-background/60 rounded-xl border p-4">
      <div className="bg-primary/10 text-primary mb-3 flex size-9 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </div>
      <p className="text-muted-foreground text-xs font-medium uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
