// Borrador de publicación (PUB0 del prototipo) y conversión a un Listing de VISTA PREVIA.
// Módulo puro: lo usan el Server Component (editar desde el panel) y la isla cliente.

import type { Condition, Construction, Shape } from "@/lib/domain/taxonomy";
import { zoneBySlug } from "@/lib/domain/taxonomy";
import type { CatalogModel, Listing, Measured, Photo } from "@/lib/domain/types";
import { fmtIn, ftLabel } from "@/lib/domain/format";
import { fieldToInches, parseLitres, type MeasureKey, type Unit } from "./parse";

/**
 * Origen de un dato mientras se publica:
 * - cat: autorrellenado desde el catálogo → «Según catálogo · confírmalo».
 * - ai: interpretado de las medidas pegadas → «Propuesta automática · revísala».
 * - ok: escrito o confirmado por el vendedor → «Confirmado por ti».
 */
export type FieldSource = "cat" | "ai" | "ok" | "";

export const SHAPER_LOCAL = "Shaper local";
export const NO_BRAND_OPTION = "Sin marca";
export const OTHER_MODEL = "Otro";

export type ContactMethod = "whatsapp" | "phone" | "email";

export interface DraftPhoto {
  url: string;
  /** true si es una foto elegida en este dispositivo (URL blob: local, nunca subida). */
  local: boolean;
}

export interface PublishDraft {
  photos: DraftPhoto[];
  brand: string;
  model: string;
  size: string;
  unit: Unit;
  len: string;
  width: string;
  thick: string;
  vol: string;
  src: Partial<Record<MeasureKey, FieldSource>>;
  shape: Shape | "";
  construction: Construction | "";
  condition: Condition | "";
  repairs: string;
  price: string;
  zone: string;
  town: string;
  contact: ContactMethod;
  description: string;
  phone: string;
}

export const emptyDraft = (zone = "gran-canaria"): PublishDraft => ({
  photos: [],
  brand: "",
  model: "",
  size: "",
  unit: "ft",
  len: "",
  width: "",
  thick: "",
  vol: "",
  src: {},
  shape: "",
  construction: "",
  condition: "",
  repairs: "",
  price: "",
  zone,
  town: "",
  contact: "whatsapp",
  description: "",
  phone: "",
});

/** Medidas en texto a partir de pulgadas, en la unidad elegida. */
export function formatMeasure(key: Exclude<MeasureKey, "vol">, inches: number, unit: Unit): string {
  if (unit === "cm") {
    const cm = inches * 2.54;
    return key === "len" ? String(Math.round(cm)) : String(Math.round(cm * 10) / 10);
  }
  return key === "len" ? ftLabel(Math.round(inches)) : fmtIn(inches);
}

/** Convierte las medidas del borrador al cambiar entre pies y cm (las que no se entienden se dejan igual). */
export function convertUnits(d: PublishDraft, unit: Unit): PublishDraft {
  if (unit === d.unit) return d;
  const next = { ...d, unit };
  for (const k of ["len", "width", "thick"] as const) {
    const inches = fieldToInches(k, d[k], d.unit);
    if (inches != null) next[k] = formatMeasure(k, inches, unit);
  }
  return next;
}

/** Datos de una medida de catálogo, marcados «Según catálogo · confírmalo». */
export function applyCatalogSize(d: PublishDraft, size: CatalogModel["sizes"][number]): PublishDraft {
  return {
    ...d,
    size: size.label,
    len: d.unit === "ft" ? size.label : formatMeasure("len", size.lengthIn, "cm"),
    width: formatMeasure("width", size.widthIn, d.unit),
    thick: formatMeasure("thick", size.thickIn, d.unit),
    vol: size.volume == null ? "" : String(size.volume),
    src: size.volume == null ? { len: "cat", width: "cat", thick: "cat" } : { len: "cat", width: "cat", thick: "cat", vol: "cat" },
  };
}

/** Datos pendientes de confirmar (de catálogo o interpretados). */
export const pendingCount = (d: PublishDraft) =>
  Object.values(d.src).filter((x) => x === "cat" || x === "ai").length;

/** Borrador a partir de un anuncio existente («Editar» desde el panel). */
export function draftFromListing(l: Listing): PublishDraft {
  return {
    ...emptyDraft(l.zone),
    photos: l.photos.map((p) => ({ url: p.url, local: false })),
    brand: l.brand ?? SHAPER_LOCAL,
    model: l.model ?? "",
    size: l.brand ? l.sizeLabel : "",
    len: l.sizeLabel,
    width: l.width.value != null ? fmtIn(l.width.value) : "",
    thick: l.thickness.value != null ? fmtIn(l.thickness.value) : "",
    vol: l.volume.value != null ? String(l.volume.value) : "",
    src: { len: "ok", width: "ok", thick: "ok", vol: "ok" },
    shape: l.shape,
    construction: l.construction,
    condition: l.condition,
    repairs: l.repairs ?? "",
    price: String(l.price),
    town: l.town,
    contact: l.contact.method,
    description: l.description,
  };
}

const PHOTO_LABELS = ["cubierta", "fondo", "cola y quillas", "nose", "canto", "quillas", "detalle", "funda"];

const seller = <T,>(value: T | null): Measured<T> => (value == null ? { value: null, source: null } : { value, source: "seller" });

/**
 * Listing de VISTA PREVIA para pintar la tarjeta real (ListingCard).
 * isDemo = true y origen 'seller': nunca se guarda ni aparece en búsquedas.
 */
export function previewListing(d: PublishDraft, catalog: CatalogModel[], now: Date): Listing {
  const brand = d.brand && d.brand !== SHAPER_LOCAL && d.brand !== NO_BRAND_OPTION ? d.brand : null;
  const model = brand && d.model && d.model !== OTHER_MODEL ? d.model : null;
  const cm = brand && model ? catalog.find((m) => m.brand === brand && m.model === model) : undefined;
  const lenIn = fieldToInches("len", d.len, d.unit);
  const sizeLabel = d.unit === "ft" ? d.len || "—" : lenIn != null ? ftLabel(Math.round(lenIn)) : "—";
  const iso = now.toISOString();
  const zone = zoneBySlug(d.zone);
  return {
    id: "vista-previa",
    slug: "vista-previa",
    brand,
    model: brand ? (model ?? "") : null,
    modelSlug: cm?.slug ?? null,
    sizeLabel,
    length: seller(lenIn),
    width: seller(fieldToInches("width", d.width, d.unit)),
    thickness: seller(fieldToInches("thick", d.thick, d.unit)),
    volume: seller(parseLitres(d.vol)),
    shape: d.shape || "evolutiva",
    shapeSource: d.shape ? "seller" : null,
    construction: d.construction || "pu",
    constructionSource: d.construction ? "seller" : null,
    fins: { value: null, source: null },
    accessories: { value: null, source: null },
    zone: d.zone,
    town: d.town || zone?.towns[0] || "",
    distanceKm: null,
    price: Number(d.price) || 0,
    previousPrice: null,
    condition: d.condition || "buen-estado",
    repairs: d.repairs || null,
    seller: { id: null, type: "particular", name: "Tú", shopSlug: null },
    contact: { method: d.contact, phone: null },
    status: "disponible",
    publishedAt: iso,
    confirmedAt: iso,
    photos: d.photos.map((p, i): Photo => ({ url: p.url, label: PHOTO_LABELS[i] ?? "foto" })),
    description: d.description,
    isDemo: true,
  };
}
