// «¿Qué tabla necesito?»: preguntas, estado y recomendador (docs/SURFBOARD_FINDER.md).
// Port de WZ0, WLV, WCUR, WFQ, WWV, WGL, WQ, TINFO y wzRec() de design/source/prototype-logic.js.
// ⚠ Lógica SIMPLIFICADA DE DEMOSTRACIÓN: los factores no están validados por surfistas ni shapers.
// Módulo puro: sin React ni servidor, lo usan la isla del asistente y el contenido SEO.

import type { Shape } from "@/lib/domain/taxonomy";

export type LevelKey = "learn" | "ride" | "turn" | "pro";
export type FreqKey = "low" | "mid" | "high";
export type WavesKey = "small" | "med" | "big" | "unsure";
export type GoalKey = "learn" | "soft" | "turns" | "manio" | "small" | "calm";

/**
 * Tipo recomendado. Son formas de la taxonomía, salvo «softboard», que es una
 * construcción (CLAUDE.md): se filtra con construccion=softboard.
 */
export type FinderType = Exclude<Shape, "gun"> | "softboard";

export const TOTAL_STEPS = 7;
/** Paso 8 = resultado. */
export const RESULT_STEP = 8;

export interface FinderState {
  step: number;
  /** Peso en kg, tal como se escribe. */
  w: string;
  lvl: LevelKey | null;
  cur: string | null;
  /** Longitud de la tabla actual en pulgadas (opcional). */
  curLen: string;
  /** Litros de la tabla actual (opcional). */
  curVol: string;
  freq: FreqKey | null;
  waves: WavesKey | null;
  goals: GoalKey[];
  /** '' = toda España · 'canarias' · 'gran-canaria' · 'tenerife' · 'other'. */
  zone: string;
  otherZone: string;
  budget: string;
}

export const initialFinderState = (): FinderState => ({
  step: 1,
  w: "",
  lvl: null,
  cur: null,
  curLen: "",
  curVol: "",
  freq: null,
  waves: null,
  goals: [],
  zone: "",
  otherZone: "asturias",
  budget: "",
});

export const WEIGHT_MIN = 30;
export const WEIGHT_MAX = 160;
export const isValidWeight = (w: string) => {
  const n = Number(w);
  return w !== "" && n >= WEIGHT_MIN && n <= WEIGHT_MAX;
};

/** [clave, título, descripción, nombre corto del nivel]. */
export const LEVELS: [LevelKey, string, string, string][] = [
  ["learn", "Estoy aprendiendo", "Practico el take-off y cojo espuma o mis primeras olas verdes.", "Iniciación"],
  ["ride", "Ya cojo olas por mi cuenta", "Me pongo de pie con soltura y empiezo a ir en diagonal por la pared.", "Intermedio bajo"],
  ["turn", "Hago giros y maniobras", "Recorro la pared con control y trabajo bottom turns y cutbacks.", "Intermedio"],
  ["pro", "Tengo bastante experiencia", "Me adapto a distintas condiciones y hago maniobras avanzadas.", "Avanzado"],
];

export const NO_BOARD = "No tengo tabla";
/** [nombre, descripción]. */
export const CURRENT_BOARDS: [string, string][] = [
  ["Softboard", ""],
  ["Evolutiva", ""],
  ["Midlength", ""],
  ["Shortboard", ""],
  ["Longboard", ""],
  ["Otra", ""],
  [NO_BOARD, "Empiezo de cero o alquilo"],
];

export const FREQS: [FreqKey, string, string][] = [
  ["low", "Menos de una vez a la semana", "Con menos práctica, algo más de volumen te dará más olas."],
  ["mid", "Una o dos veces por semana", "El ritmo habitual: usamos el rango estándar."],
  ["high", "Tres o más veces por semana", "Estás en forma: puedes ir algo más ajustado."],
];

export const WAVES: [WavesKey, string, string][] = [
  ["small", "Pequeñas y suaves", "0,5–1 m · olas blandas, orilla y espuma"],
  ["med", "Medianas", "1–2 m · pared definida y algo de fuerza"],
  ["big", "Potentes o grandes", "Más de 2 m · olas rápidas o huecas"],
  ["unsure", "No lo sé", "Usaremos un término medio"],
];

export const GOALS: [GoalKey, string][] = [
  ["learn", "Aprender y coger más olas"],
  ["soft", "Pasar de una softboard a una tabla rígida"],
  ["turns", "Mejorar mis giros"],
  ["manio", "Conseguir más maniobrabilidad"],
  ["small", "Surfear con más facilidad en olas pequeñas"],
  ["calm", "Practicar un surf más tranquilo"],
];

/** [pregunta, ayuda] de cada paso. */
export const QUESTIONS: [string, string][] = [
  ["¿Cuánto pesas?", "El peso es el dato que más influye en el volumen que necesitas. Solo lo usamos para calcular."],
  ["¿Cuál es tu nivel?", "Responde con sinceridad: un poco más de volumen te hará progresar más rápido."],
  ["¿Qué tabla usas ahora?", "Nos ayuda a entender de dónde vienes, para no proponerte un salto demasiado brusco."],
  ["¿Con qué frecuencia surfeas?", "Quien surfea poco agradece más volumen. Con más práctica puedes ajustar."],
  ["¿Qué olas sueles surfear?", "Las olas pequeñas piden más volumen y superficie; las potentes, más control."],
  ["¿Qué quieres conseguir?", "Puedes elegir más de una opción."],
  ["¿Dónde buscas y cuánto quieres gastar?", "Solo filtra las tablas que te enseñamos: no cambia la recomendación técnica."],
];

export interface TypeInfo {
  label: string;
  /** Singular y plural en minúsculas para «Ver 1 evolutiva» / «Ver N evolutivas». */
  singular: string;
  plural: string;
  why: string;
  cons: string;
  lens: string;
  /** Silueta con la que se dibuja (softboard: forma evolutiva en tono suave). */
  shape: Shape;
}

export const TYPE_INFO: Record<FinderType, TypeInfo> = {
  softboard: { label: "Softboard", singular: "softboard", plural: "softboards", why: "Máxima estabilidad y seguridad mientras aprendes.", cons: "Se queda corta cuando empiezas a ir por la pared.", lens: "7'0\"–8'6\"", shape: "evolutiva" },
  evolutiva: { label: "Evolutiva", singular: "evolutiva", plural: "evolutivas", why: "Rígida, con mucho volumen y remada fácil: el paso natural después de la softboard.", cons: "Menos ágil en olas potentes.", lens: "7'0\"–8'0\"", shape: "evolutiva" },
  longboard: { label: "Longboard", singular: "longboard", plural: "longboards", why: "Coge olas muy pequeñas y es muy estable.", cons: "Pesada, y cuesta más pasar la rompiente y transportarla.", lens: "9'0\"–9'6\"", shape: "longboard" },
  midlength: { label: "Midlength", singular: "midlength", plural: "midlengths", why: "Deslizamiento y remada con un surf fluido y tranquilo.", cons: "Menos reactiva en giros cerrados.", lens: "6'10\"–7'10\"", shape: "midlength" },
  fish: { label: "Fish", singular: "fish", plural: "fish", why: "Corta y ancha: rápida y divertida en olas pequeñas y medianas.", cons: "Puede costar en olas grandes y huecas.", lens: "5'6\"–6'4\"", shape: "fish" },
  hibrida: { label: "Híbrida", singular: "híbrida", plural: "híbridas", why: "Equilibrio entre facilidad y rendimiento para progresar en maniobras.", cons: "Exige ya cierta técnica.", lens: "5'8\"–6'6\"", shape: "hibrida" },
  shortboard: { label: "Shortboard", singular: "shortboard", plural: "shortboards", why: "Máxima respuesta en olas con fuerza.", cons: "Poco volumen: penaliza mucho en olas pequeñas.", lens: "5'8\"–6'4\"", shape: "shortboard" },
};


/** Factor de litros por kg según el nivel (REC del prototipo). Lo cita el contenido SEO. */
export const FACTORS: Record<LevelKey, [number, number]> = {
  learn: [0.85, 1.05],
  ride: [0.6, 0.78],
  turn: [0.46, 0.58],
  pro: [0.36, 0.44],
};

const BASE_TYPES: Record<LevelKey, FinderType[]> = {
  learn: ["softboard", "evolutiva", "longboard"],
  ride: ["evolutiva", "midlength", "fish"],
  turn: ["hibrida", "fish", "midlength"],
  pro: ["shortboard", "hibrida", "fish"],
};

const LENGTHS: Record<LevelKey, string> = {
  learn: "7'6\"–9'0\"",
  ride: "7'0\"–8'0\"",
  turn: "6'0\"–7'2\"",
  pro: "5'8\"–6'4\"",
};

const LOOK: Record<LevelKey, string[]> = {
  learn: ["Anchura de 22\" o más y cantos gruesos", "Mucho volumen repartido a lo largo de la tabla", "Construcción resistente: epoxy o softboard"],
  ride: ["Volumen dentro de tu rango, sin bajar de golpe", "Cantos medios y algo de rocker", "Quillas thruster o 2+1 versátiles"],
  turn: ["Volumen algo más ajustado para girar", "Cola squash o swallow según el tipo de ola", "Rocker moderado"],
  pro: ["Volumen ajustado a tus olas habituales", "Rocker adaptado a la fuerza de la ola", "Cantos finos para más agarre"],
};

const AVOID: Record<LevelKey, string[]> = {
  learn: ["Shortboards de menos de 40 L", "Tablas muy estrechas o con mucho rocker"],
  ride: ["Bajar más de un 20 % de volumen de una vez", "Tablas de alto rendimiento muy finas"],
  turn: ["Tablas demasiado voluminosas que no giran", "Longboards si buscas maniobras"],
  pro: ["Exceso de volumen en olas potentes", "Comprar solo por la marca sin revisar las medidas"],
};

export interface Recommendation {
  lo: number;
  hi: number;
  types: FinderType[];
  lens: string;
  look: string[];
  avoid: string[];
  /** Aviso del 20 % (empieza con espacio), o ''. */
  note: string;
  level: LevelKey;
  /** «Iniciación», «Intermedio bajo»… */
  levelName: string;
  weight: number;
}

export const levelOf = (k: LevelKey) => LEVELS.find((l) => l[0] === k)!;

const parseNum = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Recomendación orientativa. null si falta un peso válido o el nivel. Port de wzRec(). */
export function recommend(W: Pick<FinderState, "w" | "lvl" | "freq" | "waves" | "goals" | "curVol">): Recommendation | null {
  const w = Number(W.w);
  if (!isValidWeight(W.w) || !W.lvl) return null;
  const [a, b] = FACTORS[W.lvl];
  const g = W.goals;
  let k = 1;
  if (W.freq === "low") k *= 1.08;
  if (W.freq === "high") k *= 0.95;
  if (W.waves === "small") k *= 1.05;
  if (W.waves === "big") k *= 0.92;
  if (g.includes("learn") || g.includes("soft")) k *= 1.03;
  if (g.includes("manio")) k *= 0.94;
  if (g.includes("turns")) k *= 0.97;
  if (g.includes("small")) k *= 1.04;

  let lo = Math.round(w * a * k);
  let hi = Math.round(w * b * k);
  let note = "";
  const cv = parseNum(W.curVol);
  if (cv && W.lvl !== "pro" && lo < cv * 0.78) {
    lo = Math.round(cv * 0.78);
    note = ` Partes de una tabla de ${cv} L: no te proponemos bajar más de un 20 % de golpe.`;
  }
  if (hi < lo + 4) hi = lo + 4;

  let types = BASE_TYPES[W.lvl].slice();
  if (g.includes("soft")) types = ["evolutiva", ...types.filter((t) => t !== "softboard" && t !== "evolutiva"), "midlength"];
  if (g.includes("calm")) types = ["midlength", "longboard", ...types];
  if (g.includes("small")) types = ["fish", ...types];
  if ((g.includes("manio") || g.includes("turns")) && W.lvl === "ride") types = [...types.slice(0, 1), "hibrida", ...types.slice(1)];
  if (W.waves === "big") types = types.filter((t) => t !== "longboard" && t !== "softboard");
  types = [...new Set(types)].slice(0, 3);
  if (!types.length) types = ["evolutiva"];

  return {
    lo,
    hi,
    types,
    lens: LENGTHS[W.lvl],
    look: LOOK[W.lvl],
    avoid: AVOID[W.lvl],
    note,
    level: W.lvl,
    levelName: levelOf(W.lvl)[3],
    weight: w,
  };
}

/** Ejemplos orientativos del contenido SEO, calculados con la misma función. */
export const EXAMPLES: [number, LevelKey][] = [
  [60, "learn"],
  [75, "learn"],
  [75, "ride"],
  [75, "turn"],
  [85, "pro"],
];

export function exampleRows() {
  return EXAMPLES.map(([w, lvl]) => {
    const r = recommend({ ...initialFinderState(), w: String(w), lvl })!;
    return { label: `${w} kg · ${levelOf(lvl)[1].toLowerCase()}`, range: `${r.lo}–${r.hi} L` };
  });
}

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
const str = (v: unknown, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");

/** Lee un estado guardado (localStorage) de forma tolerante. */
export function sanitizeFinderState(raw: unknown): FinderState {
  const d = initialFinderState();
  if (!raw || typeof raw !== "object") return d;
  const p = raw as Record<string, unknown>;
  const step = typeof p.step === "number" && p.step >= 1 && p.step <= RESULT_STEP ? Math.floor(p.step) : 1;
  const s: FinderState = {
    step,
    w: str(p.w, 3).replace(/[^0-9]/g, ""),
    lvl: pick(p.lvl, LEVELS.map((l) => l[0])),
    cur: pick(p.cur, CURRENT_BOARDS.map((c) => c[0])),
    curLen: str(p.curLen, 3).replace(/[^0-9]/g, ""),
    curVol: str(p.curVol, 6).replace(/[^0-9.,]/g, ""),
    freq: pick(p.freq, FREQS.map((f) => f[0])),
    waves: pick(p.waves, WAVES.map((w) => w[0])),
    goals: Array.isArray(p.goals) ? [...new Set(p.goals.map((g) => pick(g, GOALS.map((x) => x[0]))).filter((g): g is GoalKey => !!g))] : [],
    zone: str(p.zone, 30).replace(/[^a-z-]/g, ""),
    otherZone: str(p.otherZone, 30).replace(/[^a-z-]/g, "") || d.otherZone,
    budget: str(p.budget, 6).replace(/[^0-9]/g, ""),
  };
  // No se puede estar más allá del paso 2 sin peso y nivel válidos.
  if (s.step > 1 && !isValidWeight(s.w)) s.step = 1;
  else if (s.step > 2 && !s.lvl) s.step = 2;
  return s;
}
