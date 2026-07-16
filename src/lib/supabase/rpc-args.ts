/**
 * Postgres function parameters carry a type but not a nullability constraint,
 * the way table columns do. So `supabase gen types` renders `p_location text`
 * as `p_location: string` even where the function is written to accept — and
 * in the case of our full-replace update_* RPCs, specifically needs — null to
 * mean "clear this field".
 *
 * Casting at each call site would work but reads as though the null were an
 * oversight. This names the reason instead.
 */
export function nullableArg<T>(value: T | null | undefined): T {
  return (value ?? null) as T;
}
