"use server";

// Configuración editable sin despliegue. requireAdminAction() + zod; la escritura va siempre por
// admin_update_setting (comprueba is_admin, valida cada clave, exige sesión MFA para obligar al MFA y
// audita con el motivo). Sin service role. Solo se exportan acciones.

import { updateTag } from "next/cache";
import type { FormResult } from "@/components/admin/catalog/ActionForm";
import { fdBool, fdText, firstIssue, reasonSchema } from "@/components/admin/catalog/schema";
import { NUMBER_SETTINGS, settingNumberSchema, siteNoticeSchema, type NumberSetting } from "@/components/admin/settings/schema";
import { adminErrorText, requireAdminAction } from "@/lib/admin/auth";
import type { Json } from "@/lib/supabase/database.types";

const bad = (message: string) => ({ ok: false as const, message });

async function save(key: string, value: Json, fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const reason = reasonSchema.safeParse(fdText(fd, "reason"));
  if (!reason.success) return bad(firstIssue(reason.error));
  const { error } = await ctx.sb.rpc("admin_update_setting", { p_key: key, p_value: value, p_reason: reason.data });
  if (error) return bad(adminErrorText(error));
  updateTag("settings");
  return { ok: true, message: "Configuración guardada." };
}

export async function updateSiteNotice(fd: FormData): Promise<FormResult> {
  const v = siteNoticeSchema.safeParse({ active: fdBool(fd, "active"), text: fdText(fd, "text"), tone: fdText(fd, "tone") });
  if (!v.success) return bad(firstIssue(v.error));
  return save("site_notice", v.data, fd);
}

export async function updateNumberSetting(key: NumberSetting, fd: FormData): Promise<FormResult> {
  if (!NUMBER_SETTINGS.includes(key)) return bad("Esa opción no existe.");
  const v = settingNumberSchema.safeParse(fdText(fd, "value"));
  if (!v.success) return bad(firstIssue(v.error));
  return save(key, v.data, fd);
}

export async function updateMfaRequired(fd: FormData): Promise<FormResult> {
  return save("admin_mfa_required", fdBool(fd, "value"), fd);
}
