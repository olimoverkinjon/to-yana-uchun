import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type ActivityRow = Database["public"]["Views"]["recent_activity"]["Row"];

/**
 * Reads from the recent_activity view — audit_logs pre-joined to the profile
 * of whoever made the change.
 *
 * Nothing writes here. Audit rows are produced entirely by a database trigger
 * on every insert/update/delete, so the app cannot forget to log a change, and
 * cannot log one that did not happen. RLS restricts reads to Super Admins, so
 * for a Viewer these simply return an empty list rather than failing.
 */
export async function listRecentActivity(supabase: Client, limit = 20): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("recent_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** The full change history of one record, newest first. */
export async function listRecordActivity(
  supabase: Client,
  tableName: string,
  recordId: string,
  limit = 50,
): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("recent_activity")
    .select("*")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
