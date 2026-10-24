// Lectura de las medidas que escribe el vendedor (parsePaste del prototipo,
// design/source/prototype-logic.js, ampliado). Módulo puro, sin dependencias de React: lo usan el
// formulario de publicar (para avisar y enseñar cómo se ha entendido cada dato) y el servidor.
//
// La gente escribe las medidas de mil maneras: «6'4"», «6’4”» (teclado del móvil), «6.4», «6,4»,
// «20 1/2"», «20½», «20-1/2», «20,5 pulgadas», «52 cm», «1,93 m»… Todo pasa por normalizeMeasure()
// y readMeasure(), que además corrige la unidad cuando el número solo tiene sentido en la otra
// (p. ej. «52» de anchura con «pies y pulgadas» elegido son centímetros: 52" no existe).

import { fmtIn, ftLabel } from "@/lib/domain/format";

export type MeasureKey = "len" | "width" | "thick" | "vol";
export type Unit = "ft" | "cm";

export interface ParsedMeasures {
  len?: string;
  width?: string;
  thick?: string;
  vol?: string;
}

/** Límites admitidos, en pulgadas y litros: los mismos que schema.ts y los CHECK de public.listings. */
export const MEASURE_LIMITS = {
  len: [48, 144],
  width: [14, 30],
  thick: [1.5, 5],
  vol: [10, 150],
} as const;

const inRange = (k: MeasureKey, n: number) => n >= MEASURE_LIMITS[k][0] && n <= MEASURE_LIMITS[k][1];

const FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
};

/**
 * Deja una medida en una forma única: minúsculas, comillas rectas (' y "), fracciones «½» → « 1/2»,
 * barra de fracción «⁄» → «/», «''» → «"» y espacios simples.
 */
export function normalizeMeasure(text: string): string {
  return text
    .toLowerCase()
    .replace(/[½¼¾⅛⅜⅝⅞⅓⅔⅙⅚⅕⅖⅗⅘]/g, (c) => ` ${FRACTIONS[c]}`)
    .replace(/⁄/g, "/")
    .replace(/[’‘′`´]/g, "'")
    .replace(/''|[“”″]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const CM_SUFFIX = / ?(?:cm|cms|centímetros?|centimetros?)\.?$/;
const M_SUFFIX = / ?(?:m|mts?|metros?)\.?$/;
const IN_SUFFIX = / ?(?:"|in|inch|inches|pulgadas?|pulg\.?)$/;
const FT_MARK = /'|ft|pies?\b/;

/** Número con coma o punto decimal («52», «52,5», «52.5»). */
const plainNumber = (s: string) => {
  if (!/^\d+(?:[.,]\d+)?$/.test(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Pulgadas: «21 1/2"», «21-1/2», «21 y 1/2», «21½», «21.5», «21,5 in», «2 7/8''». null si no se entiende. */
export function parseInches(text: string): number | null {
  const s = normalizeMeasure(text).replace(IN_SUFFIX, "").trim();
  if (!s) return null;
  const plain = plainNumber(s);
  if (plain != null) return plain;
  // Entero y fracción separados («21 1/2», «21-1/2», «21 y 1/2»): «21/2» no es 21 ½.
  const m = s.match(/^(?:(\d+)(?: y |[ -]))?(\d+)\/(\d+)$/);
  if (!m) return null;
  const num = Number(m[2]);
  const den = Number(m[3]);
  if (!den || num >= den) return null;
  const n = (m[1] ? Number(m[1]) : 0) + num / den;
  return n > 0 ? n : null;
}

/**
 * Longitud en pies y pulgadas → pulgadas. Acepta cómo la escribe la gente de verdad (también con el
 * teclado del móvil, que cambia ' y " por comillas tipográficas):
 * «7'2"», «7’2”», «7′2″», «7'2''», «7' 2», «7'», «7.2», «7,2», «7 2», «7-2», «7 ft 2 in», «7 pies 2»,
 * «6'4 1/2"» y «7». «7.2» se lee como 7'2" (así lo escriben los surfistas), no como 7,2 pies.
 * Pulgadas de 0 a 11.
 */
export function parseFeet(text: string): number | null {
  const s = normalizeMeasure(text);
  const bare = s.match(/^(\d{1,2})$/);
  // Un número suelto solo son pies si cabe en una tabla («7»); «80» no son 80 pies.
  if (bare && Number(bare[1]) > 12) return null;
  const m =
    s.match(/^(\d{1,2}) ?(?:'|ft|pies?) ?(?:(\d{1,2}(?:[.,]5| 1\/2)?) ?(?:"|in|pulgadas?)?)?$/) ??
    s.match(/^(\d{1,2})[.,\- ](\d{1,2})"?$/) ??
    bare;
  if (!m) return null;
  const feet = Number(m[1]);
  const inches = m[2] ? Number(m[2].replace(",", ".").replace(" 1/2", ".5")) : 0;
  if (inches >= 12) return null;
  const n = feet * 12 + inches;
  return n > 0 ? n : null;
}

/** Cómo se ha entendido una medida: en pulgadas, y en qué unidad la escribió el vendedor. */
export interface Reading {
  inches: number;
  as: "ft" | "in" | "cm" | "m";
}

/**
 * Lee una medida de longitud, anchura o grosor. La unidad escrita («cm», «m», «'», «"») manda sobre
 * la elegida en el formulario; un número suelto se lee en la unidad elegida y, si así no tiene
 * sentido pero en la otra sí, en la otra (las dos escalas apenas se solapan).
 */
export function readMeasure(key: Exclude<MeasureKey, "vol">, text: string, unit: Unit): Reading | null {
  const s = normalizeMeasure(text);
  if (!s) return null;

  if (CM_SUFFIX.test(s)) {
    const cm = plainNumber(s.replace(CM_SUFFIX, "").trim());
    return cm == null ? null : { inches: cm / 2.54, as: "cm" };
  }
  if (key === "len" && M_SUFFIX.test(s) && !FT_MARK.test(s)) {
    const m = plainNumber(s.replace(M_SUFFIX, "").trim());
    return m == null || m >= 5 ? null : { inches: (m * 100) / 2.54, as: "m" };
  }
  if (key === "len") {
    if (FT_MARK.test(s)) {
      const ft = parseFeet(s);
      return ft == null ? null : { inches: ft, as: "ft" };
    }
    // «76"»: pulgadas totales.
    if (IN_SUFFIX.test(s)) {
      const n = plainNumber(s.replace(IN_SUFFIX, "").trim());
      return n == null ? null : { inches: n, as: "in" };
    }
    const n = plainNumber(s);
    if (unit === "cm") {
      if (n != null && n < 4) return { inches: (n * 100) / 2.54, as: "m" }; // «1,93» → metros
      if (n != null && n > 12) return { inches: n / 2.54, as: "cm" };
      // «6.4» o «6 4» con cm elegido: son pies y pulgadas.
      const ft = parseFeet(s);
      return ft == null ? null : { inches: ft, as: "ft" };
    }
    const ft = parseFeet(s);
    if (ft != null) return { inches: ft, as: "ft" };
    // «193» con pies elegido: solo puede ser cm.
    return n != null && n >= 100 ? { inches: n / 2.54, as: "cm" } : null;
  }

  // Anchura y grosor.
  if (IN_SUFFIX.test(s) || /\//.test(s)) {
    const n = parseInches(s);
    return n == null ? null : { inches: n, as: "in" };
  }
  const n = plainNumber(s);
  if (n == null) return null;
  const asIn = { inches: n, as: "in" as const };
  const asCm = { inches: n / 2.54, as: "cm" as const };
  const [first, second] = unit === "cm" ? [asCm, asIn] : [asIn, asCm];
  return inRange(key, first.inches) || !inRange(key, second.inches) ? first : second;
}

/** Valor de un campo de medida a pulgadas, según la unidad elegida (null si no se entiende). */
export function fieldToInches(key: Exclude<MeasureKey, "vol">, text: string, unit: Unit): number | null {
  return readMeasure(key, text, unit)?.inches ?? null;
}

/** Litros: «34», «34,5», «34.5 L», «34 lts», «34 litros». */
export function parseLitres(text: string): number | null {
  const s = normalizeMeasure(text).replace(/ ?(?:l|lt|lts|ltr|ltrs|litros?)\.?$/, "");
  const n = plainNumber(s);
  return n == null ? null : Math.round(n * 10) / 10;
}

const LABEL: Record<MeasureKey, string> = { len: "la longitud", width: "la anchura", thick: "el grosor", vol: "los litros" };
const EXAMPLE: Record<MeasureKey, Record<Unit, string>> = {
  len: { ft: `6'4" o 6.4`, cm: "193" },
  width: { ft: `20 1/2" o 20,5`, cm: "52" },
  thick: { ft: `2 5/8" o 2,6`, cm: "6,7" },
  vol: { ft: "34 o 34,5", cm: "34 o 34,5" },
};
const cmText = (inches: number, decimals: number) =>
  `${(Math.round(inches * 2.54 * 10 ** decimals) / 10 ** decimals).toLocaleString("es-ES")} cm`;

/** Lectura que se enseña bajo cada campo: qué hemos entendido o qué no cuadra. null si está vacío. */
export function describeMeasure(key: MeasureKey, text: string, unit: Unit): { ok: boolean; text: string } | null {
  if (!text.trim()) return null;
  if (key === "vol") {
    const l = parseLitres(text);
    if (l == null) return { ok: false, text: `No lo hemos entendido. Escribe solo el número, como ${EXAMPLE.vol.ft}.` };
    if (!inRange("vol", l)) return { ok: false, text: `${l.toLocaleString("es-ES")} L no cuadra: una tabla tiene entre 10 y 150 L.` };
    return { ok: true, text: `${l.toLocaleString("es-ES")} litros` };
  }
  const r = readMeasure(key, text, unit);
  if (!r) return { ok: false, text: `No lo hemos entendido. Escríbelo así: ${EXAMPLE[key][unit]}.` };
  const shown =
    key === "len"
      ? `${Math.floor(r.inches / 12)}'${fmtIn(r.inches % 12)} · ${cmText(r.inches, 0)}`
      : `${fmtIn(r.inches)} · ${cmText(r.inches, 1)}`;
  if (!inRange(key, r.inches)) {
    const [lo, hi] = MEASURE_LIMITS[key];
    const range = key === "len" ? `4' y 12' (122–366 cm)` : `${fmtIn(lo)} y ${fmtIn(hi)}`;
    return { ok: false, text: `${shown} no cuadra: ${LABEL[key]} debe estar entre ${range}. Revisa la unidad.` };
  }
  // Si se ha leído en otra unidad que la elegida, se dice: así nadie se lleva sorpresas.
  const other = (unit === "ft" && (r.as === "cm" || r.as === "m")) || (unit === "cm" && (r.as === "ft" || r.as === "in"));
  return { ok: true, text: other ? `Lo hemos leído en ${r.as === "ft" ? "pies" : r.as === "in" ? "pulgadas" : r.as === "m" ? "metros" : "cm"}: ${shown}` : shown };
}

const VOL_RE = /(\d{2,3}(?:[.,]\d+)?) ?(?:l|lt|lts|ltr|litros?)\b\.?/;

/**
 * Medidas pegadas tal cual: «7'2 x 21 1/2 x 2 7/8 47L», «6’4” × 20½” × 2⅝” — 34 L»,
 * «193 x 52 x 6,7 cm 34l». Devuelve la propuesta en pies y pulgadas (el formulario la pasa a cm si
 * es la unidad elegida).
 */
export function parseMeasures(input: string): ParsedMeasures {
  let s = normalizeMeasure(input);
  const out: ParsedMeasures = {};
  if (!s) return out;

  const v = s.match(VOL_RE);
  if (v) {
    const l = parseLitres(v[1]);
    if (l != null) out.vol = String(l).replace(".", ",");
    s = s.replace(VOL_RE, " ");
  }
  // «cm» al final vale para las tres medidas («193 x 52 x 6,7 cm»).
  const allCm = CM_SUFFIX.test(s.replace(/[\s·—–-]+$/, ""));
  s = s.replace(/[\s·—–-]+$/, "").replace(CM_SUFFIX, "");
  const parts = s
    .split(/ ?[x×*] ?/)
    .map((x) => x.replace(/^[\s·—–-]+|[\s·—–-]+$/g, ""))
    .filter(Boolean);
  const unit: Unit = allCm ? "cm" : "ft";
  const keys = ["len", "width", "thick"] as const;

  if (parts.length >= 2) {
    keys.forEach((k, i) => {
      const r = parts[i] ? readMeasure(k, parts[i], unit) : null;
      if (r) out[k] = k === "len" ? ftLabel(Math.round(r.inches)) : fmtIn(r.inches);
    });
  } else {
    const ft = s.match(/(\d{1,2}) ?' ?(\d{1,2})?/);
    if (ft) out.len = `${ft[1]}'${ft[2] || 0}"`;
  }
  return out;
}
