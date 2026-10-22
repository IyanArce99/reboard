// Filas del comparador (equivalente a rowsDef/cmpRows de prototype-logic.js).
// Un valor null se muestra como «Sin indicar»: nunca se inventan datos.

import type { SurferProfile } from "@/components/user/UserStateProvider";
import { eur, fmtIn, inToCm } from "@/lib/domain/format";
import { CONDITION_LABEL, CONSTRUCTION_INFO, SELLER_LABEL, SHAPE_INFO } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { availability, zoneName } from "@/lib/listing/present";

export type CellTone = "default" | "missing" | "good";

export interface CompareCell {
  text: string;
  tone: CellTone;
}

export interface CompareRow {
  label: string;
  /** Los valores no son iguales en todas las columnas. */
  diff: boolean;
  mono: boolean;
  strong: boolean;
  cells: CompareCell[];
}

export const FIT_IN = "Dentro de tu rango";

interface Ctx {
  here: string;
  now: Date;
  profile: SurferProfile | null;
}

type Def = [label: string, value: (l: Listing, c: Ctx) => string | null, mono?: boolean];

const DEFS: Def[] = [
  ["Precio", (l) => eur(l.price), true],
  ["Marca y modelo", (l) => (l.brand ? [l.brand, l.model].filter(Boolean).join(" ") : "Artesanal")],
  ["Longitud", (l) => (l.length.value != null ? `${l.sizeLabel} · ${inToCm(l.length.value)} cm` : l.sizeLabel || null), true],
  ["Volumen", (l) => (l.volume.value != null ? `${l.volume.value} L` : null), true],
  [
    "Anchura / grosor",
    (l) =>
      l.width.value == null && l.thickness.value == null
        ? null
        : `${l.width.value != null ? fmtIn(l.width.value) : "Sin indicar"} / ${l.thickness.value != null ? fmtIn(l.thickness.value) : "Sin indicar"}`,
    true,
  ],
  ["Construcción", (l) => CONSTRUCTION_INFO[l.construction].label],
  ["Tipo", (l) => SHAPE_INFO[l.shape].label],
  ["Estado", (l) => CONDITION_LABEL[l.condition]],
  ["Reparaciones", (l) => (l.repairs ? "Sí · ver ficha" : "Ninguna indicada")],
  ["Ubicación", (l) => `${l.town}, ${zoneName(l)}`],
  ["Distancia", (l, c) => (l.zone !== c.here ? "Otra zona" : l.distanceKm != null ? `${l.distanceKm} km` : null), true],
  ["Disponibilidad", (l, c) => availability(l, c.now).text],
  ["Vendedor", (l) => SELLER_LABEL[l.seller.type]],
  [
    "Te encaja",
    (l, c) => {
      const p = c.profile;
      if (!p) return "Sin perfil";
      const v = l.volume.value;
      if (v == null) return null;
      return v >= p.lo && v <= p.hi ? FIT_IN : "Fuera de tu rango";
    },
  ],
];

export function compareRows(listings: Listing[], ctx: Ctx): CompareRow[] {
  const prices = listings.map((l) => l.price);
  const minP = Math.min(...prices);
  // «La más barata» solo tiene sentido si no todas cuestan lo mismo.
  const priceDiffers = new Set(prices).size > 1;
  return DEFS.map(([label, fn, mono = false]) => {
    const vs = listings.map((l) => fn(l, ctx));
    const diff = new Set(vs.map(String)).size > 1;
    return {
      label,
      diff,
      mono,
      strong: label === "Precio",
      cells: listings.map((l, i) => {
        const v = vs[i];
        if (v == null) return { text: "Sin indicar", tone: "missing" };
        const best = label === "Precio" && priceDiffers && l.price === minP;
        if (best) return { text: `${v} · la más barata`, tone: "good" };
        return { text: v, tone: label === "Te encaja" && v === FIT_IN ? "good" : "default" };
      }),
    };
  });
}
