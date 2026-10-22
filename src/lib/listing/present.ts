// Textos de un anuncio para la interfaz (equivalente a card() y fichaVals() del prototipo).

import { CONSTRUCTION_INFO, SHAPE_INFO, isActiveStatus, zoneBySlug } from "@/lib/domain/taxonomy";
import type { DataSource, Listing } from "@/lib/domain/types";
import { ago, daysBetween } from "@/lib/domain/format";

export const listingTitle = (l: Listing) =>
  l.brand
    ? [l.brand, l.model, l.sizeLabel].filter(Boolean).join(" ")
    : `${SHAPE_INFO[l.shape].label} sin marca ${l.sizeLabel}`;

/** Etiqueta corta para la bandeja de comparación. */
export const listingShortLabel = (l: Listing) => `${l.brand ?? "Sin marca"} ${l.sizeLabel}`;

export const listingPath = (l: Listing) => `/anuncio/${l.slug}-${l.id}`;

/** Extrae el id del final de /anuncio/[slug-id]. */
export const idFromSlugId = (slugId: string) => slugId.match(/-(a\d+)$/)?.[1] ?? null;

export const zoneName = (l: Listing) => zoneBySlug(l.zone)?.name ?? l.zone;

export const volumeShort = (l: Listing) => (l.volume.value != null ? `${l.volume.value} L` : "Litros sin indicar");

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
    ? { text: "Según fabricante", tone: "manufacturer" }
    : { text: "Indicado por el vendedor", tone: "seller" };
}
