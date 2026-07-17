"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/features/auth/api/permissions";
import { demoGifts } from "@/features/demo/demo-data";
import { nullableArg } from "@/lib/supabase/rpc-args";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, toAppError, type ActionResult } from "@/shared/lib/errors";
import { isLocalDemoMode } from "@/shared/lib/local-demo";
import { getRequestContext } from "@/shared/lib/request-context";

import { createGiftInputSchema, giftIdInputSchema, updateGiftInputSchema } from "../schemas/gift-schema";
import type { GiftRow } from "../types";

/**
 * Gift mutations. Same three-layer permission story as the event actions: the
 * UI hides, this rejects early, and RLS actually enforces.
 *
 * Note what is *not* validated here: whether the gift type requires an amount
 * or a weight. That rule lives in gift_types and is enforced by the
 * validate_gift_fields trigger, so it holds for every write path rather than
 * just this one. The Zod schema checks it too, for a fast, field-anchored
 * message — but the database is what makes it true.
 */

function revalidateGift(eventId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/events");
  if (eventId) revalidatePath(`/events/${eventId}`);
}

export async function createGiftAction(input: unknown): Promise<ActionResult<GiftRow>> {
  const parsed = createGiftInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok(demoGifts[0] as GiftRow);

  const { eventId, values, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  const { data, error } = await supabase.rpc("create_gift", {
    p_event_id: eventId,
    p_giver_name: values.giverName,
    p_gift_type_id: values.giftTypeId,
    p_amount: values.amount ?? undefined,
    p_currency_id: values.currencyId ?? undefined,
    p_weight: values.weight ?? undefined,
    p_unit: values.unit ?? undefined,
    p_description: values.description ?? undefined,
    p_gift_date: values.giftDate,
    p_notes: values.notes ?? undefined,
    ...context,
  });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateGift(eventId);
  return ok(data as GiftRow);
}

export async function updateGiftAction(input: unknown): Promise<ActionResult<GiftRow>> {
  const parsed = updateGiftInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok({ ...demoGifts[0], id: parsed.data.id } as GiftRow);

  const { id, values, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  // Full replace — null clears. event_id is absent because update_gift does
  // not accept it: moving a gift between weddings would rewrite the history
  // of two events at once, so it is not an edit.
  const { data, error } = await supabase.rpc("update_gift", {
    p_id: id,
    p_giver_name: values.giverName,
    p_gift_type_id: values.giftTypeId,
    p_amount: nullableArg(values.amount),
    p_currency_id: nullableArg(values.currencyId),
    p_weight: nullableArg(values.weight),
    p_unit: nullableArg(values.unit),
    p_description: nullableArg(values.description),
    p_gift_date: values.giftDate,
    p_notes: nullableArg(values.notes),
    ...context,
  });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateGift(data.event_id);
  return ok(data as GiftRow);
}

export async function deleteGiftAction(input: unknown): Promise<ActionResult<GiftRow>> {
  const parsed = giftIdInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode())
    return ok({ ...demoGifts[0], id: parsed.data.id, deleted_at: new Date().toISOString() } as GiftRow);

  const { id, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  const { data, error } = await supabase.rpc("soft_delete_gift", { p_id: id, ...context });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateGift(data.event_id);
  return ok(data as GiftRow);
}

export async function restoreGiftAction(input: unknown): Promise<ActionResult<GiftRow>> {
  const parsed = giftIdInputSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok({ ...demoGifts[0], id: parsed.data.id, deleted_at: null } as GiftRow);

  const { id, reason } = parsed.data;
  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(reason);

  const { data, error } = await supabase.rpc("restore_gift", { p_id: id, ...context });

  if (error) return { ok: false, error: toAppError(error) };

  revalidateGift(data.event_id);
  return ok(data as GiftRow);
}
