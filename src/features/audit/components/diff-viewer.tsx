"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Json } from "@/lib/supabase/types";

function isRecord(value: Json | undefined): value is Record<string, Json | undefined> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringify(value: Json | undefined) {
  if (value === undefined || value === null || value === "") return "empty";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function fieldsFromVersions(before: Json | null, after: Json | null) {
  const oldRecord = isRecord(before ?? undefined) ? (before as Record<string, Json | undefined>) : {};
  const newRecord = isRecord(after ?? undefined) ? (after as Record<string, Json | undefined>) : {};
  return [...new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])]
    .filter((key) => key !== "search_vector" && JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key]))
    .sort()
    .map((key) => ({ key, oldValue: oldRecord[key], newValue: newRecord[key] }));
}

export function fieldsFromChangedFields(changedFields: Json | null | undefined) {
  if (!isRecord(changedFields ?? undefined)) return [];
  return Object.entries(changedFields as Record<string, Json | undefined>)
    .map(([key, value]) => {
      const record = isRecord(value) ? value : {};
      return { key, oldValue: record.old, newValue: record.new };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function DiffViewer({
  before,
  after,
  changedFields,
  compact = false,
}: {
  before?: Json | null;
  after?: Json | null;
  changedFields?: Json | null;
  compact?: boolean;
}) {
  const fields = changedFields
    ? fieldsFromChangedFields(changedFields)
    : fieldsFromVersions(before ?? null, after ?? null);

  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-muted-foreground text-sm">No field-level differences recorded.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {fields.map((field, index) => (
        <motion.div
          key={field.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(index * 0.015, 0.12) }}
          className="overflow-hidden rounded-lg border"
        >
          <div className="bg-muted/50 flex items-center justify-between border-b px-3 py-2">
            <span className="font-mono text-xs font-medium">{field.key}</span>
          </div>
          <div className="grid md:grid-cols-2">
            <ValuePane label="Before" value={field.oldValue} tone="old" compact={compact} />
            <ValuePane label="After" value={field.newValue} tone="new" compact={compact} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ValuePane({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: Json | undefined;
  tone: "old" | "new";
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b p-3 md:border-b-0 md:first:border-r",
        tone === "old" ? "bg-destructive/5" : "bg-chart-3/10",
      )}
    >
      <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">{label}</p>
      <pre
        className={cn(
          "font-mono text-xs break-words whitespace-pre-wrap",
          compact ? "line-clamp-3" : "max-h-80 overflow-auto",
        )}
      >
        {stringify(value)}
      </pre>
    </div>
  );
}
