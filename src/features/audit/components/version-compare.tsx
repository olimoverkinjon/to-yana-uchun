"use client";

import { useMemo, useState } from "react";

import type { Json } from "@/lib/supabase/types";

import type { AuditLogRow } from "../types";
import { DiffViewer } from "./diff-viewer";

function snapshot(log: AuditLogRow): Json | null {
  return log.old_data ?? log.new_data ?? null;
}

function label(log: AuditLogRow) {
  return `${new Date(log.created_at).toLocaleString()} - ${log.action}`;
}

export function VersionCompare({ versions }: { versions: AuditLogRow[] }) {
  const comparable = useMemo(() => versions.filter((item) => snapshot(item)), [versions]);
  const [leftId, setLeftId] = useState(comparable[1]?.id ?? comparable[0]?.id ?? "");
  const [rightId, setRightId] = useState(comparable[0]?.id ?? "");

  const left = comparable.find((item) => item.id === leftId) ?? comparable[0];
  const right = comparable.find((item) => item.id === rightId) ?? comparable[0];

  if (comparable.length < 2) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">Not enough history to compare yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Once this record changes twice, any two versions can be compared here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={left?.id ?? ""}
          onChange={(event) => setLeftId(event.target.value)}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          {comparable.map((item) => (
            <option key={item.id} value={item.id}>
              {label(item)}
            </option>
          ))}
        </select>
        <select
          value={right?.id ?? ""}
          onChange={(event) => setRightId(event.target.value)}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          {comparable.map((item) => (
            <option key={item.id} value={item.id}>
              {label(item)}
            </option>
          ))}
        </select>
      </div>
      <DiffViewer before={snapshot(left)} after={snapshot(right)} />
    </div>
  );
}
