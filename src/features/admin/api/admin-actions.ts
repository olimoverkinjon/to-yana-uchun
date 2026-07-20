"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/features/auth/api/permissions";
import { demoAttachments, demoSettings, demoUsers } from "@/features/demo/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { fail, ok, toAppError, type ActionResult } from "@/shared/lib/errors";
import { isLocalDemoMode } from "@/shared/lib/local-demo";
import { getRequestContext } from "@/shared/lib/request-context";

import type { AttachmentRow, ProfileRow, SettingRow } from "../types";

const userDisabledSchema = z.object({
  userId: z.string().uuid(),
  disabled: z.boolean(),
  reason: z.string().max(500).optional(),
});

const userRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  description: z.string().max(500).optional(),
  reason: z.string().max(500).optional(),
});

const attachmentSchema = z.object({
  attachmentId: z.string().uuid(),
  deleted: z.boolean(),
  reason: z.string().max(500).optional(),
});

type RpcResult<T> = Promise<{ data: T | null; error: unknown }>;

function adminRpc<T>(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  name: string,
  args: Record<string, unknown>,
): RpcResult<T> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => RpcResult<T>;
  return rpc(name, args);
}

async function context(reason?: string) {
  const meta = await getRequestContext(reason);
  return {
    p_reason: meta.p_reason,
    p_ip_address: meta.p_ip_address,
    p_user_agent: meta.p_user_agent,
    p_browser: meta.p_browser,
    p_os: meta.p_os,
  };
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/files");
  revalidatePath("/admin/system");
}

export async function setUserDisabledAction(input: unknown): Promise<ActionResult<ProfileRow>> {
  const parsed = userDisabledSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode())
    return ok({
      ...demoUsers[0],
      id: parsed.data.userId,
      deleted_at: parsed.data.disabled ? new Date().toISOString() : null,
    });

  const supabase = createSupabaseServerClient();
  const { data, error } = await adminRpc<ProfileRow>(supabase, "admin_set_user_disabled", {
    p_user_id: parsed.data.userId,
    p_disabled: parsed.data.disabled,
    ...(await context(parsed.data.reason)),
  });

  if (error || !data) return { ok: false, error: toAppError(error) };
  revalidateAdmin();
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return ok(data);
}

export async function setUserRoleAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = userRoleSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok(null);

  const supabase = createSupabaseServerClient();
  const { error } = await adminRpc<null>(supabase, "admin_set_user_role", {
    p_user_id: parsed.data.userId,
    p_role_id: parsed.data.roleId,
    ...(await context(parsed.data.reason)),
  });

  if (error) return { ok: false, error: toAppError(error) };
  revalidateAdmin();
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return ok(null);
}

export async function updateSettingAction(input: unknown): Promise<ActionResult<SettingRow>> {
  const parsed = settingSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode()) return ok({ ...demoSettings[0], key: parsed.data.key, value: parsed.data.value as Json });

  const supabase = createSupabaseServerClient();
  const { data, error } = await adminRpc<SettingRow>(supabase, "admin_update_setting", {
    p_key: parsed.data.key,
    p_value: parsed.data.value,
    p_description: parsed.data.description,
    ...(await context(parsed.data.reason)),
  });

  if (error || !data) return { ok: false, error: toAppError(error) };
  revalidateAdmin();
  return ok(data);
}

export async function setAttachmentDeletedAction(input: unknown): Promise<ActionResult<AttachmentRow>> {
  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success) return fail("validation", parsed.error.message);

  const denied = await requireSuperAdmin();
  if (denied) return { ok: false, error: denied };
  if (isLocalDemoMode())
    return ok({
      ...demoAttachments[0],
      id: parsed.data.attachmentId,
      deleted_at: parsed.data.deleted ? new Date().toISOString() : null,
    });

  const supabase = createSupabaseServerClient();
  const { data, error } = await adminRpc<AttachmentRow>(supabase, "admin_set_attachment_deleted", {
    p_attachment_id: parsed.data.attachmentId,
    p_deleted: parsed.data.deleted,
    ...(await context(parsed.data.reason)),
  });

  if (error || !data) return { ok: false, error: toAppError(error) };
  revalidateAdmin();
  return ok(data);
}
