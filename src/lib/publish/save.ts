// Persistencia de anuncios (E3, E5, E6). Recibe el cliente de Supabase del USUARIO: todo va bajo
// RLS y los triggers de la base de datos (transiciones de estado, fechas, «ha bajado de precio»).
// Las Server Actions (src/app/vender/actions.ts) añaden la sesión, Turnstile y la caché.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listingDbId } from "@/lib/auth/shared";
import { PHOTOS_BUCKET } from "@/lib/supabase/env";
import { listingSlugFor, type ListingData } from "./schema";

type Sb = SupabaseClient<Database>;
type Status = Database["public"]["Enums"]["listing_status"];

export const MAX_PHOTOS = 8;
export const PHOTO_LABELS = ["cubierta", "fondo", "cola y quillas", "nose", "canto", "quillas", "detalle", "funda"];

export class PublishError extends Error {
  constructor(
    public readonly code: "not-found" | "catalog" | "db" | "photos" | "state",
    message: string,
  ) {
    super(message);
  }
}

export interface PhotoRef {
  path: string;
  width: number;
  height: number;
}

/** Ruta de Storage válida para una foto de este usuario y anuncio. */
export const photoPathOk = (path: string, userId: string, listingId: number) =>
  new RegExp(`^${userId}/${listingId}/[0-9a-f-]{36}\\.(webp|jpg)$`).test(path);

async function resolveCatalog(sb: Sb, v: ListingData) {
  if (!v.brandSlug) return { brandId: null, modelId: null, sizeId: null, brandName: null, modelName: null };
  const { data: brand } = await sb.from("brands").select("id, name").eq("slug", v.brandSlug).maybeSingle();
  // Marca que no está en la tabla: sin modelo, se guarda como texto (brand_text) en lugar de fallar.
  if (!brand) {
    if (v.modelSlug) throw new PublishError("catalog", "La marca no está en el catálogo.");
    return { brandId: null, modelId: null, sizeId: null, brandName: null, modelName: null };
  }
  if (!v.modelSlug) return { brandId: brand.id, modelId: null, sizeId: null, brandName: brand.name, modelName: null };
  const { data: model } = await sb.from("board_models").select("id, name").eq("slug", v.modelSlug).eq("brand_id", brand.id).maybeSingle();
  if (!model) throw new PublishError("catalog", "El modelo no está en el catálogo.");
  let sizeId: number | null = null;
  if (v.catalogSize) {
    const { data: size } = await sb.from("board_model_sizes").select("id").eq("model_id", model.id).eq("label", v.catalogSize).maybeSingle();
    if (!size) throw new PublishError("catalog", "La medida no está en el catálogo.");
    sizeId = size.id;
  }
  return { brandId: brand.id, modelId: model.id, sizeId, brandName: brand.name, modelName: model.name };
}

/** Anuncio propio por id público (RLS: el dueño lo lee en cualquier estado). */
export async function ownListing(sb: Sb, userId: string, publicId: string) {
  const id = listingDbId(publicId);
  if (id == null) return null;
  const { data } = await sb.from("listings").select("id, public_id, slug, status, seller_id").eq("id", id).eq("seller_id", userId).maybeSingle();
  return data;
}

/**
 * Crea el anuncio como borrador (las fotos se suben después, con su id) o guarda los cambios
 * de uno existente. Guarda también el teléfono de contacto (tabla privada).
 */
export async function saveListing(sb: Sb, userId: string, v: ListingData, editingPublicId: string | null) {
  const cat = await resolveCatalog(sb, v);
  const row = {
    slug: listingSlugFor(v, cat.brandName, cat.modelName),
    brand_id: cat.brandId,
    model_id: cat.modelId,
    model_size_id: cat.sizeId,
    brand_text: cat.brandId ? null : v.brandText,
    model_text: cat.modelId ? null : v.modelText,
    size_label: v.sizeLabel,
    length_in: v.lengthIn,
    length_source: v.lengthSource,
    width_in: v.widthIn,
    width_source: v.widthSource,
    thickness_in: v.thicknessIn,
    thickness_source: v.thicknessSource,
    volume_l: v.volumeL,
    volume_source: v.volumeSource,
    shape: v.shape,
    shape_source: "seller" as const,
    construction: v.construction,
    construction_source: "seller" as const,
    condition: v.condition,
    repairs: v.repairs,
    description: v.description,
    price_eur: v.priceEur,
    zone_slug: v.zoneSlug,
    town: v.town,
    contact_method: v.contactMethod,
  };

  let listing: { id: number; public_id: string | null; slug: string; status: Status };
  if (editingPublicId) {
    const own = await ownListing(sb, userId, editingPublicId);
    if (!own) throw new PublishError("not-found", "No encontramos ese anuncio en tu cuenta.");
    const { data, error } = await sb.from("listings").update(row).eq("id", own.id).select("id, public_id, slug, status").single();
    if (error || !data) throw new PublishError("db", error?.message ?? "update");
    listing = data;
  } else {
    const { data, error } = await sb
      .from("listings")
      .insert({ ...row, status: "draft" })
      .select("id, public_id, slug, status")
      .single();
    // Límite de la base de datos: 15 anuncios nuevos por usuario y día (migración 20261027090000).
    if (error?.message.includes("listing_daily_limit")) {
      throw new PublishError("state", "Has creado muchos anuncios hoy. Podrás publicar más mañana.");
    }
    if (error || !data) throw new PublishError("db", error?.message ?? "insert");
    listing = data;
  }

  const { error: contactError } = await sb
    .from("listing_contacts")
    .upsert({ listing_id: listing.id, phone_e164: v.phone, updated_at: new Date().toISOString() });
  if (contactError) throw new PublishError("db", contactError.message);

  return { id: listing.id, publicId: listing.public_id ?? `a${listing.id}`, slug: listing.slug, status: listing.status };
}

/**
 * Deja las fotos del anuncio exactamente como `photos` (orden = posición) y, si es un borrador,
 * lo publica. Comprueba que cada foto nueva existe en Storage y borra las que ya no se usan.
 */
export async function finalizeListing(sb: Sb, userId: string, publicId: string, photos: PhotoRef[], publish: boolean) {
  const own = await ownListing(sb, userId, publicId);
  if (!own) throw new PublishError("not-found", "No encontramos ese anuncio en tu cuenta.");
  if (photos.length < 1 || photos.length > MAX_PHOTOS) throw new PublishError("photos", "Hace falta entre 1 y 8 fotos.");
  if (new Set(photos.map((p) => p.path)).size !== photos.length) throw new PublishError("photos", "Has añadido la misma foto dos veces.");
  for (const p of photos) {
    if (!photoPathOk(p.path, userId, own.id)) throw new PublishError("photos", "Vuelve a añadir las fotos.");
  }

  const folder = `${userId}/${own.id}`;
  const { data: objects, error: listError } = await sb.storage.from("listing-photos").list(folder, { limit: 100 });
  if (listError) {
    console.error("[publicar] list photos", listError.message);
    throw new PublishError("photos", "No se ha podido comprobar las fotos. Vuelve a intentarlo.");
  }
  const stored = new Set((objects ?? []).map((o) => `${folder}/${o.name}`));
  if (photos.some((p) => !stored.has(p.path))) throw new PublishError("photos", "Alguna foto no se ha subido. Vuelve a intentarlo.");

  // Se reescriben las filas en el orden nuevo (la posición es única por anuncio).
  const del = await sb.from("listing_photos").delete().eq("listing_id", own.id);
  if (del.error) throw new PublishError("db", del.error.message);
  const ins = await sb.from("listing_photos").insert(
    photos.map((p, i) => ({
      listing_id: own.id,
      storage_path: p.path,
      position: i,
      label: PHOTO_LABELS[i] ?? "foto",
      width: Math.round(p.width) || null,
      height: Math.round(p.height) || null,
    })),
  );
  if (ins.error) throw new PublishError("db", ins.error.message);

  const unused = [...stored].filter((path) => !photos.some((p) => p.path === path));
  if (unused.length) await sb.storage.from("listing-photos").remove(unused);

  if (publish && own.status === "draft") {
    const { error } = await sb.from("listings").update({ status: "published" }).eq("id", own.id);
    if (error) {
      console.error("[publicar] publish", error.message);
      throw new PublishError("state", "No se ha podido publicar el anuncio. Vuelve a intentarlo.");
    }
  }
  return { publicId: own.public_id ?? publicId, slug: own.slug };
}

export type PanelAction = "confirm" | "sold" | "republish" | "withdraw" | "price";

/** Acciones del panel. Las transiciones válidas y las fechas las impone la base de datos. */
/**
 * Elimina un anuncio propio y sus fotos de Storage. RLS (listings_delete_own) solo lo permite si no
 * hay moderación: en ese caso se explica que se puede retirar.
 */
export async function deleteOwnListing(sb: Sb, userId: string, publicId: string) {
  const own = await ownListing(sb, userId, publicId);
  if (!own) throw new PublishError("not-found", "No encontramos ese anuncio en tu cuenta.");
  const { data: deleted, error } = await sb.from("listings").delete().eq("id", own.id).select("id");
  if (error || !deleted?.length) {
    if (error) console.error("[eliminar]", error.message);
    throw new PublishError("state", "Este anuncio está en revisión y no se puede eliminar. Puedes retirarlo para que no se vea.");
  }
  // Fotos: después de borrar la fila (si fallara, quedan archivos sin anuncio, no un anuncio sin fotos).
  const folder = `${userId}/${own.id}`;
  const { data: files } = await sb.storage.from(PHOTOS_BUCKET).list(folder, { limit: 100 });
  const paths = (files ?? []).map((f) => `${folder}/${f.name}`);
  if (paths.length) {
    const { error: rmError } = await sb.storage.from(PHOTOS_BUCKET).remove(paths);
    if (rmError) console.error("[eliminar] fotos", folder, rmError.message);
  }
  return { publicId: own.public_id ?? publicId, photosDeleted: paths.length };
}

export async function panelAction(sb: Sb, userId: string, publicId: string, action: PanelAction, price?: number) {
  const own = await ownListing(sb, userId, publicId);
  if (!own) throw new PublishError("not-found", "No encontramos ese anuncio en tu cuenta.");
  const patches: Record<PanelAction, Database["public"]["Tables"]["listings"]["Update"]> = {
    confirm: { confirmed_at: new Date().toISOString() },
    sold: { status: "sold" },
    republish: { status: "published" },
    withdraw: { status: "withdrawn" },
    price: { price_eur: price },
  };
  const patch = patches[action];
  if (action === "price" && !(Number.isInteger(price) && price! >= 1 && price! <= 20000)) {
    throw new PublishError("state", "Indica un precio entre 1 y 20.000 €.");
  }
  if (action === "confirm" && own.status !== "published") throw new PublishError("state", "Solo se confirman anuncios publicados.");
  const { error } = await sb.from("listings").update(patch).eq("id", own.id);
  if (error) {
    console.error("[panel]", action, error.message);
    throw new PublishError("state", "Ese cambio no está permitido en este anuncio.");
  }
  return { publicId: own.public_id ?? publicId };
}
