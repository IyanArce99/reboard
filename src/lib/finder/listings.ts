// Del resultado del asistente a filtros de /buscar y a anuncios compatibles.
// Port de zoneOk/typeOk/volOk/budOk y de los enlaces de wizardVals() (prototype-logic.js).
// Módulo puro: lo usa la isla del resultado sobre los anuncios del rango de litros.

import { ZONES, placeName } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { matches } from "@/lib/search/match";
import { withFilters, type Filters } from "@/lib/search/filters";
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
