/** URL pública del sitio. El dominio definitivo está pendiente: reboard.es es solo un ejemplo. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "Reboard";

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
