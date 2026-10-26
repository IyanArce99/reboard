// Catálogo de eventos de analítica de producto (docs/ANALYTICS.md). Módulo puro, sin React.
//
// Reglas (no negociables):
// - Solo propiedades categóricas o numéricas acotadas: nunca nombres, emails, teléfonos, localidades,
//   textos libres, ids de usuario ni el peso o el nivel de TablaFinder.
// - La isla, el tipo y la construcción son slugs de la taxonomía; el precio va en tramos.
// - Un evento solo existe si sirve para una decisión de producto (no se instrumentan todos los clics).

export type PriceBand = "<100" | "100-199" | "200-299" | "300-499" | "500+";
export type CountBand = "0" | "1-5" | "6-20" | "21-50" | "50+";
export type PublishMode = "nuevo" | "editar";
export type PublishFailure = "captcha" | "sesion" | "fotos" | "datos" | "red" | "servidor";

export interface EventProps {
  /** Página vista (la envía la propia capa de analítica con la URL ya saneada). */
  $pageview: Record<string, never>;

  // ——— Compradores ———
  /** Resultados de búsqueda pintados (/buscar o una landing). Una vez por combinación de filtros. */
  search_performed: {
    source: "buscar" | "landing";
    island: string | null;
    shapes: string[];
    constructions: string[];
    has_volume: boolean;
    has_length: boolean;
    has_price: boolean;
    has_brand: boolean;
    sort: string;
    results: CountBand;
  };
  /** Ficha abierta. */
  listing_viewed: {
    shape: string;
    construction: string;
    island: string;
    price_band: PriceBand;
    seller_type: string;
    photos: number;
    available: boolean;
  };
  /** Embudo de contacto: abrir → teléfono mostrado → abrir WhatsApp o llamar. */
  contact_opened: { method: "whatsapp" | "phone"; surface: "ficha" | "barra_movil"; shape: string; island: string; price_band: PriceBand };
  contact_revealed: { method: "whatsapp" | "phone" };
  contact_link_clicked: { channel: "whatsapp" | "llamada" };
  /** Contacto por email (formulario de la ficha). Nunca nombre, email ni texto del mensaje. */
  contact_email_opened: { surface: "ficha" | "barra_movil"; shape: string; island: string; price_band: PriceBand };
  contact_email_submitted: Record<string, never>;
  /** SOLO cuando el servidor confirma que el servidor de correo ha aceptado el mensaje. */
  contact_email_sent: Record<string, never>;
  contact_email_failed: { reason: "validacion" | "limite" | "no_disponible" | "error" };
  listing_saved: Record<string, never>;
  alert_created: Record<string, never>;

  // ——— TablaFinder (sin peso, nivel ni olas: solo que se usa y qué tipos recomienda) ———
  finder_started: Record<string, never>;
  finder_completed: { types: string[]; results: CountBand };

  // ——— Comparador ———
  compare_added: { count: number };
  compare_viewed: { count: number; shared: boolean };
  compare_shared: { count: number };

  // ——— Vendedores: embudo de publicación ———
  publish_started: Record<string, never>;
  publish_step_completed: { step: 1 | 2 | 3 | 4; mode: PublishMode };
  publish_submitted: { mode: PublishMode };
  publish_failed: { mode: PublishMode; reason: PublishFailure };
  /** SOLO cuando el servidor ha confirmado que el anuncio está guardado y publicado. */
  publish_completed: {
    mode: PublishMode;
    shape: string;
    construction: string;
    island: string;
    price_band: PriceBand;
    photos: number;
    has_volume: boolean;
    brand_known: boolean;
  };
  /** Acceso completado con el código (en «Entrar» o al final de publicar). */
  login_completed: { context: "entrar" | "publicar" };
}

export type AnalyticsEvent = keyof EventProps;

export function priceBand(eur: number): PriceBand {
  if (eur < 100) return "<100";
  if (eur < 200) return "100-199";
  if (eur < 300) return "200-299";
  if (eur < 500) return "300-499";
  return "500+";
}

export function countBand(n: number): CountBand {
  if (n <= 0) return "0";
  if (n <= 5) return "1-5";
  if (n <= 20) return "6-20";
  if (n <= 50) return "21-50";
  return "50+";
}

/** Parámetros de campaña que se conservan en las URLs enviadas (el resto de la query se quita). */
const KEEP_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"];

/** URL sin datos de más: origen + ruta + solo los parámetros UTM. «?editar=…», «?siguiente=…», ids, etc. fuera. */
export function sanitizeUrl(raw: unknown): unknown {
  if (typeof raw !== "string" || !raw) return raw;
  try {
    const u = new URL(raw);
    const keep = new URLSearchParams();
    for (const k of KEEP_PARAMS) {
      const v = u.searchParams.get(k);
      if (v) keep.set(k, v.slice(0, 100));
    }
    const q = keep.toString();
    return `${u.origin}${u.pathname}${q ? `?${q}` : ""}`;
  } catch {
    return undefined;
  }
}

/** Referente: solo el dominio de origen (de dónde viene la visita), nunca la URL completa. */
export function sanitizeReferrer(raw: unknown): unknown {
  if (typeof raw !== "string" || !raw || raw === "$direct") return raw;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

/** Rutas que no se miden: privadas o de administración. */
export const UNTRACKED_PATHS = /^\/(admin|moderacion|auth|cuenta|panel|sistema)(\/|$)/;

/** Claves que nunca deben salir aunque alguien las añada por error. */
// Por palabra completa (`email`, `seller_name`, `listing_id`), no por final: «context» no es «text».
const FORBIDDEN_KEY = /(^|_)(e?mail|phone|telefono|tel|name|nombre|town|localidad|address|direccion|peso|weight|level|nivel|text|query|q|token|id|ip)$/i;

/** Propiedades limpias: solo primitivos y listas cortas de slugs; claves sensibles fuera. */
export function cleanProps(props: object): Record<string, string | number | boolean | null | string[]> {
  const out: Record<string, string | number | boolean | null | string[]> = {};
  for (const [k, v] of Object.entries(props)) {
    if (FORBIDDEN_KEY.test(k)) continue;
    if (v === null || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v))) out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 40);
    else if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string").slice(0, 10).map((x) => x.slice(0, 40));
  }
  return out;
}
