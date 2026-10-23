// Landings SEO de /tablas/[forma], /tablas/[zona] y /tablas/[zona]/[forma] (docs/SEO.md).

import {
  REGIONS,
  SHAPES,
  SHAPE_INFO,
  ZONES,
  placeName,
  type Shape,
} from "@/lib/domain/taxonomy";
import { emptyFilters, toQuery, type Filters } from "./filters";

/** Formas con landing: las 7 formas, la construcción softboard y la necesidad «principiantes». */
export const LANDING_FORMS = [...SHAPES, "softboard", "principiantes"] as const;
export type LandingForm = (typeof LANDING_FORMS)[number];

/** Volumen mínimo de «Para principiantes» (definición del prototipo). */
export const BEGINNER_MIN_VOLUME = 55;

export const isLandingForm = (s: string): s is LandingForm => (LANDING_FORMS as readonly string[]).includes(s);
export const isLandingPlace = (s: string) => ZONES.some((z) => z.slug === s) || REGIONS.some((r) => r.slug === s);
export const LANDING_PLACES = [...REGIONS.map((r) => r.slug), ...ZONES.map((z) => z.slug)];

export function formFilters(form: LandingForm): Partial<Filters> {
  if (form === "softboard") return { constructions: ["softboard"] };
  if (form === "principiantes") return { volMin: BEGINNER_MIN_VOLUME };
  return { shapes: [form as Shape] };
}

export function landingFilters(place: string | null, form: LandingForm | null): Filters {
  return { ...emptyFilters(), ...(place ? { zone: place } : {}), ...(form ? formFilters(form) : {}) };
}

export const formLabel = (form: LandingForm) =>
  form === "softboard" ? "Softboard" : form === "principiantes" ? "Para principiantes" : SHAPE_INFO[form].label;

/** Título de la landing; las de forma y zona reutilizan el H1 de /buscar. */
export function landingTitle(place: string | null, form: LandingForm | null, fallback: string) {
  if (form !== "principiantes") return fallback;
  return `Tablas de surf de segunda mano para principiantes${place ? ` en ${placeName(place)}` : ""}`;
}

const SHAPE_INTROS: Partial<Record<LandingForm, string>> = {
  evolutiva: "Tablas con volumen y longitud intermedia para seguir progresando cuando dejas la softboard. Filtra por litros y longitud para compararlas.",
  shortboard: "Tablas cortas y de poco volumen para olas con fuerza. Aquí cada litro cuenta: filtra por litros.",
  fish: "Tablas cortas y anchas, normalmente con cola swallow, para olas pequeñas y medianas.",
  hibrida: "Tablas entre la shortboard y la fish, con algo más de volumen para progresar en maniobras. Filtra por litros para compararlas.",
  longboard: "Tablas de 9 pies o más para olas pequeñas, remada fácil y estilo clásico.",
  midlength: "Tablas de entre 6'8\" y 8'0\" que reman fácil y deslizan mucho, para olas tranquilas y un surf fluido.",
  gun: "Tablas largas y estrechas para olas grandes y con fuerza. Revisa longitud y litros antes de comprar.",
  softboard: "Las softboards son tablas de espuma. Es una construcción, no una forma: las hay evolutivas, fish y longboard. Ideales para empezar.",
  principiantes: `Tablas de ${BEGINNER_MIN_VOLUME} litros o más: estabilidad y remada fácil para aprender. Si no sabes cuántos litros necesitas, calcúlalo en «¿Qué tabla necesito?».`,
};

/** Qué es cada tipo, en una frase corta (meta description). */
const FORM_SHORT: Record<LandingForm, string> = {
  shortboard: "Tablas cortas y de poco volumen para olas con fuerza",
  fish: "Cortas y anchas, rápidas en olas pequeñas y medianas",
  hibrida: "Entre shortboard y fish, para progresar en maniobras",
  evolutiva: "Volumen y longitud intermedia para salir de la espuma",
  midlength: "Entre 6'8\" y 8', remada fácil y surf fluido",
  longboard: "De 9 pies o más, para olas pequeñas y estilo clásico",
  gun: "Largas y finas, para olas grandes",
  softboard: "Tablas de espuma, seguras para aprender",
  principiantes: `De ${BEGINNER_MIN_VOLUME} litros o más, estables y fáciles de remar`,
};

const tablas = (n: number) => `${n} ${n === 1 ? "tabla" : "tablas"}`;

/**
 * Meta description de la landing: recuento real, zona y tipo, sin repetir el mismo texto en
 * todas las zonas. Sin anuncios no se cita un número (la página es noindex).
 */
export function landingDescription(place: string | null, form: LandingForm | null, count: number) {
  const where = place ? ` en ${placeName(place)}` : " en España";
  const what = form ? (form === "principiantes" ? "tablas de surf para principiantes" : formLabel(form).toLowerCase()) : "tablas de surf";
  const head = count > 0 ? `${tablas(count)} de segunda mano${where}` : `Tablas de segunda mano${where}`;
  const kind = form ? `${FORM_SHORT[form]}. ` : "";
  const tail = form ? "Mira litros, medidas, estado y precio de cada una y habla directamente con quien vende." : `Busca ${what} por litros, medidas y tipo, y habla directamente con quien vende, sin comisiones.`;
  return `${head}. ${kind}${tail}`;
}

export function landingIntro(place: string | null, form: LandingForm | null) {
  const zone = place ? placeName(place) : null;
  if (form && SHAPE_INTROS[form]) {
    // En /tablas/{zona}/{forma} se añade la zona para que cada landing tenga un texto propio.
    return zone ? `${SHAPE_INTROS[form]} Anuncios en ${zone}, con los más recientes primero.` : SHAPE_INTROS[form]!;
  }
  if (zone) return `Tablas de surfistas, tiendas y escuelas de ${zone}. Busca por litros, longitud y tipo.`;
  return "";
}

export function landingPath(place: string | null, form: LandingForm | null) {
  return `/tablas/${[place, form].filter(Boolean).join("/")}`;
}

/**
 * Si los filtros equivalen exactamente a una landing, devuelve su ruta.
 * Sirve de canonical para /buscar (docs/SEO.md).
 */
export function landingPathFor(f: Filters): string | null {
  const q = toQuery(f);
  if (!q) return null;
  for (const form of [null, ...LANDING_FORMS] as (LandingForm | null)[]) {
    for (const place of [null, ...LANDING_PLACES]) {
      if ((form || place) && toQuery(landingFilters(place, form)) === q) return landingPath(place, form);
    }
  }
  return null;
}
