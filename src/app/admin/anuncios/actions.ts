"use server";

// Acciones del panel sobre anuncios. Este archivo solo exporta Server Actions (todo lo que exporta es
// invocable desde el cliente). Cada una vuelve a comprobar la sesión de admin, valida la entrada con zod
// y llama a una función de la base de datos con el cliente de la SESIÓN (sin service role): la base de
// datos comprueba otra vez el permiso y escribe la auditoría en la misma transacción.

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminErrorText, requireAdminAction, type AdminActionResult } from "@/lib/admin/auth";
import { moderate } from "@/lib/moderation/service";

const PublicId = z.string().regex(/^a\d{1,15}$/);
const Reason = z
  .string()
  .max(1000)
  .transform((v) => v.trim());

const MODERATE = z.object({
  publicId: PublicId,
  action: z.enum(["hide", "remove", "restore", "mark_sold", "dismiss_reports", "resolve_reports"]),
  reason: Reason,
});

const DONE: Record<z.infer<typeof MODERATE>["action"], string> = {
  hide: "Anuncio oculto temporalmente.",
  remove: "Anuncio retirado por incumplimiento.",
  restore: "Anuncio restaurado: vuelve a ser visible.",
  mark_sold: "Anuncio marcado como vendido.",
  dismiss_reports: "Reportes descartados.",
  resolve_reports: "Reportes marcados como resueltos.",
};

function refresh(publicId: string) {
  updateTag("listings");
  updateTag(`listing:${publicId}`);
}

/** Pensada para AdminAction: `moderateListingAction.bind(null, publicId, action)`. */
export async function moderateListingAction(publicId: string, action: string, reason: string): Promise<AdminActionResult> {
  const a = MODERATE.safeParse({ publicId, action, reason });
  if (!a.success) return { ok: false, message: "Petición no válida." };
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  if (["hide", "remove", "mark_sold"].includes(a.data.action) && a.data.reason.length < 3) {
    return { ok: false, message: "Indica el motivo (al menos 3 caracteres): queda en la auditoría." };
  }
  const error = await moderate(ctx.sb, a.data.publicId, a.data.action, a.data.reason || null);
  if (error) return { ok: false, message: adminErrorText(error) };
  refresh(a.data.publicId);
  return { ok: true, message: DONE[a.data.action] };
}

const opt = (max: number) => z.string().max(max).optional();
const PATCH = z
  .object({
    description: opt(2000),
    repairs: opt(600),
    town: z.string().trim().min(2, "town").max(80).optional(),
    fins: opt(60),
    accessories: opt(120),
    brand_text: opt(60),
    model_text: opt(60),
  })
  .strict();

const UPDATE = z.object({ publicId: PublicId, patch: PATCH, reason: Reason });

/** Corrige textos de un anuncio. Las medidas no se editan desde aquí (son del vendedor). */
export async function updateListingTextsAction(
  publicId: string,
  patch: Record<string, string>,
  reason: string,
): Promise<AdminActionResult> {
  const a = UPDATE.safeParse({ publicId, patch, reason });
  if (!a.success) {
    const town = a.error.issues.some((i) => i.path.includes("town"));
    return {
      ok: false,
      message: town ? "El municipio debe tener entre 2 y 80 caracteres." : "Revisa los campos: alguno es demasiado largo o no se puede editar.",
    };
  }
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  if (a.data.reason.length < 3) return { ok: false, message: "Indica el motivo (al menos 3 caracteres): queda en la auditoría." };
  const clean = Object.fromEntries(Object.entries(a.data.patch).map(([k, v]) => [k, (v ?? "").trim()]));
  if (!Object.keys(clean).length) return { ok: false, message: "No hay cambios que guardar." };
  const { error } = await ctx.sb.rpc("admin_update_listing", { p_public_id: a.data.publicId, p_patch: clean, p_reason: a.data.reason });
  if (error) return { ok: false, message: adminErrorText(error) };
  refresh(a.data.publicId);
  return { ok: true, message: "Textos actualizados." };
}
