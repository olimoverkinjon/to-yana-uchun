import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/features/auth/api/permissions";
import { buildReport, REPORT_FORMATS, REPORT_TYPES, type ReportLabels } from "@/features/reports/api/report-data";
import { renderCsv, renderPdf, renderXlsx } from "@/features/reports/api/renderers";
import { rateLimit, rateLimitHeaders, rateLimitKey } from "@/shared/lib/rate-limit";

const querySchema = z.object({
  type: z.enum(REPORT_TYPES),
  format: z.enum(REPORT_FORMATS),
  year: z.coerce.number().int().optional(),
  eventId: z.string().uuid().optional(),
  giftTypeId: z.string().uuid().optional(),
  currencyId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

const CONTENT_TYPE: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

/**
 * Report export. Super Admin only, per the permission matrix — a Viewer may
 * read the ledger inside Telegram but may not walk out with a file of it.
 *
 * That check happens here, on the server, before any data is fetched. The UI
 * also hides the button, but that is a courtesy: this endpoint is reachable
 * directly, and it is what actually enforces the rule. Every query underneath
 * additionally runs through RLS, so even a Super Admin's export can only
 * contain rows they were allowed to read.
 */
export async function GET(request: Request) {
  const limited = rateLimit(rateLimitKey(request, "reports"), 10, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: rateLimitHeaders(limited) });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.message }, { status: 400 });
  }

  const denied = await requireSuperAdmin();
  if (denied) {
    return NextResponse.json({ error: denied.code }, { status: denied.code === "unauthenticated" ? 401 : 403 });
  }

  const { type, format, ...filters } = parsed.data;

  try {
    const labels = await reportLabels();
    const report = await buildReport(type, filters, labels);

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${type}-report-${stamp}.${format}`;

    const body =
      format === "csv"
        ? renderCsv(report)
        : format === "xlsx"
          ? await renderXlsx(report)
          : await renderPdf(report, labels.appName);

    return new NextResponse(body as BodyInit, {
      headers: {
        "Content-Type": CONTENT_TYPE[format],
        // `attachment` so a PDF downloads rather than opening inside
        // Telegram's webview, where it cannot be saved.
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/reports] failed to build report", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

/**
 * Resolves the report's copy in the requester's language. next-intl reads the
 * same locale cookie the UI does, so a family reading the app in Uzbek gets an
 * Uzbek report rather than an English one.
 */
async function reportLabels(): Promise<ReportLabels> {
  const t = await getTranslations("reports");
  const tCommon = await getTranslations("common");

  return {
    appName: tCommon("appName"),
    generatedAt: t("generatedAt"),
    filtered: t("filtered"),
    reportTitles: {
      event: t("titles.event"),
      contributor: t("titles.contributor"),
      cash: t("titles.cash"),
      gift_type: t("titles.giftType"),
      yearly: t("titles.yearly"),
    },
    summary: {
      event: t("summary.event"),
      couple: t("summary.couple"),
      date: t("summary.date"),
      location: t("summary.location"),
      totalEvents: t("summary.totalEvents"),
      totalGifts: t("summary.totalGifts"),
      totalContributors: t("summary.totalContributors"),
      cash: t("summary.cash"),
      gold: t("summary.gold"),
      livestock: t("summary.livestock"),
      products: t("summary.products"),
      mostCommon: t("summary.mostCommon"),
    },
    columns: {
      rank: t("columns.rank"),
      giver: t("columns.giver"),
      giftType: t("columns.giftType"),
      category: t("columns.category"),
      amount: t("columns.amount"),
      weight: t("columns.weight"),
      totalWeight: t("columns.totalWeight"),
      description: t("columns.description"),
      giftDate: t("columns.giftDate"),
      giftCount: t("columns.giftCount"),
      events: t("columns.events"),
      cash: t("columns.cash"),
      lastGift: t("columns.lastGift"),
      currency: t("columns.currency"),
      total: t("columns.total"),
      countShare: t("columns.countShare"),
      share: t("columns.share"),
      year: t("columns.year"),
      contributors: t("columns.contributors"),
    },
    tableTitles: {
      gifts: t("tables.gifts"),
      contributors: t("tables.contributors"),
      cash: t("tables.cash"),
      giftTypes: t("tables.giftTypes"),
      yearly: t("tables.yearly"),
    },
  };
}
