// Del resultado del asistente a filtros de /buscar y a anuncios compatibles.
// Port de zoneOk/typeOk/volOk/budOk y de los enlaces de wizardVals() (prototype-logic.js).
// Módulo puro: lo usa la isla del resultado sobre los anuncios del rango de litros.

import { ZONES, placeName } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { matches } from "@/lib/search/match";
import { searchHref, withFilters, type Filters } from "@/lib/search/filters";
import type { FinderState, FinderType, Recommendation } from "./recommend";

/** Zonas del paso 7. 'other' abre el desplegable con el resto de zonas. */
export const FINDER_ZONES: [string, string][] = [
  ["", "Toda España"],
  ["canarias", "Canarias"],
  ["gran-canaria", "Gran Canaria"],
  ["tenerife", "Tenerife"],
  ["other", "Otras zonas"],
];

const CANARIAS = ["gran-canaria", "tenerife", "lanzarote", "fuerteventura"];
export const OTHER_ZONES = ZONES.filter((z) => !CANARIAS.includes(z.slug));

export const BUDGETS: [string, string][] = [
  ["", "Sin límite"],
  ["150", "150 €"],
  ["250", "250 €"],
  ["400", "400 €"],
];

/** Slug de zona o región para los filtros ('' = toda España). */
export function finderZone(W: Pick<FinderState, "zone" | "otherZone">) {
  if (W.zone === "other") return OTHER_ZONES.some((z) => z.slug === W.otherZone) ? W.otherZone : "";
  return W.zone === "canarias" || ZONES.some((z) => z.slug === W.zone) ? W.zone : "";
}

export const finderZoneName = (W: Pick<FinderState, "zone" | "otherZone">) => {
  const z = finderZone(W);
  return z ? (placeName(z) ?? z) : "toda España";
};

export const budgetOf = (W: Pick<FinderState, "budget">) => (W.budget ? Number(W.budget) : null);

/** Filtro de /buscar de un tipo: softboard es construcción, el resto, forma. */
export const typeFilter = (t: FinderType): Partial<Filters> =>
  t === "softboard" ? { constructions: ["softboard"] } : { shapes: [t] };

export const typeOk = (l: Listing, types: FinderType[]) =>
  types.some((t) => (t === "softboard" ? l.construction === "softboard" : l.shape === t));

/** Litros, zona y presupuesto del resultado. */
export const baseFilters = (r: Recommendation, zone: string, priceMax: number | null): Filters =>
  withFilters({ volMin: r.lo, volMax: r.hi, zone, priceMax });

/** Filtros de la tarjeta de un tipo: litros, zona, presupuesto y ese tipo. */
export const typeFilters = (r: Recommendation, zone: string, priceMax: number | null, t: FinderType): Filters => ({
  ...baseFilters(r, zone, priceMax),
  ...typeFilter(t),
});

/**
 * Filtros de «Ver N tablas» y de la alerta. /buscar no combina forma O construcción,
 * así que, como en el prototipo, la softboard se deja fuera cuando hay otras formas.
 */
export function resultFilters(r: Recommendation, zone: string, priceMax: number | null): Filters {
  const shapes = r.types.filter((t): t is Exclude<FinderType, "softboard"> => t !== "softboard");
  return {
    ...baseFilters(r, zone, priceMax),
    ...(shapes.length ? { shapes } : r.types.includes("softboard") ? { constructions: ["softboard"] } : {}),
  };
}

/** Anuncios que cumplen volumen, tipo, zona y presupuesto. */
export const compatible = (pool: Listing[], r: Recommendation, zone: string, priceMax: number | null, types = r.types) =>
  pool.filter((l) => typeOk(l, types) && matches(l, baseFilters(r, zone, priceMax)));

export const countFor = (pool: Listing[], f: Filters) => pool.reduce((n, l) => n + (matches(l, f) ? 1 : 0), 0);

export interface WidenOption {
  key: "zone" | "budget" | "alt";
  label: string;
  count: number;
  /** Solo «alt»: enlace a /buscar. Las otras dos cambian la respuesta del paso 7. */
  href?: string;
  /** Solo «budget»: el presupuesto ampliado. */
  budget?: number;
}

/**
 * Formas de ampliar la búsqueda cuando no hay tablas compatibles. Solo se ofrecen las que
 * de verdad encuentran algo: nada de «Ampliar a toda España (0)».
 */
export function widenOptions(pool: Listing[], r: Recommendation, zone: string, priceMax: number | null): WidenOption[] {
  const out: WidenOption[] = [];
  if (zone) {
    const count = compatible(pool, r, "", priceMax).length;
    out.push({ key: "zone", label: `Ampliar a toda España (${count})`, count });
  }
  if (priceMax != null) {
    const nb = priceMax + 100;
    const count = compatible(pool, r, zone, nb).length;
    out.push({ key: "budget", label: `Subir presupuesto a ${nb} € (${count})`, count, budget: nb });
  }
  const alt = baseFilters(r, zone, priceMax);
  const count = countFor(pool, alt);
  out.push({ key: "alt", label: `Ver alternativas con tu volumen (${count})`, count, href: searchHref(alt) });
  return out.filter((o) => o.count > 0);
}
