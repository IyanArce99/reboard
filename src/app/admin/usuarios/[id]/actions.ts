"use server";

// Acciones sobre cuentas (docs/ADMIN.md). Este archivo solo exporta Server Actions: todo lo que exporta
// es invocable desde el cliente. Cada acción vuelve a comprobar el permiso (requireAdminAction), valida
// la entrada con zod y llama a la función de la base de datos con la sesión del administrador, que
// vuelve a comprobar is_admin() y escribe la auditoría. El service role solo se usa después, para la
// API de Auth (bloquear o desbloquear el acceso) y para registrar ese paso en la auditoría.

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminErrorText, requireAdminAction, type AdminActionResult } from "@/lib/admin/auth";
import { UUID_RE } from "@/components/admin/users/format";
import { createServiceClient } from "@/lib/supabase/service";

const UserId = z.string().regex(UUID_RE);
const Reason = z.string().trim().min(3).max(1000);
const Role = z.enum(["user", "moderator", "admin"]);

const INVALID: AdminActionResult = { ok: false, message: "Petición no válida." };
const REASON_REQUIRED: AdminActionResult = { ok: false, message: "Indica el motivo (al menos 3 caracteres): queda en la auditoría." };

/** ~100 años: la API de Auth no tiene «indefinido». "none" lo levanta. */
const BAN_FOREVER = "876000h";

async function setAuthBan(actorId: string, userId: string, banned: boolean) {
  try {
    const svc = createServiceClient();
    const { error } = await svc.auth.admin.updateUserById(userId, { ban_duration: banned ? BAN_FOREVER : "none" });
    const action = banned ? "ban" : "unban";
    const { error: logError } = await svc.rpc("admin_log", {
      p_actor: actorId,
      p_action: error ? `${action}_failed` : action,
      p_entity_type: "user",
      p_entity_id: userId,
      p_reason: "", // admin_log lo guarda como null; el motivo ya está en la fila de suspender/reactivar
      p_before: null,
      p_after: null,
    });
    if (logError) console.error("[admin] auditoría de", action, logError.message);
    if (error) {
      console.error("[admin] Auth", action, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[admin] Auth", banned ? "ban" : "unban", e);
    return false;
  }
}

export async function suspendUser(userId: string, reason: string, hideListings: boolean): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const id = UserId.safeParse(userId);
  const why = Reason.safeParse(reason);
  const hide = z.boolean().safeParse(hideListings);
  if (!id.success || !hide.success) return INVALID;
  if (!why.success) return REASON_REQUIRED;

  const { data: hidden, error } = await ctx.sb.rpc("admin_suspend_user", {
    p_user: id.data,
    p_reason: why.data,
    p_hide_listings: hide.data,
  });
  if (error) return { ok: false, message: adminErrorText(error) };

  if (hidden && hidden > 0) {
    const { data: listings } = await ctx.sb.from("listings").select("public_id").eq("seller_id", id.data);
    updateTag("listings");
    for (const l of listings ?? []) if (l.public_id) updateTag(`listing:${l.public_id}`);
  }

  const banned = await setAuthBan(ctx.user.id, id.data, true);
  const hiddenText = hidden ? ` Se han ocultado ${hidden} anuncio${hidden === 1 ? "" : "s"}.` : "";
  if (!banned) {
    return {
      ok: true,
      message: `Cuenta suspendida en la base de datos (no puede publicar ni reportar), pero no se ha podido bloquear el inicio de sesión. Vuelve a intentarlo más tarde.${hiddenText}`,
    };
  }
  return { ok: true, message: `Cuenta suspendida y acceso bloqueado.${hiddenText}` };
}

export async function reactivateUser(userId: string, reason: string): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const id = UserId.safeParse(userId);
  const why = Reason.safeParse(reason);
  if (!id.success) return INVALID;
  if (!why.success) return REASON_REQUIRED;

  const { error } = await ctx.sb.rpc("admin_reactivate_user", { p_user: id.data, p_reason: why.data });
  if (error) return { ok: false, message: adminErrorText(error) };

  const unbanned = await setAuthBan(ctx.user.id, id.data, false);
  if (!unbanned) {
    return {
      ok: true,
      message: "Cuenta reactivada en la base de datos, pero no se ha podido desbloquear el inicio de sesión. Vuelve a intentarlo más tarde.",
    };
  }
  return { ok: true, message: "Cuenta reactivada. Sus anuncios ocultos siguen ocultos hasta que los restaures." };
}

export async function setUserRole(userId: string, role: string, reason: string): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const id = UserId.safeParse(userId);
  const r = Role.safeParse(role);
  const why = Reason.safeParse(reason);
  if (!id.success || !r.success) return INVALID;
  if (!why.success) return REASON_REQUIRED;
  if (id.data === ctx.user.id) return { ok: false, message: adminErrorText({ message: "own_role" }) };

  const { error } = await ctx.sb.rpc("admin_set_role", { p_user: id.data, p_role: r.data, p_reason: why.data });
  if (error) return { ok: false, message: adminErrorText(error) };
  return { ok: true, message: "Rol actualizado." };
}
