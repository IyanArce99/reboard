// Política de indexación de las landings /tablas (docs/seo-ux-audit.md §C).
// Sin métricas externas todavía: el criterio es evitar páginas con poco contenido. Cuando haya
// datos de Keyword Planner, los umbrales se ajustan aquí (y lo siguen el sitemap y los metadatos).

import type { LandingForm } from "./landings";

/** Mínimo de anuncios activos para indexar una landing de un solo segmento (tipo o zona). */
export const MIN_LISTINGS_SINGLE = 1;
/**
 * Mínimo para una combinación zona + tipo. Con 1 o 2 anuncios la página es casi idéntica a la de
 * la zona o la del tipo y aporta poco: sigue siendo navegable (y permite crear alertas), pero noindex.
 */
export const MIN_LISTINGS_COMBO = 3;

export function landingIndexable(place: string | null, form: LandingForm | null, count: number) {
  return count >= (place && form ? MIN_LISTINGS_COMBO : MIN_LISTINGS_SINGLE);
}
