"use client";

import { FilePlus2, History, PenLine, RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatRelativeTime, initialsOf } from "@/shared/lib/format";

import type { ActivityRow } from "../api/activity-repository";

interface ActivityListProps {
  items: ActivityRow[];
  isLoading?: boolean;
  emptyTitle: string;
  className?: string;
}

/** Colour and icon per action, so the kind of change reads at a glance. */
const ACTION_STYLE: Record<string, { icon: typeof PenLine; className: string }> = {
  INSERT: { icon: FilePlus2, className: "bg-primary/10 text-primary" },
  UPDATE: { icon: PenLine, className: "bg-chart-2/15 text-chart-2" },
  DELETE: { icon: Trash2, className: "bg-destructive/10 text-destructive" },
  RESTORE: { icon: RotateCcw, className: "bg-chart-3/15 text-chart-3" },
};

/**
 * Renders the audit trail as a readable feed.
 *
 * Every row here was written by a database trigger, not by application code —
 * so this is a view onto what actually happened, not onto what the app
 * remembered to report.
 */
export function ActivityList({ items, isLoading = false, emptyTitle, className }: ActivityListProps) {
  const t = useTranslations("activity");
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={History} title={emptyTitle} className="py-10" />;
  }

  return (
    <ul className={cn("space-y-1", className)}>
      {items.map((item) => {
        const style = ACTION_STYLE[item.action ?? "UPDATE"] ?? ACTION_STYLE.UPDATE;
        const Icon = style.icon;

        const name =
          [item.changed_by_first_name, item.changed_by_last_name].filter(Boolean).join(" ") ||
          item.changed_by_username ||
          t("unknownUser");

        // A table not covered by the entity map still renders — the raw table
        // name is a worse label than a translated one, but far better than a
        // blank line in a permanent record.
        const entity = item.table_name ? t(`entity.${item.table_name}` as never) : "";
        const action = item.action ? t(`action.${item.action}` as never) : "";

        return (
          <li key={item.id} className="hover:bg-muted/50 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", style.className)}>
              <Icon className="size-3.5" />
            </span>

            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-foreground text-sm">{t("summary", { name, action, entity })}</p>
              {item.reason ? (
                <p className="text-muted-foreground line-clamp-2 text-xs italic">
                  {t("reason", { reason: item.reason })}
                </p>
              ) : null}
              <p className="text-muted-foreground text-xs">{formatRelativeTime(item.created_at, locale)}</p>
            </div>

            <Avatar className="size-7 shrink-0">
              {item.changed_by_username ? <AvatarImage src={undefined} alt="" /> : null}
              <AvatarFallback className="text-[10px]">{initialsOf(name)}</AvatarFallback>
            </Avatar>
          </li>
        );
      })}
    </ul>
  );
}
