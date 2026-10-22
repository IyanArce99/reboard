// Textos derivados de los filtros: títulos, chips aplicados, texto de alerta y sugerencias.

import {
  CONDITION_LABEL,
  CONSTRUCTION_INFO,
  NO_BRAND,
  SELLER_LABEL,
  SHAPE_INFO,
  placeName,
} from "@/lib/domain/taxonomy";
import { ftLabel } from "@/lib/domain/format";
import { emptyFilters, finLabel, hasVolumeFilter, type Filters } from "./filters";

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
export function resultsTitle(f: Filters, names: CatalogNames) {
  const shape = singleShape(f);
  const z = f.zone ? placeName(f.zone) : null;
  const where = z ? ` en ${z}` : "";
  if (shape === "fish") return `Tablas fish de segunda mano${where}`;
  const head = shape
    ? SHAPE_INFO[shape].plural
    : onlySoftboard(f)
      ? "Softboards"
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

/** Texto de la alerta: «Evolutivas de 45–60 L, por menos de 200 €, en Gran Canaria». */
export function alertText(f: Filters, names: CatalogNames) {
  const t = f.shapes.length
    ? f.shapes.map((s) => SHAPE_INFO[s].plural).join(" o ")
    : f.constructions.includes("softboard")
      ? "Softboards"
      : "Tablas";
  const v = hasVolumeFilter(f) ? ` de ${f.volMin ?? 0}–${f.volMax ?? "∞"} L` : "";
  const len =
    f.lenMin != null || f.lenMax != null
      ? ` entre ${f.lenMin != null ? ftLabel(f.lenMin) : "—"} y ${f.lenMax != null ? ftLabel(f.lenMax) : "—"}`
      : "";
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
  if (hasVolumeFilter(f)) add("litros", `${f.volMin ?? 0}–${f.volMax ?? "∞"} L`, { volMin: null, volMax: null });
  if (f.lenMin != null || f.lenMax != null)
    add("largo", `${f.lenMin != null ? ftLabel(f.lenMin) : "…"} – ${f.lenMax != null ? ftLabel(f.lenMax) : "…"}`, { lenMin: null, lenMax: null });
  for (const s of f.shapes) add(`forma-${s}`, SHAPE_INFO[s].label, { shapes: f.shapes.filter((x) => x !== s) });
  for (const c of f.constructions)
    add(`cons-${c}`, CONSTRUCTION_INFO[c].label, { constructions: f.constructions.filter((x) => x !== c) });
  if (f.priceMin != null || f.priceMax != null)
    add("precio", `${f.priceMin ?? 0}–${f.priceMax ?? "∞"} €`, { priceMin: null, priceMax: null });
  if (f.brand) add("marca", brandName(f.brand, names), { brand: "", model: "" });
  if (f.model) add("modelo", names.models.find((m) => m.slug === f.model)?.name ?? f.model, { model: "" });
  for (const c of f.conditions) add(`estado-${c}`, CONDITION_LABEL[c], { conditions: f.conditions.filter((x) => x !== c) });
  for (const s of f.sellers) add(`vendedor-${s}`, SELLER_LABEL[s], { sellers: f.sellers.filter((x) => x !== s) });
  if (f.noRepairs) add("sin-reparaciones", "Sin reparaciones", { noRepairs: false });
  if (f.accessories) add("accesorios", "Con accesorios", { accessories: false });
  if (f.fins) add("quillas", finLabel(f.fins), { fins: "" });
  if (f.widthMin != null) add("ancho", `≥ ${f.widthMin}" ancho`, { widthMin: null });
  if (f.thickMin != null) add("grosor", `≥ ${f.thickMin}" grosor`, { thickMin: null });
  if (f.fit) add("para-mi", "Solo para mí", { fit: null });
  return out;
}

/** Sugerencias del estado vacío: ampliar zona, presupuesto, litros, forma o quitarlo todo. */
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
    out.push({ label: `Litros ${a}–${b ?? "∞"}`, filters: { ...f, volMin: a, volMax: b } });
  }
  if (f.shapes.length) out.push({ label: "Cualquier forma", filters: { ...f, shapes: [] } });
  out.push({ label: "Quitar todos los filtros", filters: emptyFilters() });
  return out;
}
