// Interpretación de medidas pegadas por el vendedor (parsePaste del prototipo,
// design/source/prototype-logic.js). Módulo puro, sin dependencias de React.
// El resultado es una PROPUESTA: la UI la marca «Propuesta automática · revísala»
// hasta que el vendedor confirma cada dato.

export type MeasureKey = "len" | "width" | "thick" | "vol";
export type Unit = "ft" | "cm";

export interface ParsedMeasures {
  len?: string;
  width?: string;
  thick?: string;
  vol?: string;
}

const VOL_RE = /(\d{2}(?:[.,]\d+)?)\s*(l|lts|litros)\b/i;

/** «7'2 x 21 1/2 x 2 7/8 47L» → { len: 7'2", width: 21 1/2", thick: 2 7/8", vol: 47 }. */
export function parseMeasures(input: string): ParsedMeasures {
  const s = input.trim();
  const out: ParsedMeasures = {};
  if (!s) return out;

  const ft = s.match(/(\d)\s*['’]\s*(\d{1,2})?/);
  if (ft) out.len = `${ft[1]}'${ft[2] || 0}"`;

  const v = s.match(VOL_RE);
  if (v) out.vol = v[1].replace(",", ".");

  const parts = s
    .replace(VOL_RE, "")
    .split(/x|×/i)
    .map((x) => x.trim());
  if (parts[1]) out.width = `${parts[1].replace(/["”]/g, "")}"`;
  if (parts[2]) out.thick = `${parts[2].replace(/["”]/g, "")}"`;

  return out;
}

/** «21 1/2"», «21.5», «2 7/8» → pulgadas decimales. null si no se entiende. */
export function parseInches(text: string): number | null {
  const s = text.replace(/["”]/g, "").replace(",", ".").trim();
  const m = s.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?$/);
  if (!m || (!m[1] && !m[2])) return null;
  const whole = m[1] ? Number(m[1]) : 0;
  const frac = m[2] && m[3] && Number(m[3]) ? Number(m[2]) / Number(m[3]) : 0;
  const n = whole + frac;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** «7'2"» → 86 pulgadas. También acepta «7'». */
export function parseFeet(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})\s*['’]\s*(\d{1,2})?\s*["”]?$/);
  if (!m) return null;
  const n = Number(m[1]) * 12 + (m[2] ? Number(m[2]) : 0);
  return n > 0 ? n : null;
}

const parseCm = (text: string) => {
  const n = Number(text.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Valor de un campo de medida a pulgadas, según la unidad elegida. */
export function fieldToInches(key: Exclude<MeasureKey, "vol">, text: string, unit: Unit): number | null {
  if (!text.trim()) return null;
  if (unit === "cm") {
    const cm = parseCm(text);
    return cm == null ? null : cm / 2.54;
  }
  return key === "len" ? parseFeet(text) : parseInches(text);
}

export function parseLitres(text: string): number | null {
  const n = Number(text.replace(",", ".").replace(/\s*(l|lts|litros)$/i, "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
}
