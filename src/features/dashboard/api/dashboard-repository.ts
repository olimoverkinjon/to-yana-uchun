import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { CashByCurrency, DashboardStats } from "../types";

type Client = SupabaseClient<Database>;

/** Shape of the jsonb the dashboard_stats view aggregates cash totals into. */
interface CashTotalJson {
  currency_code: string;
  currency_symbol: string | null;
  total_amount: number | string;
}

/**
 * Reads the dashboard_stats view — one round trip for every headline figure.
 *
 * The view is security_invoker, so these counts are already scoped to whatever
 * the caller is allowed to see: a user with no role granted gets zeros, not an
 * error and not someone else's totals.
 */
export async function getDashboardStats(supabase: Client): Promise<DashboardStats> {
  const { data, error } = await supabase.from("dashboard_stats").select("*").maybeSingle();
  if (error) throw error;

  return {
    totalEvents: data?.total_events ?? 0,
    totalGifts: data?.total_gifts ?? 0,
    totalGuests: data?.total_guests ?? 0,
    totalCashByCurrency: parseCashTotals(data?.cash_totals),
  };
}

/**
 * The view builds cash_totals with jsonb_agg, so it arrives as untyped Json.
 * Amounts come through as strings — a Postgres numeric can hold values a JS
 * number cannot, so the driver refuses to round them silently. Parsing here
 * keeps that detail out of every component that renders a total.
 */
function parseCashTotals(value: unknown): CashByCurrency[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is CashTotalJson => typeof entry === "object" && entry !== null && "currency_code" in entry)
    .map((entry) => ({
      currency: entry.currency_code,
      symbol: entry.currency_symbol,
      amount: Number(entry.total_amount),
    }))
    .filter((entry) => !Number.isNaN(entry.amount));
}
