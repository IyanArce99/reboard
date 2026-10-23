import type { PhotoSlug } from "@/lib/photos";

// Guías de compra (/guias). Plantilla del prototipo (design/prototype/Reboard.dc.html, «Guía»).
//
// DEMO: el único contenido es el de ejemplo del prototipo («contenido de demostración»). Las guías
// reales están pendientes (docs/SEO.md, «Contenido orgánico»). Las guías sin contenido siguen como
// página provisional (PendingPage, noindex) y no aparecen en el índice.

export interface GuideCheckRow {
  zone: string;
  ok: string;
  ko: string;
}

export interface Guide {
  slug: string;
  /** Título corto (listados, migas, <title>). */
  title: string;
  h1: string;
  description: string;
  /** Sección de las migas («Comprar», «Vender»…). */
  section: string;
  shortAnswer: string;
  /** Foto editorial de cabecera (src/lib/photos.ts). */
  photo: PhotoSlug;
  checklist: GuideCheckRow[];
  /** ISO (AAAA-MM-DD). */
  updatedAt: string;
  byline: string;
  isDemo: boolean;
}

export const GUIDES: Guide[] = [
  {
    slug: "que-revisar-al-comprar-una-tabla-usada",
    title: "Qué revisar al comprar una tabla usada",
    h1: "Qué revisar al comprar una tabla de surf usada",
    description:
      "Lista de comprobación para comprar una tabla de surf de segunda mano: cantos, cubierta, fondo, cajas de quillas y medidas. Qué es aceptable y qué no.",
    section: "Comprar",
    shortAnswer:
      "revisa golpes y reparaciones, busca zonas blandas o delaminadas, comprueba las cajas de quillas y mira que las medidas coincidan con el anuncio. Una reparación bien hecha no es un problema; una tabla que ha cogido agua, sí.",
    photo: "tablas-usadas-quillas",
    checklist: [
      { zone: "Cantos y nose", ok: "golpes pequeños sellados con resina", ko: "grietas abiertas o fibra a la vista" },
      { zone: "Cubierta", ok: "hundimientos leves de pies y talones (pressure dings)", ko: "zonas blandas que ceden al presionar" },
      { zone: "Fondo", ok: "arañazos superficiales", ko: "burbujas o delaminación" },
      { zone: "Cajas de quillas", ok: "cajas firmes, sin holgura", ko: "cajas sueltas o con grietas alrededor" },
      { zone: "Medidas", ok: "coinciden con lo escrito en el larguero (stringer)", ko: "ni el vendedor sabe las medidas ni están escritas en la tabla" },
    ],
    updatedAt: "2026-10-22",
    byline: "Contenido de demostración, pendiente de revisar por un reparador.",
    isDemo: true,
  },
];

/** Guías enlazadas desde la web que aún no tienen contenido: página provisional noindex. */
export const PENDING_GUIDES: { slug: string; title: string }[] = [
  { slug: "que-tabla-comprar-despues-de-una-softboard", title: "Qué tabla comprar después de una softboard" },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** «22 oct 2026». */
export function guideDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d
    .toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .replace(/\./g, "")
    .replace(/ de /g, " ");
}
