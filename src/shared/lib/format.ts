import type { CurrencyRow } from "@/features/reference-data";

/**
 * Locale-aware formatting. next-intl handles UI strings; these handle the
 * numbers and dates around them, which are just as locale-specific — a Uzbek
 * reader expects 500 000 where an English one expects 500,000.
 */

/**
 * Formats a gift amount with its currency.
 *
 * Deliberately not Intl.NumberFormat's `style: "currency"`: that renders UZS
 * as "UZS 500,000" with no way to prefer the local "so'm", and currencies here
 * are database rows a Super Admin can add — including ones with no ISO code at
 * all. The symbol comes from the row; only the number goes through Intl.
 *
 * Amounts are never summed across currencies anywhere in this app. Each figure
 * is labelled with the currency it is in, because a total mixing UZS and USD
 * is not a number, it is a mistake.
 */
export function formatAmount(
  amount: number | string | null | undefined,
  currency: Pick<CurrencyRow, "code" | "symbol"> | null | undefined,
  locale: string,
): string {
  if (amount === null || amount === undefined) return "—";

  // numeric(18,2) arrives as a string from PostgREST: JS numbers cannot hold
  // every value a Postgres numeric can, so the driver refuses to lose
  // precision silently.
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    // Whole som is the norm; cents matter for USD/EUR. Following the value
    // rather than the currency keeps "500 000" from becoming "500 000.00".
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

  if (!currency) return formatted;
  return currency.symbol ? `${formatted} ${currency.symbol}` : `${formatted} ${currency.code}`;
}

/** A weight with its unit, e.g. "120 kg". The unit is free text by design. */
export function formatWeight(
  weight: number | string | null | undefined,
  unit: string | null | undefined,
  locale: string,
): string {
  if (weight === null || weight === undefined) return "—";

  const value = typeof weight === "string" ? Number(weight) : weight;
  if (Number.isNaN(value)) return "—";

  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * A wedding's date. Falls back to the bare year when there is no full date —
 * the common case for records transcribed from a paper notebook, where only
 * the year was ever written down.
 */
export function formatEventDate(date: string | null | undefined, year: number, locale: string): string {
  if (!date) return String(year);

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(year);

  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

export function formatDate(date: string | null | undefined, locale: string): string {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

/** "2 hours ago" — for audit trails and "last updated" lines. */
export function formatRelativeTime(date: string | null | undefined, locale: string): string {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  const seconds = Math.round((parsed.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = seconds;
  for (const [amount, unit] of divisions) {
    if (Math.abs(value) < amount) return formatter.format(Math.round(value), unit);
    value /= amount;
  }
  return formatter.format(Math.round(value), "year");
}

/** Initials for an avatar fallback, from whatever parts of a name we have. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}
