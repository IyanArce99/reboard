// Textos editoriales de las páginas de marca (/marcas/[marca]).
//
// DEMO: son los textos de ejemplo del prototipo (bIntros en design/source/prototype-logic.js).
// No están revisados ni autorizados por las marcas. Antes de publicar con datos reales hay que
// sustituirlos por textos propios revisados (docs/ROADMAP.md). Los logotipos de las marcas NO están
// autorizados: la página muestra siempre un marcador neutro con el nombre, nunca un logo real.

export interface BrandContent {
  intro: string;
  /** true mientras el texto sea el de ejemplo del prototipo. */
  isDemo: boolean;
}

const BRAND_INTROS: Record<string, string> = {
  Torq: "Tablas de epoxy moldeado (TET). Se ven mucho en escuelas y entre surfistas que están progresando.",
  NSP: "Tablas de epoxy, muy habituales en escuelas y en alquiler.",
  Softech: "Softboards: tablas de espuma blanda con fondo deslizante.",
  Firewire: "Tablas de epoxy con construcciones propias y modelos de varios shapers conocidos.",
  Lost: "Shortboards e híbridas, sobre todo en PU.",
  "Channel Islands": "Shortboards, híbridas y midlengths, sobre todo en PU.",
  Pukas: "Marca vasca con modelos para casi cualquier tipo de ola.",
};

/** Intro de la marca, o null si no hay texto (no se inventa uno). */
export function brandContent(name: string): BrandContent | null {
  const intro = BRAND_INTROS[name];
  return intro ? { intro, isDemo: true } : null;
}
