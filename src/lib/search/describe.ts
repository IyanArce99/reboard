// Textos derivados de los filtros: títulos, chips aplicados, texto de alerta y sugerencias.

import {
  CONDITION_LABEL,
  CONSTRUCTION_INFO,
  NO_BRAND,
  SELLER_LABEL,
  SHAPE_INFO,
  placeName,
  type Shape,
} from "@/lib/domain/taxonomy";
import { ftLabel } from "@/lib/domain/format";
import { emptyFilters, finLabel, hasVolumeFilter, toQuery, type Filters } from "./filters";

/** Nombres legibles de marcas y modelos (vienen del catálogo). */
export interface CatalogNames {
  brands: { slug: string; name: string }[];
  models: { slug: string; name: string; brandSlug: string }[];
}

export const brandName = (slug: string, names: CatalogNames) =>
  slug === NO_BRAND.slug ? NO_BRAND.label : (names.brands.find((b) => b.slug === slug)?.name ?? slug);

const singleShape = (f: Filters) => (f.shapes.length === 1 ? f.shapes[0] : null);
const onlySoftboard = (f: Filters) =>
  f.constructions.length === 1 && f.constructions[0] === "softboard" && !f.shapes.length;

/** H1 dinámico: «Evolutivas de segunda mano en Gran Canaria». */
/**
 * Cómo se nombra cada forma en títulos y H1: con «tablas» delante cuando así lo escribe la gente
 * («tabla evolutiva», «tabla fish»; ver docs/seo-ux-audit.md §B). Sin cambiar los slugs.
 */
const SHAPE_HEAD: Record<Shape, string> = {
  shortboard: "Shortboards",
  fish: "Tablas fish",
  hibrida: "Tablas híbridas",
  evolutiva: "Tablas evolutivas",
  midlength: "Midlengths",
  longboard: "Longboards",
  gun: "Guns y step-ups",
};

export function resultsTitle(f: Filters, names: CatalogNames) {
  const shape = singleShape(f);
  const z = f.zone ? placeName(f.zone) : null;
  const where = z ? ` en ${z}` : "";
  if (shape) return `${SHAPE_HEAD[shape]} de segunda mano${where}`;
  const head = onlySoftboard(f)
      ? "Softboards (tablas de espuma)"
      : f.brand && f.brand !== NO_BRAND.slug
        ? `Tablas ${brandName(f.brand, names)}`
        : "Tablas de surf";
  return `${head} de segunda mano${where}`;
}

/** Último elemento de las migas. */
export function resultsShortTitle(f: Filters) {
  const shape = singleShape(f);
  if (shape) return SHAPE_INFO[shape].label;
  if (onlySoftboard(f)) return "Softboard";
  return (f.zone && placeName(f.zone)) || "Resultados";
}

/** Decimal en español: 2.75 → «2,75». */
const dec = (n: number) => String(n).replace(".", ",");

/** Un mínimo de 0 equivale a no tener mínimo. */
const lo = (n: number | null) => (n ? n : null);

/** Rango en lenguaje natural para la alerta: «de 45 a 60 L», «de 55 L o más», «de hasta 40 L». */
function volumePhrase(f: Filters) {
  const a = lo(f.volMin);
  const b = f.volMax;
  if (a != null && b != null) return ` de ${a} a ${b} L`;
  if (a != null) return ` de ${a} L o más`;
  if (b != null) return ` de hasta ${b} L`;
  return "";
}

/** «entre 7'0" y 7'6"», «desde 7'0"», «de hasta 7'6"». */
function lengthPhrase(f: Filters) {
  const a = f.lenMin != null ? ftLabel(f.lenMin) : null;
  const b = f.lenMax != null ? ftLabel(f.lenMax) : null;
  if (a && b) return ` entre ${a} y ${b}`;
  if (a) return ` desde ${a}`;
  if (b) return ` de hasta ${b}`;
  return "";
}

/** Chip de un rango numérico: «45–60 L», «Desde 55 L», «Hasta 40 L» (un mínimo de 0 no se muestra). */
function rangeChip(min: number | null, max: number | null, unit: string) {
  const a = lo(min);
  if (a != null && max != null) return `${a}–${max}${unit}`;
  if (a != null) return `Desde ${a}${unit}`;
  if (max != null) return `Hasta ${max}${unit}`;
  return `Desde 0${unit}`;
}

/** Texto de la alerta: «Evolutivas de 45 a 60 L, por menos de 200 €, en Gran Canaria». */
export function alertText(f: Filters, names: CatalogNames) {
  const t = f.shapes.length
    ? f.shapes.map((s) => SHAPE_INFO[s].plural).join(" o ")
    : f.constructions.includes("softboard")
      ? "Softboards"
      : "Tablas";
  const v = hasVolumeFilter(f) ? volumePhrase(f) : "";
  const len = lengthPhrase(f);
  const b = f.brand ? ` ${brandName(f.brand, names)}` : "";
  const p = f.priceMax != null ? `, por menos de ${f.priceMax} €` : "";
  const z = f.zone ? `, en ${placeName(f.zone) ?? f.zone}` : ", en toda España";
  return `${t}${b}${len}${v}${p}${z}`;
}

export interface AppliedChip {
  key: string;
  label: string;
  /** Filtros resultantes al quitar el chip. */
  without: Filters;
}

/** Chips de filtros aplicados que se pueden quitar. */
export function appliedChips(f: Filters, names: CatalogNames): AppliedChip[] {
  const out: AppliedChip[] = [];
  const add = (key: string, label: string, patch: Partial<Filters>) => out.push({ key, label, without: { ...f, ...patch } });
  if (f.zone) add("zona", placeName(f.zone) ?? f.zone, { zone: "", dist: null });
  if (f.zone && f.dist) add("distancia", `< ${f.dist} km`, { dist: null });
  if (hasVolumeFilter(f)) add("litros", rangeChip(f.volMin, f.volMax, " L"), { volMin: null, volMax: null });
  if (f.lenMin != null || f.lenMax != null)
    add(
      "largo",
      f.lenMin != null && f.lenMax != null
        ? `${ftLabel(f.lenMin)} – ${ftLabel(f.lenMax)}`
        : f.lenMin != null
          ? `Desde ${ftLabel(f.lenMin)}`
          : `Hasta ${ftLabel(f.lenMax!)}`,
      { lenMin: null, lenMax: null },
    );
  for (const s of f.shapes) add(`forma-${s}`, SHAPE_INFO[s].label, { shapes: f.shapes.filter((x) => x !== s) });
  for (const c of f.constructions)
    add(`cons-${c}`, CONSTRUCTION_INFO[c].label, { constructions: f.constructions.filter((x) => x !== c) });
  if (f.priceMin != null || f.priceMax != null)
    add("precio", rangeChip(f.priceMin, f.priceMax, " €"), { priceMin: null, priceMax: null });
  if (f.brand) add("marca", brandName(f.brand, names), { brand: "", model: "" });
  if (f.model) add("modelo", names.models.find((m) => m.slug === f.model)?.name ?? f.model, { model: "" });
  for (const c of f.conditions) add(`estado-${c}`, CONDITION_LABEL[c], { conditions: f.conditions.filter((x) => x !== c) });
  for (const s of f.sellers) add(`vendedor-${s}`, SELLER_LABEL[s], { sellers: f.sellers.filter((x) => x !== s) });
  if (f.noRepairs) add("sin-reparaciones", "Sin reparaciones", { noRepairs: false });
  if (f.accessories) add("accesorios", "Con funda o accesorios", { accessories: false });
  if (f.fins) add("quillas", finLabel(f.fins), { fins: "" });
  if (f.widthMin != null) add("ancho", `Anchura ≥ ${dec(f.widthMin)}"`, { widthMin: null });
  if (f.thickMin != null) add("grosor", `Grosor ≥ ${dec(f.thickMin)}"`, { thickMin: null });
  if (f.fit) add("para-mi", `Mi rango: ${f.fit.lo}–${f.fit.hi} L`, { fit: null });
  return out;
}

/** Sugerencias del estado vacío: ampliar zona, presupuesto, litros, tipo o quitarlo todo. */
export function emptySuggestions(f: Filters): { label: string; filters: Filters }[] {
  const out: { label: string; filters: Filters }[] = [];
  if (f.zone && f.dist) out.push({ label: "Cualquier distancia", filters: { ...f, dist: null } });
  if (f.zone) out.push({ label: "Toda España", filters: { ...f, zone: "", dist: null } });
  if (f.priceMax != null) {
    const p = f.priceMax + 50;
    out.push({ label: `Hasta ${p} €`, filters: { ...f, priceMax: p } });
  }
  if (hasVolumeFilter(f)) {
    const a = Math.max(0, (f.volMin ?? 0) - 5);
    const b = f.volMax != null ? f.volMax + 5 : null;
    const label = a && b != null ? `${a}–${b} L` : a ? `Desde ${a} L` : b != null ? `Hasta ${b} L` : "Cualquier volumen";
    out.push({ label, filters: { ...f, volMin: a, volMax: b } });
  }
  if (f.shapes.length) out.push({ label: "Cualquier tipo", filters: { ...f, shapes: [] } });
  // Solo si hay algo que quitar (sin filtros, la sugerencia sería la misma búsqueda vacía).
  if (toQuery(f) !== toQuery(emptyFilters())) out.push({ label: "Quitar todos los filtros", filters: emptyFilters() });
  return out;
}

/** Hay algún filtro activo (distinto de la búsqueda vacía). */
export const hasActiveFilters = (f: Filters) => toQuery(f) !== toQuery(emptyFilters());

export type EmptyKind = "inventory" | "filters";

/**
 * Texto del estado sin resultados. Distingue «no hay ninguna tabla publicada» (inventario vacío)
 * de «ninguna coincide con estos filtros», y no habla de filtros si no hay ninguno activo.
 */
export function emptyStateCopy(f: Filters, inventoryTotal: number): { kind: EmptyKind; title: string; text: string } {
  if (inventoryTotal === 0)
    return {
      kind: "inventory",
      title: "Todavía no hay tablas publicadas",
      text: "Reboard acaba de arrancar y aún no hay anuncios activos. Si tienes una tabla parada, publícala gratis. Si buscas, guarda esta búsqueda como alerta y vuelve más adelante para ver cuántas coinciden.",
    };
  return hasActiveFilters(f)
    ? { kind: "filters", title: "No encontramos tablas con estos filtros", text: "Prueba a ampliar la búsqueda. Entre paréntesis, las tablas que verías:" }
    : { kind: "filters", title: "No encontramos tablas", text: "Prueba con otra búsqueda." };
}

/** Texto del botón amarillo del buscador de la home según el recuento. */
export function searchCtaText(count: number, inventoryTotal: number | undefined, fmt: (n: number) => string = String) {
  if (inventoryTotal === 0) return "Buscar tablas";
  if (count === 0) return "Ver alternativas";
  return `Buscar ${fmt(count)} ${count === 1 ? "tabla" : "tablas"}`;
}
