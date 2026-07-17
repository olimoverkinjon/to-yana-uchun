import type { SupabaseClient } from "@supabase/supabase-js";

import { demoAuditLogs, demoAuditPage, demoAuditStats } from "@/features/demo/demo-data";
import type { Database, Json } from "@/lib/supabase/types";
import { isLocalDemoMode } from "@/shared/lib/local-demo";

import type { AuditFilters, AuditLogRow, AuditPage, AuditStatistic } from "../types";

type Client = SupabaseClient<Database>;
type EnterpriseAuditRow = Database["public"]["Views"]["enterprise_audit_logs"]["Row"];

export const AUDIT_PAGE_SIZE = 30;

function escapeSearchTerm(term: string): string {
  return term
    .replace(/[\\%_]/g, "\\$&")
    .replace(/[,().*:"']/g, " ")
    .trim();
}

function normalizeAudit(row: EnterpriseAuditRow): AuditLogRow | null {
  if (!row.id || !row.created_at || !row.action || !row.table_name || !row.record_id) return null;
  return {
    ...row,
    id: row.id,
    created_at: row.created_at,
    action: row.action,
    table_name: row.table_name,
    record_id: row.record_id,
    changed_fields: row.changed_fields ?? {},
    severity: row.severity === "critical" || row.severity === "warning" ? row.severity : "info",
  };
}

function applySearchFilter<T extends { or: (filters: string) => T }>(request: T, filters: AuditFilters): T {
  const search = filters.search?.trim();
  if (search) {
    const term = escapeSearchTerm(search);
    if (term) {
      const telegramId = Number(term);
      return request.or(
        [
          `action.ilike.%${term}%`,
          `table_name.ilike.%${term}%`,
          `reason.ilike.%${term}%`,
          `actor_username.ilike.%${term}%`,
          `event_title.ilike.%${term}%`,
          `gift_giver_name.ilike.%${term}%`,
          `telegram_user_id.eq.${Number.isFinite(telegramId) ? telegramId : -1}`,
        ].join(","),
      );
    }
  }
  return request;
}

export async function listAuditLogs(
  supabase: Client,
  filters: AuditFilters = {},
  cursor?: string | null,
  limit = AUDIT_PAGE_SIZE,
): Promise<AuditPage> {
  if (isLocalDemoMode()) return demoAuditPage(limit);

  let query = supabase
    .from("enterprise_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.table) query = query.eq("table_name", filters.table);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  query = applySearchFilter(query, filters);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).flatMap((row) => {
    const normalized = normalizeAudit(row);
    return normalized ? [normalized] : [];
  });
  const items = rows.slice(0, limit);
  return {
    items,
    nextCursor: rows.length > limit ? (items.at(-1)?.created_at ?? null) : null,
  };
}

export async function getAuditLog(supabase: Client, id: string): Promise<AuditLogRow | null> {
  if (isLocalDemoMode()) return demoAuditLogs.find((row) => row.id === id) ?? demoAuditLogs[0] ?? null;

  const { data, error } = await supabase.from("enterprise_audit_logs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeAudit(data) : null;
}

export async function listRecordAuditLogs(
  supabase: Client,
  tableName: string,
  recordId: string,
  limit = 100,
): Promise<AuditLogRow[]> {
  if (isLocalDemoMode()) {
    return demoAuditLogs.filter((row) => row.table_name === tableName && row.record_id === recordId).slice(0, limit);
  }

  const { data, error } = await supabase
    .from("enterprise_audit_logs")
    .select("*")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const normalized = normalizeAudit(row);
    return normalized ? [normalized] : [];
  });
}

function asRecord(value: Json): Record<string, Json | undefined> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : null;
}

function stat(label: string, value: Json, detailKey?: string): AuditStatistic {
  const record = asRecord(value);
  if (!record) return { label, value: "None yet" };
  const count = typeof record.count === "number" ? `${record.count.toLocaleString()} changes` : undefined;
  const title =
    record.name ?? record.username ?? record.title ?? record.giver_name ?? record.day ?? record.action ?? "None yet";
  const hrefId = detailKey ? record[detailKey] : undefined;
  return {
    label,
    value: String(title),
    detail: count,
    href: typeof hrefId === "string" ? `/events/${hrefId}` : undefined,
  };
}

export async function getAuditStatistics(supabase: Client): Promise<AuditStatistic[]> {
  if (isLocalDemoMode()) return demoAuditStats;

  const { data, error } = await supabase.rpc("audit_statistics");
  if (error) throw error;
  const row = data[0];
  return [
    stat("Most Active Admin", row?.most_active_admin ?? null),
    stat("Most Edited Event", row?.most_edited_event ?? null, "event_id"),
    stat("Most Edited Gift", row?.most_edited_gift ?? null, "gift_id"),
    stat("Most Active Day", row?.most_active_day ?? null),
    stat("Most Common Action", row?.most_common_action ?? null),
  ];
}
