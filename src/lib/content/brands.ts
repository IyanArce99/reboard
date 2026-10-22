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
  Torq: "Marca de tablas en epoxy moldeado (TET), muy habitual en escuelas y entre surfistas que progresan. Duras, ligeras y resistentes a los golpes.",
  NSP: "Tablas en epoxy resistentes, muy presentes en escuelas y alquiler.",
  Softech: "Softboards de gama alta: espuma blanda con fondo deslizante.",
  Firewire: "Construcciones técnicas en epoxy y modelos de shapers reconocidos.",
  Lost: "Modelos híbridos y shortboards de PU de diseño californiano.",
  "Channel Islands": "Shortboards, híbridas y midlengths en PU clásico.",
  Pukas: "Marca vasca con modelos para todo tipo de olas.",
};

/** Intro de la marca, o null si no hay texto (no se inventa uno). */
export function brandContent(name: string): BrandContent | null {
  const intro = BRAND_INTROS[name];
  return intro ? { intro, isDemo: true } : null;
}
