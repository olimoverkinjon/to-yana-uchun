"use client";

import { useTranslations } from "next-intl";

import { useTelegramUser } from "@/features/telegram";

export function DashboardGreeting() {
  const t = useTranslations("dashboard");
  const user = useTelegramUser();

  return (
    <div className="space-y-1">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">{t("title")}</h1>
      {user ? <p className="text-muted-foreground text-sm">{t("greeting", { name: user.first_name })}</p> : null}
    </div>
  );
}
