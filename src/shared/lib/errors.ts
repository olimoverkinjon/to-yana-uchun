/**
 * One vocabulary for "why did that write fail", shared by server actions and
 * the client.
 *
 * Postgres reports failures as SQLSTATE codes, and a raw
 * `new row violates row-level security policy for table "events"` is both
 * frightening and useless to someone recording gifts at a wedding. These
 * codes are translated in the UI (see the `errors.*` message namespace), so
 * nothing here is user-facing text.
 */
export type AppErrorCode =
  /** RLS or a role check rejected the write. */
  | "forbidden"
  /** No session, or the session no longer resolves to a profile. */
  | "unauthenticated"
  /** The row does not exist, or RLS hides it — indistinguishable on purpose. */
  | "not_found"
  /** A constraint or the gift-type trigger rejected the shape of the data. */
  | "validation"
  /** A uniqueness constraint was violated. */
  | "conflict"
  /** Anything unclassified. */
  | "unknown";

export interface AppError {
  code: AppErrorCode;
  /** For logs and debugging — never rendered verbatim. */
  detail?: string;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

/** SQLSTATEs we can say something specific about. */
const SQLSTATE: Record<string, AppErrorCode> = {
  // insufficient_privilege — RLS rejected the statement outright.
  "42501": "forbidden",
  // PL/pgSQL's no_data_found — our RPCs raise this when an UPDATE matches no
  // rows, which happens both when the row is genuinely gone and when RLS hid
  // it. Reported as not_found either way: distinguishing them would leak the
  // existence of records the caller may not know about.
  P0002: "not_found",
  // check_violation / not_null_violation / raise_exception. The last is what
  // validate_gift_fields uses to enforce a gift type's required fields.
  "23514": "validation",
  "23502": "validation",
  P0001: "validation",
  // foreign_key_violation — e.g. a gift_type_id that does not exist.
  "23503": "validation",
  "23505": "conflict",
};

interface PostgrestLike {
  code?: string | null;
  message?: string | null;
}

/**
 * Narrows an unknown thrown value (or a PostgrestError) to an AppError.
 * Everything unrecognised becomes "unknown" rather than leaking a database
 * message to the client.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  const candidate = error as PostgrestLike | null;
  const code = candidate?.code ?? undefined;
  const detail = candidate?.message ?? (error instanceof Error ? error.message : undefined);

  if (code && SQLSTATE[code]) {
    return { code: SQLSTATE[code], detail };
  }

  return { code: "unknown", detail };
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) return false;
  const code = (value as AppError).code;
  return (
    code === "forbidden" ||
    code === "unauthenticated" ||
    code === "not_found" ||
    code === "validation" ||
    code === "conflict" ||
    code === "unknown"
  );
}

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (code: AppErrorCode, detail?: string): ActionResult<never> => ({
  ok: false,
  error: { code, detail },
});
