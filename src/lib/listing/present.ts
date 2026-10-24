// Textos de un anuncio para la interfaz (equivalente a card() y fichaVals() del prototipo).

import { CONSTRUCTION_INFO, SELLER_LABEL, SHAPE_INFO, isActiveStatus, zoneLabel } from "@/lib/domain/taxonomy";
import type { DataSource, Listing } from "@/lib/domain/types";
import { ago, daysBetween, litres } from "@/lib/domain/format";

export const listingTitle = (l: Listing) =>
  l.brand
    ? [l.brand, l.model, l.sizeLabel].filter(Boolean).join(" ")
    : `${SHAPE_INFO[l.shape].label} sin marca ${l.sizeLabel}`;

/** Etiqueta corta para la bandeja de comparación. */
export const listingShortLabel = (l: Listing) => `${l.brand ?? "Sin marca"} ${l.sizeLabel}`;

/** Nombre por defecto de un perfil (profiles.display_name): el vendedor aún no ha elegido uno. */
export const DEFAULT_SELLER_NAME = "Surfista";

/** Nombre que ha elegido el vendedor, o null si sigue con el de por defecto. */
export const sellerName = (l: Listing) => (l.seller.name && l.seller.name !== DEFAULT_SELLER_NAME ? l.seller.name : null);

/** «Lo vende Daniel · Particular», «Lo vende Escuela Playa Chica · Escuela», «Lo vende un particular». */
export function soldBy(l: Listing): { name: string | null; rest: string } {
  const n = sellerName(l);
  if (n) return { name: n, rest: ` · ${SELLER_LABEL[l.seller.type]}` };
  return { name: null, rest: l.seller.type === "particular" ? "un particular" : l.seller.type === "escuela" ? "una escuela" : "una tienda" };
}

export const listingPath = (l: Listing) => `/anuncio/${l.slug}-${l.id}`;

/** Extrae el id del final de /anuncio/[slug-id]. */
export const idFromSlugId = (slugId: string) => slugId.match(/-(a\d+)$/)?.[1] ?? null;

export const zoneName = (l: Listing) => zoneLabel(l.zone);

export const volumeShort = (l: Listing) => (l.volume.value != null ? litres(l.volume.value) : "Litros sin indicar");

export type Tone = "success" | "warning" | "error";

export function availability(l: Listing, now: Date): { text: string; tone: Tone } {
  const d = ago(daysBetween(l.confirmedAt, now));
  if (l.status === "disponible") return { text: `Disponible · confirmada ${d}`, tone: "success" };
  if (l.status === "pendiente") return { text: `Sin confirmar desde ${d}`, tone: "warning" };
  return { text: { vendida: "Vendida", caducada: "Caducada", retirada: "Retirada" }[l.status], tone: "error" };
}

export const isOff = (l: Listing) => !isActiveStatus(l.status);

export function postedText(l: Listing, now: Date) {
  const d = daysBetween(l.publishedAt, now);
  return d === 0 ? "Publicada hoy" : `Publicada ${ago(d)}`;
}

export const typeShort = (l: Listing) => SHAPE_INFO[l.shape].short;
export const consShort = (l: Listing) => CONSTRUCTION_INFO[l.construction].short;

/** Etiqueta del origen de un dato técnico (ficha). */
export function sourceBadge(value: unknown, source: DataSource): { text: string; tone: "seller" | "manufacturer" | "none" } {
  if (value == null || source == null) return { text: "Sin indicar", tone: "none" };
  return source === "manufacturer"
    ? { text: "Según el fabricante", tone: "manufacturer" }
    : { text: "Según el vendedor", tone: "seller" };
}
