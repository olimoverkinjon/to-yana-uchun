"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/features/auth/api/permissions";
import { demoEventRow } from "@/features/demo/demo-data";
import { nullableArg } from "@/lib/supabase/rpc-args";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, toAppError, type ActionResult } from "@/shared/lib/errors";
import { isLocalDemoMode } from "@/shared/lib/local-demo";
import { getRequestContext } from "@/shared/lib/request-context";

import {
  createEventInputSchema,
  eventIdInputSchema,
  setEventStatusInputSchema,
  updateEventInputSchema,
} from "../schemas/event-schema";
import type { EventRow } from "../types";

/**
 * Every Event mutation. Each one is the *second* of three checks, not the
 * only one:
 *
 *   1. the UI hides controls a Viewer cannot use (a courtesy),
 *   2. requireSuperAdmin() here rejects early with a clean error,
 *   3. RLS in Postgres actually enforces it, and would reject the write even
 *      if 1 and 2 were both removed.
 *
 * They call mutation RPCs rather than writing to the tables directly, so the
 * request context (IP / user agent / reason) reaches the audit trigger inside
 * the same transaction as the write — see the mutation RPC migration for why
 * that cannot be two round trips.
 */

function revalidateEvent(id?: string) {
  revalidatePath("/events");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/events/${id}`);
}

export async function createEventAction(input: unknown): Promise<ActionResult<EventRow>> {
  const parsed = createEventInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok(demoEventRow);

  const { values, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  // No .single(): create_event returns `public.events`, a composite, so
  // PostgREST already hands back one object rather than a result set.
  const { data, error } = await supabase.rpc("create_event", {
    p_title: values.title,
    p_event_year: values.eventYear,
    p_description: values.description ?? undefined,
    p_bride_name: values.brideName ?? undefined,
    p_groom_name: values.groomName ?? undefined,
    p_event_date: values.eventDate ?? undefined,
    p_location: values.location ?? undefined,
    p_cover_image: values.coverImage ?? undefined,
    p_status: values.status,
    ...context,
  });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateEvent(data.id);
  return ok(data as EventRow);
}

export async function updateEventAction(input: unknown): Promise<ActionResult<EventRow>> {
  const parsed = updateEventInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok({ ...demoEventRow, id: parsed.data.id });

  const { id, values, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  // A full replace, matching update_event's PUT semantics: `null` here means
  // "clear this field", which is why every value is passed explicitly rather
  // than omitted when empty.
  const { data, error } = await supabase.rpc("update_event", {
    p_id: id,
    p_title: values.title,
    p_event_year: values.eventYear,
    p_description: nullableArg(values.description),
    p_bride_name: nullableArg(values.brideName),
    p_groom_name: nullableArg(values.groomName),
    p_event_date: nullableArg(values.eventDate),
    p_location: nullableArg(values.location),
    p_cover_image: nullableArg(values.coverImage),
    p_status: values.status,
    ...context,
  });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateEvent(id);
  return ok(data as EventRow);
}

export async function setEventStatusAction(input: unknown): Promise<ActionResult<EventRow>> {
  const parsed = setEventStatusInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok({ ...demoEventRow, id: parsed.data.id, status: parsed.data.status });

  const { id, status, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  const { data, error } = await supabase.rpc("set_event_status", { p_id: id, p_status: status, ...context });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateEvent(id);
  return ok(data as EventRow);
}

export async function deleteEventAction(input: unknown): Promise<ActionResult<EventRow>> {
  const parsed = eventIdInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok({ ...demoEventRow, id: parsed.data.id, deleted_at: new Date().toISOString() });

  const { id, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  // Soft delete — the row and its whole audit history stay. There is no hard
  // delete anywhere in this app by design.
  const { data, error } = await supabase.rpc("soft_delete_event", { p_id: id, ...context });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateEvent(id);
  return ok(data as EventRow);
}

export async function restoreEventAction(input: unknown): Promise<ActionResult<EventRow>> {
  const parsed = eventIdInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok({ ...demoEventRow, id: parsed.data.id, deleted_at: null });

  const { id, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  const { data, error } = await supabase.rpc("restore_event", { p_id: id, ...context });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateEvent(id);
  return ok(data as EventRow);
}
