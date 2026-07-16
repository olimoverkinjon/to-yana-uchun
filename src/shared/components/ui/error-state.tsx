"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toAppError } from "@/shared/lib/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * Renders a failed query as something a person can act on.
 *
 * Runs the error through toAppError so a Postgres policy violation reads as
 * "only the registry admin can do that" rather than leaking the failing
 * table's name. `detail` is never rendered — it exists for logs.
 */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");
  const { code } = toAppError(error);

  // A request that never reached the server throws with no SQLSTATE, so it
  // would land on the generic "unknown". Worth distinguishing: "check your
  // connection" is actionable, "something went wrong" is not.
  const isOffline = typeof window !== "undefined" && !window.navigator.onLine;
  const message = isOffline ? t("network") : t(code);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <span className="bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-2xl">
        <AlertTriangle className="size-5" />
      </span>
      <p className="text-muted-foreground max-w-xs text-sm">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="mr-2 size-3.5" />
          {tCommon("retry")}
        </Button>
      ) : null}
    </div>
  );
}
