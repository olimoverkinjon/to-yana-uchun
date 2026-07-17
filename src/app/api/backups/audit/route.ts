import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/features/auth/api/permissions";
import { listAuditLogs } from "@/features/audit/api/audit-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders, rateLimitKey } from "@/shared/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(rateLimitKey(request, "backups:audit"), 5, 60 * 1000);
  if (!limited.ok)
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(limited) });

  const denied = await requireSuperAdmin();
  if (denied)
    return NextResponse.json({ error: denied.code }, { status: denied.code === "unauthenticated" ? 401 : 403 });

  const supabase = createSupabaseServerClient();
  const [audit, settings, systemLogs] = await Promise.all([
    listAuditLogs(supabase, {}, null, 5000),
    supabase.from("settings").select("*").order("key", { ascending: true }),
    supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(1000),
  ]);

  if (settings.error) return NextResponse.json({ error: "settings_backup_failed" }, { status: 500 });
  if (systemLogs.error) return NextResponse.json({ error: "system_logs_backup_failed" }, { status: 500 });

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      kind: "audit-settings-system-backup",
      auditLogs: audit.items,
      settings: settings.data ?? [],
      systemLogs: systemLogs.data ?? [],
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="audit-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
