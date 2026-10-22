// Utilidades del catálogo de marcas y modelos (sin dependencias de servidor).

import { CONSTRUCTION_INFO, SHAPE_INFO, slugify } from "@/lib/domain/taxonomy";
import type { CatalogModel, Listing } from "@/lib/domain/types";

export const brandPath = (brandSlug: string) => `/marcas/${brandSlug}`;
export const modelPath = (m: CatalogModel) => `/marcas/${slugify(m.brand)}/${m.slug}`;

export const isOfModel = (l: Listing, m: CatalogModel) =>
  l.brand != null && slugify(l.brand) === slugify(m.brand) && l.modelSlug === m.slug;

/** Índice de la medida de catálogo del anuncio (por etiqueta o, si no, por longitud), o -1. */
export function sizeIndexOf(l: Listing, m: CatalogModel) {
  const byLabel = m.sizes.findIndex((s) => s.label === l.sizeLabel);
  if (byLabel >= 0) return byLabel;
  return l.length.value == null ? -1 : m.sizes.findIndex((s) => s.lengthIn === l.length.value);
}

export const modelMeta = (m: CatalogModel) => `${SHAPE_INFO[m.shape].label} · ${CONSTRUCTION_INFO[m.construction].short}`;

/** «5'10"–6'2" · 28,5–32,6 L». */
export function modelRange(m: CatalogModel) {
  const vols = m.sizes.map((s) => s.volume).filter((v): v is number => v != null);
  const first = m.sizes[0].label;
  const last = m.sizes[m.sizes.length - 1].label;
  const lens = first === last ? first : `${first}–${last}`;
  if (!vols.length) return `${lens} · litros sin publicar`;
  const lo = Math.min(...vols).toLocaleString("es-ES");
  const hi = Math.max(...vols).toLocaleString("es-ES");
  return `${lens} · ${lo === hi ? lo : `${lo}–${hi}`} L`;
}

export const usedCount = (n: number) => (n ? `${n} usada${n > 1 ? "s" : ""} en venta` : "Sin unidades usadas ahora");
