"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function NotFoundView() {
  const t = useTranslations("errors");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-primary text-6xl font-semibold tracking-tight">404</p>
      <div className="space-y-1.5">
        <p className="text-foreground text-lg font-semibold">{t("notFoundTitle")}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{t("notFoundBody")}</p>
      </div>
      <Button render={<Link href="/dashboard" />}>{t("goHome")}</Button>
    </div>
  );
}
