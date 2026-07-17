import "server-only";

import {
  getCashDistribution,
  getDashboardTotals,
  getEventStatistics,
  getGiftTypeDistribution,
  getGiftsByYear,
  getTopContributors,
} from "@/features/analytics/api/analytics-repository";
import type { DashboardFilters } from "@/features/analytics/types";
import { getEvent } from "@/features/events/api/events-repository";
import { listGifts } from "@/features/gifts/api/gifts-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const REPORT_TYPES = ["event", "contributor", "cash", "gift_type", "yearly"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_FORMATS = ["csv", "xlsx", "pdf"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

/**
 * A report, in the one shape every exporter renders from.
 *
 * CSV, Excel and PDF differ only in how they draw a title and a grid of cells.
 * Modelling the report as data — a title, some summary pairs, some tables —
 * means the numbers are computed once and the three formats cannot disagree
 * about them. A per-format query would be three chances to filter differently.
 */
export interface ReportTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface ReportDocument {
  title: string;
  subtitle?: string;
  generatedAt: string;
  /** Label/value pairs shown above the tables. */
  summary: { label: string; value: string }[];
  tables: ReportTable[];
}

/** Formats money for a report cell, per currency. Never blended. */
function money(amount: number, code: string): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ${code}`;
}

function today(): string {
  return new Date().toISOString();
}

/**
 * Builds the requested report against live data.
 *
 * Runs entirely on the server, and RLS applies to every query underneath: a
 * report cannot contain a row its requester was not allowed to read, even
 * though the export endpoint separately requires a Super Admin.
 */
export async function buildReport(
  type: ReportType,
  filters: DashboardFilters,
  labels: ReportLabels,
): Promise<ReportDocument> {
  const supabase = createSupabaseServerClient();

  switch (type) {
    case "event":
      return buildEventReport(supabase, filters, labels);
    case "contributor":
      return buildContributorReport(supabase, filters, labels);
    case "cash":
      return buildCashReport(supabase, filters, labels);
    case "gift_type":
      return buildGiftTypeReport(supabase, filters, labels);
    case "yearly":
      return buildYearlyReport(supabase, filters, labels);
  }
}

/**
 * Report copy, resolved by the caller from the requester's locale.
 *
 * Passed in rather than translated here: this module runs in a route handler
 * where there is no React context, and hardcoding English would hand an Uzbek
 * family an English report of their own wedding.
 */
export interface ReportLabels {
  appName: string;
  generatedAt: string;
  filtered: string;
  reportTitles: Record<ReportType, string>;
  summary: Record<string, string>;
  columns: Record<string, string>;
  tableTitles: Record<string, string>;
}

type Client = ReturnType<typeof createSupabaseServerClient>;

async function buildEventReport(
  supabase: Client,
  filters: DashboardFilters,
  labels: ReportLabels,
): Promise<ReportDocument> {
  // An event report needs an event. Without one the request is malformed, and
  // silently exporting "all events" instead would hand back a different
  // document than the one that was asked for.
  if (!filters.eventId) {
    throw new Error("event report requires an eventId");
  }

  const [event, stats, gifts] = await Promise.all([
    getEvent(supabase, filters.eventId),
    getEventStatistics(supabase, filters.eventId),
    listGifts(supabase, { eventId: filters.eventId, sort: "newest" }, { limit: 1000 }),
  ]);

  if (!event) throw new Error("event not found");

  return {
    title: labels.reportTitles.event,
    subtitle: event.title ?? undefined,
    generatedAt: today(),
    summary: [
      { label: labels.summary.event, value: event.title ?? "" },
      { label: labels.summary.couple, value: [event.bride_name, event.groom_name].filter(Boolean).join(" & ") },
      { label: labels.summary.date, value: event.event_date ?? String(event.event_year ?? "") },
      { label: labels.summary.location, value: event.location ?? "" },
      { label: labels.summary.totalGifts, value: String(stats.totalGifts) },
      { label: labels.summary.totalContributors, value: String(stats.totalContributors) },
      ...stats.cashTotals.map((cash) => ({
        label: `${labels.summary.cash} (${cash.currency_code})`,
        value: money(cash.total_amount, cash.currency_code),
      })),
      { label: labels.summary.gold, value: `${stats.goldWeight}` },
      { label: labels.summary.livestock, value: String(stats.livestockCount) },
      { label: labels.summary.products, value: String(stats.productsCount) },
      { label: labels.summary.mostCommon, value: stats.mostCommonType ?? "—" },
    ],
    tables: [
      {
        title: labels.tableTitles.gifts,
        columns: [
          labels.columns.giver,
          labels.columns.giftType,
          labels.columns.amount,
          labels.columns.weight,
          labels.columns.description,
          labels.columns.giftDate,
        ],
        rows: gifts.items.map((gift) => [
          gift.giver_name,
          gift.gift_type?.name ?? "",
          gift.amount !== null && gift.currency ? money(Number(gift.amount), gift.currency.code) : "",
          gift.weight !== null ? `${gift.weight} ${gift.unit ?? ""}`.trim() : "",
          gift.description ?? "",
          gift.gift_date,
        ]),
      },
    ],
  };
}

async function buildContributorReport(
  supabase: Client,
  filters: DashboardFilters,
  labels: ReportLabels,
): Promise<ReportDocument> {
  // 500, not 10: the dashboard panel shows a top ten, but a report is what
  // someone opens to look a name up in.
  const contributors = await getTopContributors(supabase, filters, 500);

  return {
    title: labels.reportTitles.contributor,
    generatedAt: today(),
    summary: [{ label: labels.summary.totalContributors, value: String(contributors.length) }],
    tables: [
      {
        title: labels.tableTitles.contributors,
        columns: [
          labels.columns.rank,
          labels.columns.giver,
          labels.columns.giftCount,
          labels.columns.events,
          labels.columns.cash,
          labels.columns.lastGift,
        ],
        rows: contributors.map((contributor, index) => [
          index + 1,
          contributor.giverName,
          contributor.giftCount,
          contributor.eventCount,
          contributor.cashTotals.map((cash) => money(cash.total_amount, cash.currency_code)).join(", "),
          contributor.lastGiftDate ?? "",
        ]),
      },
    ],
  };
}

async function buildCashReport(
  supabase: Client,
  filters: DashboardFilters,
  labels: ReportLabels,
): Promise<ReportDocument> {
  const [distribution, totals] = await Promise.all([
    getCashDistribution(supabase, filters),
    getDashboardTotals(supabase, filters),
  ]);

  return {
    title: labels.reportTitles.cash,
    generatedAt: today(),
    summary: totals.cashTotals.map((cash) => ({
      label: `${labels.summary.cash} (${cash.currency_code})`,
      value: money(cash.total_amount, cash.currency_code),
    })),
    tables: [
      {
        title: labels.tableTitles.cash,
        // No "share of value" column: that would need an exchange rate this
        // app deliberately does not have. The share is of record counts.
        columns: [labels.columns.currency, labels.columns.total, labels.columns.giftCount, labels.columns.countShare],
        rows: distribution.map((row) => [
          row.code,
          money(row.totalAmount, row.code),
          row.giftCount,
          `${row.countSharePct}%`,
        ]),
      },
    ],
  };
}

async function buildGiftTypeReport(
  supabase: Client,
  filters: DashboardFilters,
  labels: ReportLabels,
): Promise<ReportDocument> {
  const distribution = await getGiftTypeDistribution(supabase, filters);

  return {
    title: labels.reportTitles.gift_type,
    generatedAt: today(),
    summary: [
      { label: labels.summary.totalGifts, value: String(distribution.reduce((sum, row) => sum + row.giftCount, 0)) },
    ],
    tables: [
      {
        title: labels.tableTitles.giftTypes,
        columns: [
          labels.columns.giftType,
          labels.columns.category,
          labels.columns.giftCount,
          labels.columns.share,
          labels.columns.totalWeight,
        ],
        rows: distribution.map((row) => [
          row.name,
          row.category,
          row.giftCount,
          `${row.sharePct}%`,
          row.totalWeight ?? "",
        ]),
      },
    ],
  };
}

async function buildYearlyReport(
  supabase: Client,
  filters: DashboardFilters,
  labels: ReportLabels,
): Promise<ReportDocument> {
  const [byYear, totals] = await Promise.all([
    getGiftsByYear(supabase, filters),
    getDashboardTotals(supabase, filters),
  ]);

  return {
    title: labels.reportTitles.yearly,
    generatedAt: today(),
    summary: [
      { label: labels.summary.totalEvents, value: String(totals.totalEvents) },
      { label: labels.summary.totalGifts, value: String(totals.totalGifts) },
      { label: labels.summary.totalContributors, value: String(totals.totalContributors) },
    ],
    tables: [
      {
        title: labels.tableTitles.yearly,
        columns: [labels.columns.year, labels.columns.giftCount, labels.columns.contributors],
        rows: byYear.map((row) => [row.bucket, row.giftCount, row.contributors]),
      },
    ],
  };
}
