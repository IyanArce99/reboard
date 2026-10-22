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
  return `Tablas de surf para principiantes de segunda mano${place ? ` en ${placeName(place)}` : ""}`;
}

const SHAPE_INTROS: Partial<Record<LandingForm, string>> = {
  evolutiva: "Tablas con volumen y longitud intermedia para progresar después de la softboard. Busca por litros y longitud para comparar.",
  shortboard: "Tablas cortas y de poco volumen para surf de rendimiento. El volumen es clave: filtra por litros.",
  fish: "Tablas anchas y cortas con cola swallow, para olas pequeñas y medianas.",
  longboard: "Tablas de más de 9 pies para olas pequeñas, remada fácil y estilo clásico.",
  midlength: "Entre 6'8\" y 8', para olas tranquilas y deslizamiento.",
  softboard: "Softboard es una construcción, no una forma: hay softboards evolutivas, fish y longboards. Ideales para empezar.",
  principiantes: `Tablas de ${BEGINNER_MIN_VOLUME} litros o más: estabilidad y remada fácil para aprender. Si no sabes cuántos litros necesitas, usa «¿Qué tabla necesito?».`,
};

export function landingIntro(place: string | null, form: LandingForm | null) {
  if (form && SHAPE_INTROS[form]) return SHAPE_INTROS[form]!;
  if (place) return `Anuncios de surfistas, tiendas y escuelas de ${placeName(place)}. Ordena por distancia para ver las más cercanas.`;
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
