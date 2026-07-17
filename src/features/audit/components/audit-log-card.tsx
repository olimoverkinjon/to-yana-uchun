"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  History,
  PenLine,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AuditLogRow } from "../types";
import { DiffViewer } from "./diff-viewer";

const actionIcon = {
  INSERT: FilePlus2,
  UPDATE: PenLine,
  DELETE: Trash2,
  RESTORE: RotateCcw,
};

export function AuditLogCard({ log }: { log: AuditLogRow }) {
  const Icon = actionIcon[log.action as keyof typeof actionIcon] ?? History;
  const actor = [log.actor_first_name, log.actor_last_name].filter(Boolean).join(" ") || log.actor_username || "System";
  const recordHref = log.related_event_id ? `/events/${log.related_event_id}` : null;

  return (
    <article className="glass-panel overflow-hidden rounded-xl">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              log.severity === "critical"
                ? "bg-destructive/10 text-destructive"
                : log.severity === "warning"
                  ? "bg-chart-4/15 text-chart-4"
                  : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">
                {log.action} {log.table_name}
              </h2>
              <Badge variant={log.severity === "critical" ? "destructive" : "secondary"}>{log.severity}</Badge>
              {log.actor_role ? <Badge variant="outline">{log.actor_role}</Badge> : null}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {actor} - {new Date(log.created_at).toLocaleString()}
            </p>
            {log.reason ? <p className="text-muted-foreground mt-1 line-clamp-2 text-xs italic">{log.reason}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {recordHref ? (
            <Button variant="outline" size="sm" render={<Link href={recordHref} />}>
              <ExternalLink className="mr-1.5 size-3.5" />
              Record
            </Button>
          ) : null}
          <Button variant="outline" size="sm" render={<Link href={`/admin/audit/${log.id}`} />}>
            Details
          </Button>
        </div>
      </div>

      {log.action === "UPDATE" || log.action === "RESTORE" || log.action === "DELETE" ? (
        <div className="p-4">
          <DiffViewer changedFields={log.changed_fields} compact />
        </div>
      ) : (
        <div className="flex items-center gap-2 p-4 text-sm">
          <CheckCircle2 className="text-chart-3 size-4" />
          <span>This audit entry is immutable and stored by the database trigger.</span>
        </div>
      )}
      {log.severity !== "info" ? (
        <div className="bg-muted/40 flex items-center gap-2 border-t px-4 py-2 text-xs">
          <AlertTriangle className="size-3.5" />
          <span>Super Admin notification generated automatically.</span>
        </div>
      ) : null}
    </article>
  );
}
