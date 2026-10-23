"use server";

// Publicar, editar y gestionar anuncios (fase E). Cada acción vuelve a comprobar la sesión con
// getUser(): proxy.ts no cubre las Server Actions de todas las rutas (docs/SECURITY.md §2).

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { authEnabled } from "@/lib/auth/config";
import { ListingInput, firstIssueText } from "@/lib/publish/schema";
import { deleteOwnListing, PublishError, finalizeListing, panelAction, saveListing, type PanelAction, type PhotoRef } from "@/lib/publish/save";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createUserClient } from "@/lib/supabase/server";

export type ActionResult<T> = ({ ok: true } & T) | { ok: false; message: string; login?: boolean };

async function session() {
  if (!authEnabled()) return { error: { ok: false as const, message: "La publicación real no está activa en la demo." } };
  const sb = await createUserClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { error: { ok: false as const, message: "Tu sesión ha caducado. Confirma tu email para seguir.", login: true } };
  return { sb, user: data.user };
}

function failure(e: unknown): { ok: false; message: string } {
  if (e instanceof PublishError) {
    if (e.code === "db") console.error("[publicar]", e.message);
    return { ok: false, message: e.code === "db" ? "No se ha podido guardar. Vuelve a intentarlo." : e.message };
  }
  console.error("[publicar]", e);
  return { ok: false, message: "No se ha podido guardar. Vuelve a intentarlo." };
}

function invalidate(publicId: string) {
  // Lectura inmediata de lo propio: búsquedas, landings, home y la ficha (E4).
  updateTag("listings");
  updateTag(`listing:${publicId}`);
}

const SaveArgs = z.object({
  input: z.unknown(),
  editingId: z.string().regex(/^a\d{1,15}$/).nullable(),
  turnstileToken: z.string().max(2048).nullable(),
});

/** Paso 1 de publicar: valida, comprueba Turnstile y guarda el anuncio (borrador si es nuevo). */
export async function saveListingAction(args: z.input<typeof SaveArgs>): Promise<ActionResult<{ publicId: string; listingId: number; userId: string; status: string }>> {
  const a = SaveArgs.safeParse(args);
  if (!a.success) return { ok: false, message: "Algo no ha ido bien. Recarga la página y vuelve a intentarlo." };
  const parsed = ListingInput.safeParse(a.data.input);
  if (!parsed.success) return { ok: false, message: firstIssueText(parsed.error) };

  const s = await session();
  if ("error" in s) return s.error!;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const captcha = await verifyTurnstile(a.data.turnstileToken, { ip });
  if (!captcha.ok) {
    if (captcha.reason === "not-configured") {
      // Fallo de configuración del servidor: se registra aquí y el usuario ve un mensaje neutro.
      console.error("[publicar] Turnstile no está configurado (falta la clave secreta).");
      return { ok: false, message: "No se puede publicar ahora mismo. Inténtalo más tarde." };
    }
    return { ok: false, message: "No hemos podido comprobar que no eres un robot. Vuelve a intentarlo." };
  }

  try {
    const r = await saveListing(s.sb!, s.user!.id, parsed.data, a.data.editingId);
    return { ok: true, publicId: r.publicId, listingId: r.id, userId: s.user!.id, status: r.status };
  } catch (e) {
    return failure(e);
  }
}

const FinalizeArgs = z.object({
  publicId: z.string().regex(/^a\d{1,15}$/),
  photos: z
    .array(z.object({ path: z.string().max(200), width: z.number().int().min(1).max(8000), height: z.number().int().min(1).max(8000) }))
    .min(1)
    .max(8),
  publish: z.boolean(),
});

/** Paso 2: fotos ya subidas a Storage → filas en listing_photos, y publicar si es nuevo. */
export async function finalizeListingAction(args: z.input<typeof FinalizeArgs>): Promise<ActionResult<{ path: string }>> {
  const a = FinalizeArgs.safeParse(args);
  if (!a.success) return { ok: false, message: "Revisa las fotos: hace falta entre 1 y 8." };
  const s = await session();
  if ("error" in s) return s.error!;
  try {
    const r = await finalizeListing(s.sb!, s.user!.id, a.data.publicId, a.data.photos as PhotoRef[], a.data.publish);
    invalidate(r.publicId);
    return { ok: true, path: `/anuncio/${r.slug}-${r.publicId}` };
  } catch (e) {
    return failure(e);
  }
}

const DeleteArgs = z.object({ publicId: z.string().regex(/^a\d{1,15}$/) });

/** Eliminar un anuncio propio desde «Mis anuncios» (con sus fotos). */
export async function deleteListingServer(args: { publicId: string }): Promise<ActionResult<object>> {
  const a = DeleteArgs.safeParse(args);
  if (!a.success) return { ok: false, message: "Algo no ha ido bien. Recarga la página y vuelve a intentarlo." };
  const s = await session();
  if ("error" in s) return s.error!;
  try {
    const r = await deleteOwnListing(s.sb!, s.user!.id, a.data.publicId);
    invalidate(r.publicId);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

const PanelArgs = z.object({
  publicId: z.string().regex(/^a\d{1,15}$/),
  action: z.enum(["confirm", "sold", "republish", "withdraw", "price"]),
  price: z.number().int().min(1).max(20000).optional(),
});

/** Acciones del panel del vendedor (E5). */
export async function panelActionServer(args: { publicId: string; action: PanelAction; price?: number }): Promise<ActionResult<object>> {
  const a = PanelArgs.safeParse(args);
  if (!a.success) return { ok: false, message: "Algo no ha ido bien. Recarga la página y vuelve a intentarlo." };
  const s = await session();
  if ("error" in s) return s.error!;
  try {
    const r = await panelAction(s.sb!, s.user!.id, a.data.publicId, a.data.action, a.data.price);
    invalidate(r.publicId);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}
