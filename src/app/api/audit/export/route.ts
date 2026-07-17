import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/features/auth/api/permissions";
import { listAuditLogs } from "@/features/audit/api/audit-repository";
import type { AuditFilters } from "@/features/audit/types";
import type { ReportDocument } from "@/features/reports/api/report-data";
import { renderCsv, renderPdf, renderXlsx } from "@/features/reports/api/renderers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders, rateLimitKey } from "@/shared/lib/rate-limit";

const querySchema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
  search: z.string().optional(),
  action: z.string().optional(),
  table: z.string().optional(),
  severity: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const CONTENT_TYPE = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export async function GET(request: Request) {
  const limited = rateLimit(rateLimitKey(request, "audit:export"), 10, 60 * 1000);
  if (!limited.ok)
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(limited) });

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const denied = await requireSuperAdmin();
  if (denied)
    return NextResponse.json({ error: denied.code }, { status: denied.code === "unauthenticated" ? 401 : 403 });

  const { format, ...filters } = parsed.data;
  const page = await listAuditLogs(createSupabaseServerClient(), filters as AuditFilters, null, 1000);
  const report: ReportDocument = {
    title: "Audit Log Export",
    subtitle: "Immutable enterprise audit history",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Rows", value: String(page.items.length) },
      { label: "Filters", value: JSON.stringify(filters) },
    ],
    tables: [
      {
        title: "Audit Logs",
        columns: ["Time", "Action", "Table", "Record", "Actor", "Telegram ID", "Severity", "Reason", "Event", "Gift"],
        rows: page.items.map((item) => [
          item.created_at,
          item.action,
          item.table_name,
          item.record_id,
          [item.actor_first_name, item.actor_last_name].filter(Boolean).join(" ") || item.actor_username || "",
          item.telegram_user_id ?? "",
          item.severity,
          item.reason ?? "",
          item.event_title ?? item.related_event_id ?? "",
          item.gift_giver_name ?? item.related_gift_id ?? "",
        ]),
      },
    ],
  };

  const body =
    format === "csv"
      ? renderCsv(report)
      : format === "xlsx"
        ? await renderXlsx(report)
        : await renderPdf(report, "Wedding Registry");

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": CONTENT_TYPE[format],
      "Content-Disposition": `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
