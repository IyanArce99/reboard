import { ACTIVE_ZONE_SLUGS, NO_BRAND, regionBySlug, slugify } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { finLabel, hasVolumeFilter, type Filters, type Sort } from "./filters";

export const brandSlugOf = (l: Listing) => (l.brand ? slugify(l.brand) : NO_BRAND.slug);

export function inZone(l: Listing, zone: string) {
  if (!zone) return ACTIVE_ZONE_SLUGS.includes(l.zone);
  const region = regionBySlug(zone);
  return region ? region.zones.includes(l.zone) : l.zone === zone;
}

/**
 * ¿Cumple el anuncio los filtros? Port de match() del prototipo.
 * Con filtro de litros, los anuncios sin litros no coinciden (se ofrecen aparte):
 * skipVolume = true permite encontrarlos.
 */
export function matches(l: Listing, f: Filters, skipVolume = false): boolean {
  if (!inZone(l, f.zone)) return false;
  if (f.zone && f.dist && !regionBySlug(f.zone) && (l.distanceKm == null || l.distanceKm > f.dist)) return false;
  if (f.shapes.length && !f.shapes.includes(l.shape)) return false;
  if (f.constructions.length && !f.constructions.includes(l.construction)) return false;
  if (f.priceMax != null && l.price > f.priceMax) return false;
  if (f.priceMin != null && l.price < f.priceMin) return false;
  const len = l.length.value;
  if (f.lenMin != null && (len == null || len < f.lenMin)) return false;
  if (f.lenMax != null && (len == null || len > f.lenMax)) return false;
  if (f.brand && brandSlugOf(l) !== f.brand) return false;
  if (f.model && l.modelSlug !== f.model) return false;
  if (f.conditions.length && !f.conditions.includes(l.condition)) return false;
  if (f.sellers.length && !f.sellers.includes(l.seller.type)) return false;
  if (f.noRepairs && l.repairs) return false;
  if (f.accessories && !l.accessories.value) return false;
  if (f.fins && !(l.fins.value ?? "").includes(finLabel(f.fins))) return false;
  if (f.widthMin != null && (l.width.value == null || l.width.value < f.widthMin)) return false;
  if (f.thickMin != null && (l.thickness.value == null || l.thickness.value < f.thickMin)) return false;
  const vol = l.volume.value;
  if (f.fit && (vol == null || vol < f.fit.lo || vol > f.fit.hi)) return false;
  if (!skipVolume && hasVolumeFilter(f)) {
    if (vol == null) return false;
    if (f.volMin != null && vol < f.volMin) return false;
    if (f.volMax != null && vol > f.volMax) return false;
  }
  return true;
}

export const countMatches = (listings: Listing[], f: Filters) =>
  listings.reduce((n, l) => n + (matches(l, f) ? 1 : 0), 0);

const time = (iso: string) => new Date(iso).getTime();

/** Ordenación. «Más cerca» pone primero la zona de referencia del usuario. */
export function sortListings(listings: Listing[], sort: Sort, hereZone: string) {
  const dist = (l: Listing) => (l.zone === hereZone && l.distanceKm != null ? l.distanceKm : 9999);
  const cmp: Record<Sort, (a: Listing, b: Listing) => number> = {
    recientes: (a, b) => time(b.publishedAt) - time(a.publishedAt),
    precio: (a, b) => a.price - b.price,
    "precio-desc": (a, b) => b.price - a.price,
    // Sin litros, al final (no como 0 L).
    litros: (a, b) => (a.volume.value ?? Infinity) - (b.volume.value ?? Infinity) || 0,
    "litros-desc": (a, b) => (b.volume.value ?? -Infinity) - (a.volume.value ?? -Infinity) || 0,
    distancia: (a, b) => dist(a) - dist(b),
  };
  return [...listings].sort(cmp[sort]);
}
