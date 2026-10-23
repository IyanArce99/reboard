"use server";

// Catálogo (marcas, modelos y medidas). Cada acción: requireAdminAction() (sesión y admin_status en la
// base de datos), validación con zod y escritura con la sesión del administrador (RLS is_admin y
// privilegios por columna). Sin service role. La auditoría la escriben los disparadores de la base de
// datos (antes/después); las funciones admin_* la escriben con el motivo.
// Solo se exportan acciones (todo lo exportado desde un archivo "use server" es invocable).

import { updateTag } from "next/cache";
import type { FormResult } from "@/components/admin/catalog/ActionForm";
import {
  brandFromForm,
  fdBool,
  fdText,
  firstIssue,
  idSchema,
  mergeSchema,
  modelFromForm,
  moveFeatured,
  reasonSchema,
  sizeFromForm,
} from "@/components/admin/catalog/schema";
import { adminErrorText, requireAdminAction, type AdminActionResult } from "@/lib/admin/auth";

const bad = (message: string) => ({ ok: false as const, message });
const invalid = { ok: false as const, message: "Petición no válida." };

/** Lo que cambia en el catálogo cambia también cómo se ven los anuncios (marca y modelo embebidos). */
function touchCatalog() {
  updateTag("catalog");
  updateTag("listings");
}

// ─────────────── Marcas ───────────────

export async function createBrand(fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const b = brandFromForm(fd);
  if (!b.success) return bad(firstIssue(b.error));
  const { data, error } = await ctx.sb.from("brands").insert(b.data).select("id").single();
  if (error || !data) return bad(adminErrorText(error));
  touchCatalog();
  return { ok: true, message: `Marca «${b.data.name}» creada.`, href: `/admin/catalogo/marcas/${data.id}` };
}

export async function updateBrand(id: number, fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const bid = idSchema.safeParse(id);
  const b = brandFromForm(fd);
  if (!bid.success) return invalid;
  if (!b.success) return bad(firstIssue(b.error));
  const { data, error } = await ctx.sb.from("brands").update(b.data).eq("id", bid.data).select("id");
  if (error) return bad(adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchCatalog();
  return { ok: true, message: "Marca guardada." };
}

/** Activar o desactivar (desactivar la oculta del formulario de publicación; los anuncios la conservan). */
export async function setBrandActive(id: number, active: boolean): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const bid = idSchema.safeParse(id);
  if (!bid.success || typeof active !== "boolean") return invalid;
  const patch = active ? { active } : { active, featured: false };
  const { data, error } = await ctx.sb.from("brands").update(patch).eq("id", bid.data).select("id");
  if (error) return bad(adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchCatalog();
  return { ok: true, message: active ? "Marca activada." : "Marca desactivada." };
}

/** Destacar o quitar de destacadas. Al destacar, va al final de la lista. */
export async function setBrandFeatured(id: number, featured: boolean): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const bid = idSchema.safeParse(id);
  if (!bid.success || typeof featured !== "boolean") return invalid;
  let sort_order = 0;
  if (featured) {
    const { data: last, error } = await ctx.sb
      .from("brands")
      .select("sort_order")
      .eq("featured", true)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return bad(adminErrorText(error));
    sort_order = Math.min(999, (last?.sort_order ?? 0) + 1);
  }
  const { data, error } = await ctx.sb
    .from("brands")
    .update(featured ? { featured, sort_order } : { featured })
    .eq("id", bid.data)
    .select("id");
  if (error) return bad(adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchCatalog();
  return { ok: true, message: featured ? "Marca destacada en el formulario de publicación." : "Marca quitada de destacadas." };
}

export async function addFeaturedBrand(fd: FormData): Promise<FormResult> {
  const id = idSchema.safeParse(fdText(fd, "brand_id"));
  if (!id.success) return bad("Elige una marca.");
  return setBrandFeatured(id.data, true);
}

/** Subir o bajar una marca destacada. Renumera el orden 1..n de las destacadas activas. */
export async function moveFeaturedBrand(id: number, dir: "up" | "down"): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const bid = idSchema.safeParse(id);
  if (!bid.success || (dir !== "up" && dir !== "down")) return invalid;
  const { data: list, error } = await ctx.sb
    .from("brands")
    .select("id, sort_order")
    .eq("featured", true)
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error || !list) return bad(adminErrorText(error));
  const changes = moveFeatured(list, bid.data, dir);
  for (const c of changes) {
    const r = await ctx.sb.from("brands").update({ sort_order: c.sort_order }).eq("id", c.id);
    if (r.error) return bad(adminErrorText(r.error));
  }
  if (changes.length) touchCatalog();
  return { ok: true, message: "Orden guardado." };
}

/** Fusionar un duplicado en otra marca (admin_merge_brands: anuncios y modelos pasan a la de destino). */
export async function mergeBrand(fromId: number, fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const from = idSchema.safeParse(fromId);
  const m = mergeSchema.safeParse({ into: fdText(fd, "into"), reason: fdText(fd, "reason"), confirm: fdBool(fd, "confirm") });
  if (!from.success) return invalid;
  if (!m.success) return bad(firstIssue(m.error));
  if (m.data.into === from.data) return bad("Elige dos marcas distintas.");
  const { error } = await ctx.sb.rpc("admin_merge_brands", { p_from: from.data, p_into: m.data.into, p_reason: m.data.reason });
  if (error) return bad(adminErrorText(error));
  touchCatalog();
  return { ok: true, message: "Marcas fusionadas.", href: `/admin/catalogo/marcas/${m.data.into}` };
}

// ─────────────── Modelos ───────────────

export async function createModel(fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const m = modelFromForm(fd);
  if (!m.success) return bad(firstIssue(m.error));
  const { data, error } = await ctx.sb.from("board_models").insert(m.data).select("id").single();
  if (error || !data) return bad(adminErrorText(error));
  touchCatalog();
  return { ok: true, message: `Modelo «${m.data.name}» creado (sin verificar).`, href: `/admin/catalogo/modelos/${data.id}` };
}

export async function updateModel(id: number, fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const mid = idSchema.safeParse(id);
  const m = modelFromForm(fd);
  if (!mid.success) return invalid;
  if (!m.success) return bad(firstIssue(m.error));
  if (!m.data.source_note) {
    const { data: cur } = await ctx.sb.from("board_models").select("verification").eq("id", mid.data).maybeSingle();
    if (cur?.verification === "verified")
      return bad("Un modelo verificado necesita la fuente. Quita antes la verificación si ya no la tiene.");
  }
  const { data, error } = await ctx.sb.from("board_models").update(m.data).eq("id", mid.data).select("id");
  if (error) return bad(adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchCatalog();
  return { ok: true, message: "Modelo guardado." };
}

export async function setModelActive(id: number, active: boolean): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const mid = idSchema.safeParse(id);
  if (!mid.success || typeof active !== "boolean") return invalid;
  const { data, error } = await ctx.sb.from("board_models").update({ active }).eq("id", mid.data).select("id");
  if (error) return bad(adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchCatalog();
  return { ok: true, message: active ? "Modelo activado." : "Modelo desactivado." };
}

/** Verificar exige fuente (la base de datos lo comprueba: source_required). Firma de AdminAction. */
export async function setModelVerification(id: number, verified: boolean, reason: string): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const mid = idSchema.safeParse(id);
  const r = reasonSchema.safeParse(reason ?? "");
  if (!mid.success || typeof verified !== "boolean" || !r.success) return invalid;
  const { error } = await ctx.sb.rpc("admin_set_model_verification", { p_model: mid.data, p_verified: verified, p_reason: r.data });
  if (error) return bad(adminErrorText(error));
  touchCatalog();
  return { ok: true, message: verified ? "Modelo verificado: ya aparece al publicar." : "Verificación retirada." };
}

// ─────────────── Medidas de un modelo ───────────────

export async function createSize(modelId: number, fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const mid = idSchema.safeParse(modelId);
  const sz = sizeFromForm(fd);
  if (!mid.success) return invalid;
  if (!sz.success) return bad(firstIssue(sz.error));
  const { error } = await ctx.sb.from("board_model_sizes").insert({ ...sz.data, model_id: mid.data });
  if (error) return bad(adminErrorText(error));
  touchCatalog();
  return { ok: true, message: `Medida ${sz.data.label} añadida.` };
}

export async function updateSize(sizeId: number, fd: FormData): Promise<FormResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const sid = idSchema.safeParse(sizeId);
  const sz = sizeFromForm(fd);
  if (!sid.success) return invalid;
  if (!sz.success) return bad(firstIssue(sz.error));
  const { data, error } = await ctx.sb.from("board_model_sizes").update(sz.data).eq("id", sid.data).select("id");
  if (error) return bad(adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchCatalog();
  return { ok: true, message: `Medida ${sz.data.label} guardada.` };
}

/**
 * Borrar una medida del catálogo. Los anuncios que la usaban conservan sus medidas (son del vendedor):
 * la base de datos solo suelta la referencia. Firma de AdminAction (motivo y opción no se usan).
 */
export async function deleteSize(sizeId: number): Promise<AdminActionResult> {
  const ctx = await requireAdminAction();
  if (ctx.error) return ctx.error;
  const sid = idSchema.safeParse(sizeId);
  if (!sid.success) return invalid;
  // Un anuncio con datos «del fabricante» necesita su medida de catálogo (manufacturer_needs_catalog):
  // si alguno la usa, no se borra (las medidas de los anuncios no se tocan nunca desde aquí).
  const used = await ctx.sb.from("listings").select("id", { count: "exact", head: true }).eq("model_size_id", sid.data);
  if (used.error) return bad(adminErrorText(used.error));
  if ((used.count ?? 0) > 0)
    return bad(`${used.count === 1 ? "Un anuncio usa" : `${used.count} anuncios usan`} esta medida: no se puede borrar. Corrígela o desactiva el modelo.`);
  const { data, error } = await ctx.sb.from("board_model_sizes").delete().eq("id", sid.data).select("id");
  if (error) return bad(adminErrorText(error));
  if (!data?.length) return bad("No existe o no tienes permiso.");
  touchCatalog();
  return { ok: true, message: "Medida borrada." };
}
