"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");

  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-1.5">
        <p className="text-foreground text-lg font-semibold">{t("genericTitle")}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{t("genericBody")}</p>
      </div>
      <Button onClick={reset}>{tCommon("retry")}</Button>
    </div>
  );
}
