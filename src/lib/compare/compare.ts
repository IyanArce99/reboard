// Comparador de tablas (/comparar): lógica pura y determinista, sin red ni IA.
// Todo sale de los datos del anuncio; lo que falta se muestra como «Sin indicar» y nunca se deduce.
// Recibe `Listing`, pero solo lee los campos de `ComparableBoard`: cuando haya tablas nuevas de
// tiendas, bastará con que también cumplan esa forma (docs/COMPARATOR.md).

import { eur, fmtIn, inToCm } from "@/lib/domain/format";
import { CONDITION_LABEL, CONSTRUCTION_INFO, SELLER_LABEL, SHAPE_INFO, type Shape } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { availability, listingShortLabel, zoneName } from "@/lib/listing/present";

export const MAX_COMPARE = 4;
/** Cada tabla se identifica con una letra en la cabecera, el resumen y el rango de litros. */
export const LETTERS = ["A", "B", "C", "D"] as const;

/** Lo que guarda el navegador de cada tabla en comparación (rb-usuario-v1). */
export interface CompareItem {
  id: string;
  label: string;
  /** Miniatura para la barra (URL pública de la primera foto). */
  photo?: string | null;
  /** Silueta para la barra cuando no hay foto. */
  shape?: Shape;
}

const ID = /^a\d{1,15}$/;
const SHAPES: Shape[] = ["shortboard", "fish", "hibrida", "evolutiva", "midlength", "longboard", "gun"];

/**
 * Selección guardada → selección válida. El comparador nunca se rompe por datos antiguos o
 * manipulados de localStorage: ids con otro formato, duplicados, etiquetas raras o más de 4.
 */
export function sanitizeCompare(raw: unknown): CompareItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CompareItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const { id, label, photo, shape } = x as Record<string, unknown>;
    if (typeof id !== "string" || !ID.test(id) || out.some((c) => c.id === id)) continue;
    out.push({
      id,
      label: typeof label === "string" && label.trim() ? label.slice(0, 60) : "Tabla",
      photo: typeof photo === "string" && /^(https:\/\/|\/)/.test(photo) ? photo : null,
      shape: SHAPES.includes(shape as Shape) ? (shape as Shape) : undefined,
    });
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

/** `?ids=a1,a2` de un enlace compartido → ids válidos (sin repetir, máximo 4). */
export function parseIdsParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return sanitizeCompare(raw.split(",").map((id) => ({ id: id.trim(), label: "Tabla" }))).map((c) => c.id);
}

/** Enlace para compartir una comparación. */
export const compareSharePath = (ids: string[]) => `/comparar?ids=${ids.join(",")}`;

export const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Elemento de la selección a partir de un anuncio (tarjetas y ficha). */
export const compareItemOf = (l: Listing): CompareItem => ({
  id: l.id,
  label: listingShortLabel(l),
  photo: l.photos[0]?.url ?? null,
  shape: l.shape,
});

// ——— Rango de litros de TablaFinder ———

export interface FitProfile {
  lo: number;
  hi: number;
}
export type FitState = "in" | "below" | "above" | "unknown";

/** Posición de los litros respecto al rango orientativo; «unknown» si el anuncio no los indica. */
export function fitOf(volume: number | null, p: FitProfile): { state: FitState; delta: number } {
  if (volume == null) return { state: "unknown", delta: 0 };
  if (volume < p.lo) return { state: "below", delta: round1(p.lo - volume) };
  if (volume > p.hi) return { state: "above", delta: round1(volume - p.hi) };
  return { state: "in", delta: 0 };
}

export const FIT_TEXT: Record<FitState, string> = {
  in: "Dentro de tu rango",
  below: "Por debajo de tu rango",
  above: "Por encima de tu rango",
  unknown: "Sin litros indicados",
};

export function fitText(volume: number | null, p: FitProfile) {
  const f = fitOf(volume, p);
  if (f.state === "below" || f.state === "above") return `${FIT_TEXT[f.state]} (${f.state === "below" ? "−" : "+"}${dec(f.delta)} L)`;
  return FIT_TEXT[f.state];
}

// ——— Filas agrupadas ———

export type CellTone = "default" | "missing" | "good" | "warn";

export interface CompareCell {
  text: string;
  tone: CellTone;
}

export interface CompareRow {
  key: string;
  label: string;
  /** Los valores no son iguales en todas las tablas. */
  diff: boolean;
  /** Números (precio y medidas): cifras tabulares. */
  numeric?: boolean;
  cells: CompareCell[];
}

export interface CompareGroup {
  title: string;
  rows: CompareRow[];
}

interface Ctx {
  now: Date;
  profile: FitProfile | null;
}

type Value = string | null | { text: string; tone: CellTone };
type Def = { key: string; label: string; numeric?: boolean; value: (l: Listing, c: Ctx, all: Listing[]) => Value };

const cm = (inches: number) => `${inToCm(inches)} cm`;

const GROUPS: { title: string; defs: Def[] }[] = [
  {
    title: "Precio y ubicación",
    defs: [
      {
        key: "precio",
        label: "Precio",
        numeric: true,
        value: (l, _c, all) => {
          const prices = all.map((x) => x.price);
          // «La más barata» es un dato objetivo, no una recomendación: solo si no cuestan todas lo mismo.
          const cheapest = new Set(prices).size > 1 && l.price === Math.min(...prices);
          return { text: cheapest ? `${eur(l.price)} · la más barata` : eur(l.price), tone: cheapest ? "good" : "default" };
        },
      },
      { key: "ubicacion", label: "Ubicación", value: (l) => (l.town ? `${l.town}, ${zoneName(l)}` : zoneName(l)) },
      {
        key: "disponibilidad",
        label: "Disponibilidad",
        value: (l, c) => {
          const a = availability(l, c.now);
          return { text: a.text, tone: a.tone === "success" ? "default" : "warn" };
        },
      },
    ],
  },
  {
    title: "Medidas y volumen",
    defs: [
      { key: "longitud", label: "Longitud", numeric: true, value: (l) => (l.length.value != null ? `${l.sizeLabel} · ${cm(l.length.value)}` : l.sizeLabel || null) },
      { key: "anchura", label: "Anchura", numeric: true, value: (l) => (l.width.value != null ? `${fmtIn(l.width.value)} · ${cm(l.width.value)}` : null) },
      { key: "grosor", label: "Grosor", numeric: true, value: (l) => (l.thickness.value != null ? `${fmtIn(l.thickness.value)} · ${cm(l.thickness.value)}` : null) },
      { key: "litros", label: "Litros", numeric: true, value: (l) => (l.volume.value != null ? `${dec(l.volume.value)} L` : null) },
      {
        key: "rango",
        label: "Tu rango de litros",
        value: (l, c) => {
          if (!c.profile) return null;
          const f = fitOf(l.volume.value, c.profile);
          return { text: fitText(l.volume.value, c.profile), tone: f.state === "in" ? "good" : f.state === "unknown" ? "missing" : "default" };
        },
      },
    ],
  },
  {
    title: "Forma y construcción",
    defs: [
      { key: "tipo", label: "Tipo", value: (l) => SHAPE_INFO[l.shape].label },
      { key: "construccion", label: "Construcción", value: (l) => CONSTRUCTION_INFO[l.construction].label },
      { key: "quillas", label: "Quillas", value: (l) => l.fins.value },
    ],
  },
  {
    title: "Estado y accesorios",
    defs: [
      { key: "estado", label: "Estado", value: (l) => CONDITION_LABEL[l.condition] },
      // «Ninguna indicada»: el vendedor no ha declarado reparaciones; no afirmamos que no las tenga.
      { key: "reparaciones", label: "Reparaciones", value: (l) => (l.repairs ? "Declara reparaciones" : "Ninguna indicada") },
      { key: "accesorios", label: "Accesorios", value: (l) => l.accessories.value },
      { key: "vendedor", label: "Vendedor", value: (l) => SELLER_LABEL[l.seller.type] },
    ],
  },
];

/** Grupos de filas del comparador. «Tu rango de litros» solo aparece con un perfil de TablaFinder. */
export function compareGroups(listings: Listing[], ctx: Ctx): CompareGroup[] {
  return GROUPS.map((g) => ({
    title: g.title,
    rows: g.defs
      .filter((d) => d.key !== "rango" || ctx.profile)
      .map((d) => {
        const cells = listings.map((l): CompareCell => {
          const v = d.value(l, ctx, listings);
          if (v == null) return { text: "Sin indicar", tone: "missing" };
          return typeof v === "string" ? { text: v, tone: "default" } : v;
        });
        // Distintas si cambia algún valor; con «la más barata» se compara solo el precio.
        const key = (c: CompareCell, i: number) => (d.key === "precio" ? String(listings[i].price) : c.text);
        return { key: d.key, label: d.label, numeric: d.numeric, diff: new Set(cells.map(key)).size > 1, cells };
      }),
  }));
}

// ——— «Diferencias principales» ———

const round1 = (n: number) => Math.round(n * 10) / 10;
const dec = (n: number) => String(round1(n)).replace(".", ",");

/** «A», «A y B», «A, B y C». */
export function joinLetters(xs: string[]) {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

export interface SummaryLine {
  key: string;
  text: string;
}

/**
 * Frases cortas y objetivas sobre lo que cambia entre las tablas. Deterministas: mismo orden y mismo
 * texto para los mismos datos. Sin datos suficientes no se afirma nada (p. ej., litros sin indicar).
 * No dicen cuál es «mejor»: más litros o menos longitud no es mejor ni peor en abstracto.
 */
export function compareSummary(listings: Listing[], now: Date): SummaryLine[] {
  const n = listings.length;
  if (n < 2) return [];
  const L = (i: number) => LETTERS[i];
  const both = n === 2;
  const out: SummaryLine[] = [];

  // Precio
  const prices = listings.map((l) => l.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  if (minP === maxP) out.push({ key: "precio", text: `${both ? "Las dos cuestan" : "Todas cuestan"} lo mismo: ${eur(minP)}.` });
  else if (both) {
    const [cheap, dear] = prices[0] < prices[1] ? [0, 1] : [1, 0];
    out.push({ key: "precio", text: `La ${L(cheap)} cuesta ${eur(maxP - minP)} menos que la ${L(dear)}.` });
  } else {
    const cheap = listings.map((_, i) => i).filter((i) => prices[i] === minP).map(L);
    const dear = listings.map((_, i) => i).filter((i) => prices[i] === maxP).map(L);
    out.push({
      key: "precio",
      text: `${cheap.length > 1 ? `Las más baratas son la ${joinLetters(cheap)}` : `La más barata es la ${cheap[0]}`} (${eur(minP)}); ${dear.length > 1 ? `las más caras, la ${joinLetters(dear)}` : `la más cara, la ${dear[0]}`} (${eur(maxP)}): ${eur(maxP - minP)} de diferencia.`,
    });
  }

  // Litros (solo con los que los indican)
  const vols = listings.map((l, i) => ({ i, v: l.volume.value })).filter((x): x is { i: number; v: number } => x.v != null);
  const noVol = listings.map((l, i) => ({ i, v: l.volume.value })).filter((x) => x.v == null).map((x) => L(x.i));
  if (vols.length >= 2) {
    const lo = vols.reduce((a, b) => (b.v < a.v ? b : a));
    const hi = vols.reduce((a, b) => (b.v > a.v ? b : a));
    if (lo.v === hi.v) out.push({ key: "litros", text: `${vols.length === n ? (both ? "Las dos tienen" : "Todas tienen") : `La ${joinLetters(vols.map((x) => L(x.i)))} tienen`} ${dec(lo.v)} L.` });
    else if (vols.length === 2) out.push({ key: "litros", text: `La ${L(hi.i)} tiene ${dec(hi.v - lo.v)} L más que la ${L(lo.i)} (${dec(hi.v)} L frente a ${dec(lo.v)} L).` });
    else out.push({ key: "litros", text: `Litros: de ${dec(lo.v)} L (${L(lo.i)}) a ${dec(hi.v)} L (${L(hi.i)}).` });
  }
  if (noVol.length) out.push({ key: "sin-litros", text: `${noVol.length > 1 ? `La ${joinLetters(noVol)} no indican` : `La ${noVol[0]} no indica`} los litros: no se pueden comparar en volumen.` });

  // Longitud
  const lens = listings.map((l, i) => ({ i, v: l.length.value, label: l.sizeLabel })).filter((x): x is { i: number; v: number; label: string } => x.v != null);
  if (lens.length >= 2) {
    const lo = lens.reduce((a, b) => (b.v < a.v ? b : a));
    const hi = lens.reduce((a, b) => (b.v > a.v ? b : a));
    const d = inToCm(hi.v) - inToCm(lo.v);
    if (d >= 1) {
      out.push({
        key: "longitud",
        text: lens.length === 2 ? `La ${L(hi.i)} es ${d} cm más larga que la ${L(lo.i)} (${hi.label} frente a ${lo.label}).` : `Longitud: de ${lo.label} (${L(lo.i)}) a ${hi.label} (${L(hi.i)}).`,
      });
    }
  }

  // Tipo y construcción: solo si cambian.
  const byValue = (f: (l: Listing) => string) => {
    const m = new Map<string, string[]>();
    listings.forEach((l, i) => m.set(f(l), [...(m.get(f(l)) ?? []), L(i)]));
    return m;
  };
  // «evolutiva (A y B), fish (C) y shortboard (D)»
  const grouped = (m: Map<string, string[]>) => joinLetters([...m].map(([v, ls]) => `${v} (${joinLetters(ls)})`));
  const shapes = byValue((l) => SHAPE_INFO[l.shape].label.toLowerCase());
  if (shapes.size > 1) out.push({ key: "tipo", text: `Tipos distintos: ${grouped(shapes)}.` });
  const cons = byValue((l) => (l.construction === "pu" ? "PU" : CONSTRUCTION_INFO[l.construction].short.toLowerCase()));
  if (cons.size > 1) out.push({ key: "construccion", text: `Construcción distinta: ${grouped(cons)}.` });

  // Reparaciones declaradas
  const rep = listings.map((l, i) => (l.repairs ? L(i) : null)).filter((x): x is (typeof LETTERS)[number] => !!x);
  if (rep.length === n) out.push({ key: "reparaciones", text: `${both ? "Las dos declaran" : "Todas declaran"} reparaciones: mira el detalle en cada anuncio.` });
  else if (rep.length) out.push({ key: "reparaciones", text: `${rep.length > 1 ? `La ${joinLetters(rep)} declaran` : `La ${rep[0]} declara`} reparaciones; ${n - rep.length > 1 ? "las demás no indican ninguna" : `la ${LETTERS.slice(0, n).find((x) => !rep.includes(x))} no indica ninguna`}.` });

  // Ubicación
  const zones = byValue((l) => zoneName(l));
  if (zones.size === 1) out.push({ key: "ubicacion", text: `${both ? "Las dos están" : "Todas están"} en ${[...zones.keys()][0]}.` });
  else out.push({ key: "ubicacion", text: `En islas distintas: ${[...zones].map(([z, ls]) => `${joinLetters(ls)} en ${z}`).join("; ")}.` });

  // Anuncios que ya no se pueden contactar
  const off = listings.map((l, i) => ({ i, l })).filter((x) => x.l.status === "vendida" || x.l.status === "caducada" || x.l.status === "retirada");
  for (const x of off) out.push({ key: `estado-${x.i}`, text: `La ${L(x.i)} está ${availability(x.l, now).text.toLowerCase()}: ya no se puede contactar.` });

  return out;
}
