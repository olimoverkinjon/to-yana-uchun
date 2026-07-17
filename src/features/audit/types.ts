import type { Json } from "@/lib/supabase/types";

export interface AuditLogRow {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  record_id: string;
  changed_by: string | null;
  telegram_user_id: number | null;
  actor_role: string | null;
  actor_first_name?: string | null;
  actor_last_name?: string | null;
  actor_username?: string | null;
  old_data: Json | null;
  new_data: Json | null;
  changed_fields: Json;
  reason: string | null;
  ip_address: unknown;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  session_id: string | null;
  request_id: string | null;
  related_event_id: string | null;
  related_gift_id: string | null;
  event_title?: string | null;
  gift_giver_name?: string | null;
  severity: "info" | "warning" | "critical";
}

export interface AuditFilters {
  search?: string;
  action?: string;
  table?: string;
  severity?: string;
  from?: string;
  to?: string;
}

export interface AuditPage {
  items: AuditLogRow[];
  nextCursor: string | null;
}

export interface AuditStatistic {
  label: string;
  value: string;
  detail?: string;
  href?: string;
}
