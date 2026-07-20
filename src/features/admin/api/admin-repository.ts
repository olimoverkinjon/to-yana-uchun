import "server-only";

import {
  demoAdminHomeStats,
  demoAdminList,
  demoAttachments,
  demoRoles,
  demoSettings,
  demoUsers,
} from "@/features/demo/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { isLocalDemoMode } from "@/shared/lib/local-demo";

import type { AdminHomeStats, AdminList, AdminQuery, AdminUser, AttachmentRow, RoleRow, SettingRow } from "../types";

type Client = ReturnType<typeof createSupabaseServerClient>;
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type GiftRow = Database["public"]["Tables"]["gifts"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activity_logs"]["Row"];

const DEFAULT_PAGE_SIZE = 25;

function page(query: AdminQuery) {
  const pageSize = Math.min(Math.max(query.pageSize ?? DEFAULT_PAGE_SIZE, 10), 100);
  const current = Math.max(query.page ?? 1, 1);
  const from = (current - 1) * pageSize;
  return { current, pageSize, from, to: from + pageSize - 1 };
}

function direction(query: AdminQuery, fallback: "asc" | "desc" = "desc") {
  return (query.direction ?? fallback) === "asc";
}

export async function getAdminHomeStats(supabase: Client): Promise<AdminHomeStats> {
  if (isLocalDemoMode()) return demoAdminHomeStats();

  const [events, gifts, users, auditLogs, attachments, recentEvents, recentGifts, recentActivity] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("gifts").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    supabase.from("attachments").select("id", { count: "exact", head: true }),
    supabase.from("events").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("gifts").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  return {
    totalEvents: events.count ?? 0,
    totalGifts: gifts.count ?? 0,
    totalUsers: users.count ?? 0,
    totalAuditLogs: auditLogs.count ?? 0,
    recentEvents: (recentEvents.data ?? []) as EventRow[],
    recentGifts: (recentGifts.data ?? []) as GiftRow[],
    recentActivity: (recentActivity.data ?? []) as ActivityRow[],
    system: {
      database: events.error || gifts.error || users.error ? "degraded" : "healthy",
      realtime: "healthy",
      storage: attachments.error ? "degraded" : "healthy",
      auth: "healthy",
      api: "healthy",
      version: process.env.npm_package_version ?? "0.1.0",
    },
  };
}

export async function listRoles(supabase: Client): Promise<RoleRow[]> {
  if (isLocalDemoMode()) return demoRoles;

  const { data, error } = await supabase.from("roles").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAdminUsers(supabase: Client, query: AdminQuery = {}): Promise<AdminList<AdminUser>> {
  if (isLocalDemoMode()) return demoAdminList(demoUsers, query.page ?? 1, query.pageSize ?? DEFAULT_PAGE_SIZE);

  const { current, pageSize, from, to } = page(query);
  const sortColumn = new Set(["created_at", "last_seen_at", "first_name", "telegram_id"]).has(query.sort ?? "")
    ? query.sort!
    : "created_at";

  let request = query.role
    ? supabase
        .from("profiles")
        .select("*, user_roles!inner(roles!inner(name))", { count: "exact" })
        .eq("user_roles.roles.name", query.role)
        .is("user_roles.deleted_at", null)
    : supabase.from("profiles").select("*", { count: "exact" });

  const search = query.search?.trim();
  if (search) {
    const safe = search.replace(/[,%]/g, " ");
    request = request.or(
      `username.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,telegram_id.eq.${Number(safe) || -1}`,
    );
  }
  if (query.status === "active") request = request.is("deleted_at", null);
  if (query.status === "disabled") request = request.not("deleted_at", "is", null);
  if (query.language) request = request.eq("language_code", query.language);

  const { data, error, count } = await request
    .order(sortColumn, { ascending: direction(query), nullsFirst: false })
    .range(from, to);
  if (error) throw error;

  const profiles = (data ?? []) as ProfileRow[];
  const ids = profiles.map((profile) => profile.id);

  const roleByUser = await groupRolesByUser(supabase, ids);

  const items = profiles.map((profile) => ({ ...profile, roles: roleByUser.get(profile.id) ?? [] }));

  return { items, totalCount: count ?? items.length, page: current, pageSize };
}

export async function getAdminUser(supabase: Client, id: string): Promise<AdminUser | null> {
  if (isLocalDemoMode()) return demoUsers.find((user) => user.id === id) ?? demoUsers[0] ?? null;

  const direct = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (direct.error) throw direct.error;
  if (!direct.data) return null;

  const roleByUser = await groupRolesByUser(supabase, [id]);
  return {
    ...(direct.data as ProfileRow),
    roles: roleByUser.get(id) ?? [],
  };
}

async function groupRolesByUser(supabase: Client, userIds: string[]): Promise<Map<string, RoleRow[]>> {
  const roleByUser = new Map<string, RoleRow[]>();
  if (userIds.length === 0) return roleByUser;

  const roles = await listRoles(supabase);
  const viewer = roles.find((role) => role.name === "viewer");
  const admin = roles.find((role) => role.name === "super_admin");

  const from = supabase.from.bind(supabase) as unknown as (table: string) => {
    select: (columns: string) => {
      in: (
        column: string,
        values: string[],
      ) => {
        is: (column: string, value: null) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
  const { data, error } = await from("group_members")
    .select("user_id, role")
    .in("user_id", userIds)
    .is("deleted_at", null);
  if (error) throw error;

  for (const member of (data ?? []) as { user_id: string; role: "owner" | "admin" | "member" }[]) {
    const mapped = member.role === "member" ? viewer : admin;
    if (!mapped) continue;
    roleByUser.set(member.user_id, [...(roleByUser.get(member.user_id) ?? []), mapped]);
  }

  return roleByUser;
}

export async function listSettings(supabase: Client, query: AdminQuery = {}): Promise<AdminList<SettingRow>> {
  if (isLocalDemoMode()) return demoAdminList(demoSettings, query.page ?? 1, query.pageSize ?? DEFAULT_PAGE_SIZE);

  const { current, pageSize, from, to } = page(query);
  const sortColumn = new Set(["key", "updated_at", "created_at"]).has(query.sort ?? "") ? query.sort! : "key";
  let request = supabase.from("settings").select("*", { count: "exact" });
  if (query.search?.trim()) request = request.ilike("key", `%${query.search.trim()}%`);
  const { data, error, count } = await request
    .order(sortColumn, { ascending: direction(query, "asc") })
    .range(from, to);
  if (error) throw error;
  return { items: data ?? [], totalCount: count ?? 0, page: current, pageSize };
}

export async function listAttachments(supabase: Client, query: AdminQuery = {}): Promise<AdminList<AttachmentRow>> {
  if (isLocalDemoMode()) return demoAdminList(demoAttachments, query.page ?? 1, query.pageSize ?? DEFAULT_PAGE_SIZE);

  const { current, pageSize, from, to } = page(query);
  const sortColumn = new Set(["file_name", "file_size", "created_at", "deleted_at"]).has(query.sort ?? "")
    ? query.sort!
    : "created_at";
  let request = supabase.from("attachments").select("*", { count: "exact" });
  if (query.status === "active") request = request.is("deleted_at", null);
  if (query.status === "disabled") request = request.not("deleted_at", "is", null);
  if (query.search?.trim()) request = request.ilike("file_name", `%${query.search.trim()}%`);
  const { data, error, count } = await request.order(sortColumn, { ascending: direction(query) }).range(from, to);
  if (error) throw error;
  return { items: data ?? [], totalCount: count ?? 0, page: current, pageSize };
}
