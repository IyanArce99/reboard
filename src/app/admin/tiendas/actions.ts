"use server";

// Tiendas y escuelas. requireAdminAction() + zod + sesión del administrador (RLS is_admin y
// privilegios por columna; sin service role). El estado se cambia solo con admin_set_shop_status,
// que audita con el motivo. Solo se exportan acciones.

import { updateTag } from "next/cache";
import type { FormResult } from "@/components/admin/catalog/ActionForm";
import { SHOP_STATUSES, firstIssue, idSchema, reasonSchema, shopFromForm, type ShopStatus } from "@/components/admin/catalog/schema";
import { adminErrorText, requireAdminAction, type AdminActionResult } from "@/lib/admin/auth";

const bad = (message: string) => ({ ok: false as const, message });

function touchShops() {
  updateTag("shops");
  updateTag("listings"); // las fichas muestran el enlace a la tienda del vendedor
}

export async function createShop(fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const v = shopFromForm(fd);
  if (!v.success) return bad(firstIssue(v.error));
  // Entra como pendiente (valor por defecto de la base de datos): se publica al aprobarla.
  const { data, error } = await ctx.sb.from("shops").insert(v.data).select("id").single();
  if (error || !data) return bad(/foreign key|23503/i.test(`${error?.message} ${error?.code}`) ? "Esa zona no existe." : adminErrorText(error));
  touchShops();
  return { ok: true, message: `«${v.data.name}» creada como pendiente.`, href: `/admin/tiendas/${data.id}` };
}

export async function updateShop(id: number, fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const sid = idSchema.safeParse(id);
  const v = shopFromForm(fd);
  if (!sid.success) return bad("Petición no válida.");
  if (!v.success) return bad(firstIssue(v.error));
  const { data, error } = await ctx.sb.from("shops").update(v.data).eq("id", sid.data).select("id");
  if (error) return bad(/foreign key|23503/i.test(`${error.message} ${error.code}`) ? "Esa zona no existe." : adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchShops();
  return { ok: true, message: "Datos guardados." };
}

const STATUS_DONE: Record<ShopStatus, string> = {
  pending: "Vuelve a estar pendiente.",
  approved: "Aprobada: ya es pública.",
  rejected: "Rechazada.",
  suspended: "Suspendida: ya no es pública.",
};

/** Firma de AdminAction (motivo, opción). Rechazar y suspender exigen motivo (también en la base de datos). */
export async function setShopStatus(id: number, status: ShopStatus, reason: string): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const sid = idSchema.safeParse(id);
  const r = reasonSchema.safeParse(reason ?? "");
  if (!sid.success || !SHOP_STATUSES.includes(status) || !r.success) return bad("Petición no válida.");
  if ((status === "rejected" || status === "suspended") && r.data.length < 3)
    return bad("Indica el motivo (al menos 3 caracteres): queda en la auditoría.");
  const { error } = await ctx.sb.rpc("admin_set_shop_status", { p_shop: sid.data, p_status: status, p_reason: r.data });
  if (error) return bad(adminErrorText(error));
  touchShops();
  return { ok: true, message: STATUS_DONE[status] };
}
