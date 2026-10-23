/** URL pública del sitio. El dominio definitivo está pendiente: reboard.es es solo un ejemplo. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "Reboard";

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Imagen por defecto al compartir un enlace (WhatsApp, redes): 1200×630, generada desde la marca. */
export const OG_IMAGE = {
  url: "/og-reboard.png",
  width: 1200,
  height: 630,
  alt: "Reboard · Tu próxima tabla ya existe. Tablas de surf de segunda mano en Canarias.",
};

/**
 * Base de Open Graph. Una página que define `openGraph` sustituye entero el del layout, así que
 * cada página empieza por esta base (`{ ...OG_BASE, title, … }`) y solo añade o cambia lo suyo.
 */
export const OG_BASE = { siteName: SITE_NAME, locale: "es_ES", type: "website" as const, images: [OG_IMAGE] };
