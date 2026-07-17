"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/features/auth/api/permissions";
import { demoEvents, demoGifts } from "@/features/demo/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok, toAppError, type ActionResult } from "@/shared/lib/errors";
import { isLocalDemoMode } from "@/shared/lib/local-demo";
import { getRequestContext } from "@/shared/lib/request-context";

const restoreSchema = z.object({
  auditId: z.string().uuid(),
  tableName: z.enum(["events", "gifts"]),
  reason: z.string().optional(),
});

export async function restoreVersionAction(input: unknown): Promise<ActionResult<unknown>> {
  const parsed = restoreSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok(parsed.data.tableName === "events" ? demoEvents[0] : demoGifts[0]);

  const supabase = createSupabaseServerClient();
  const context = await getRequestContext(parsed.data.reason);
  const { data, error } =
    parsed.data.tableName === "events"
      ? await supabase.rpc("restore_event_version", { p_audit_id: parsed.data.auditId, ...context })
      : await supabase.rpc("restore_gift_version", { p_audit_id: parsed.data.auditId, ...context });
  if (error) return { ok: false, error: toAppError(error) };

  revalidatePath("/admin/audit");
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return ok(data);
}
