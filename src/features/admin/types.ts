import type { Database, Json } from "@/lib/supabase/types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type RoleRow = Database["public"]["Tables"]["roles"]["Row"];
export type SettingRow = Database["public"]["Tables"]["settings"]["Row"];
export type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];
export type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["activity_logs"]["Row"];

export interface AdminUser extends ProfileRow {
  roles: RoleRow[];
}

export interface AdminList<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminHomeStats {
  totalEvents: number;
  totalGifts: number;
  totalUsers: number;
  totalAuditLogs: number;
  recentEvents: Database["public"]["Tables"]["events"]["Row"][];
  recentGifts: Database["public"]["Tables"]["gifts"]["Row"][];
  recentActivity: ActivityRow[];
  system: {
    database: "healthy" | "degraded";
    realtime: "healthy";
    storage: "healthy" | "degraded";
    auth: "healthy";
    api: "healthy";
    version: string;
  };
}

export interface AdminQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
  role?: string;
  status?: "active" | "disabled";
  language?: string;
}

export type SettingValue = Json;
