// Borrador de publicación (PUB0 del prototipo) y conversión a un Listing de VISTA PREVIA.
// Módulo puro: lo usan el Server Component (editar desde el panel) y la isla cliente.

import type { Condition, Construction, Shape } from "@/lib/domain/taxonomy";
import { POPULAR_BRANDS, zoneBySlug } from "@/lib/domain/taxonomy";
import type { CatalogModel, Listing, Measured, Photo } from "@/lib/domain/types";
import { fmtIn, ftLabel } from "@/lib/domain/format";
import { fieldToInches, parseLitres, type MeasureKey, type Unit } from "./parse";

/**
 * Origen de un dato mientras se publica:
 * - cat: autorrellenado desde el catálogo → «Según catálogo · confírmalo».
 * - ai: interpretado de las medidas pegadas → «Propuesta automática · revísala».
 * - catok: del catálogo y confirmado por el vendedor: sigue siendo dato del FABRICANTE.
 * - ok: escrito (o corregido) por el vendedor.
 * Confirmar ya no convierte un dato del fabricante en «según el vendedor» (cierre de auditoría).
 */
export type FieldSource = "cat" | "catok" | "ai" | "ok" | "";

/** Confirma de una vez todas las medidas pendientes (catálogo → catok; interpretadas → ok). */
export const confirmAll = (src: PublishDraft["src"]): PublishDraft["src"] =>
  Object.fromEntries(Object.entries(src).map(([k, v]) => [k, v === "cat" ? "catok" : v === "ai" ? "ok" : v]));

export const SHAPER_LOCAL = "Shaper local";
export const NO_BRAND_OPTION = "Sin marca";
export const OTHER_MODEL = "Otro";
/** Marca que no está en la lista: el vendedor la escribe (se guarda como texto). */
export const OTHER_BRAND = "Otra marca";
/** Opciones de marca que no son una marca de la lista. */
/**
 * Orden de las marcas al publicar: primero las destacadas en el orden del panel (/admin/catalogo;
 * sin esa lista, las habituales POPULAR_BRANDS), luego las que tienen modelos en el catálogo y después
 * el resto por orden alfabético. Sin duplicados.
 */
export function orderBrands(known: string[], withModels: string[], featured: readonly string[] = POPULAR_BRANDS): string[] {
  const all = [...new Set([...known, ...withModels])];
  const popular = [...new Set(featured)].filter((b) => all.includes(b));
  const models = withModels.filter((b) => !popular.includes(b));
  const rest = all.filter((b) => !popular.includes(b) && !models.includes(b)).sort((a, b) => a.localeCompare(b, "es"));
  return [...popular, ...models, ...rest];
}

/** Marcas visibles antes de «Ver todas las marcas»: al menos `min`, y nunca se oculta una destacada. */
export const visibleBrandCount = (featuredCount: number, min = 12) => Math.max(min, featuredCount);

export const isListedBrand =(b: string) => Boolean(b) && b !== SHAPER_LOCAL && b !== NO_BRAND_OPTION && b !== OTHER_BRAND;

export type ContactMethod = "whatsapp" | "phone" | "email";

export interface DraftPhoto {
  url: string;
  /** true si es una foto elegida en este dispositivo (URL blob: local, aún sin subir). */
  local: boolean;
  /** Foto ya procesada (WebP/JPEG sin metadatos), lista para subir. */
  blob?: Blob;
  width?: number;
  height?: number;
  /** Ruta en Storage de una foto ya subida (al editar). */
  path?: string;
}

export interface PublishDraft {
  photos: DraftPhoto[];
  brand: string;
  /** Texto de «Otra marca». */
  brandOther: string;
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

// Sin zona por defecto: quien vende la elige (no se presupone Gran Canaria).
export const emptyDraft = (zone = ""): PublishDraft => ({
  photos: [],
  brand: "",
  brandOther: "",
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
    // Sin marca guardada es «Sin marca» (los de shaper local guardan el texto «Shaper local»).
    brand: l.brand ?? NO_BRAND_OPTION,
    model: l.model ?? "",
    size: l.brand ? l.sizeLabel : "",
    len: l.sizeLabel,
    width: l.width.value != null ? fmtIn(l.width.value) : "",
    thick: l.thickness.value != null ? fmtIn(l.thickness.value) : "",
    vol: l.volume.value != null ? String(l.volume.value) : "",
    // Al editar se conserva el origen: lo que era del fabricante sigue siéndolo (antes pasaba a «vendedor»).
    src: {
      len: l.length.source === "manufacturer" ? "catok" : "ok",
      width: l.width.source === "manufacturer" ? "catok" : "ok",
      thick: l.thickness.source === "manufacturer" ? "catok" : "ok",
      vol: l.volume.source === "manufacturer" ? "catok" : "ok",
    },
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
  const brand = d.brand === OTHER_BRAND ? d.brandOther.trim() || null : isListedBrand(d.brand) ? d.brand : null;
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
