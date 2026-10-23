// Panel de administración · anuncios y reportes: funciones puras (sin acceso a datos).
// Se prueban en tests/unit/admin-listings.test.ts.

import { SHAPES, SHAPE_INFO, type Shape } from "@/lib/domain/taxonomy";
import { listingDbId } from "@/lib/auth/shared";
import type { Tone } from "@/components/admin/ui";

export const LISTINGS_PAGE_SIZE = 25;
export const REPORT_GROUPS_PAGE_SIZE = 20;

export const LISTING_STATUSES = ["draft", "published", "sold", "expired", "withdrawn"] as const;
export type DbListingStatus = (typeof LISTING_STATUSES)[number];
export const MODERATION_FILTERS = ["visible", "flagged", "removed"] as const;
export type DbModeration = (typeof MODERATION_FILTERS)[number];
export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type DbReportStatus = (typeof REPORT_STATUSES)[number];

export const DB_STATUS_LABEL: Record<DbListingStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  sold: "Vendido",
  expired: "Caducado",
  withdrawn: "Retirado por el vendedor",
};
export const DB_STATUS_TONE: Record<DbListingStatus, Tone> = {
  draft: "neutral",
  published: "success",
  sold: "info",
  expired: "neutral",
  withdrawn: "neutral",
};

export const MODERATION_FILTER_LABEL: Record<DbModeration, string> = {
  visible: "Visible",
  flagged: "En revisión",
  removed: "Oculto o retirado",
};

export const REPORT_STATUS_LABEL: Record<DbReportStatus, string> = {
  open: "Abiertos",
  resolved: "Resueltos",
  dismissed: "Descartados",
};

export const REPORT_STATUS_ONE: Record<DbReportStatus, string> = {
  open: "Abierto",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

export const SHAPE_OPTIONS = SHAPES.map((s) => ({ value: s, label: SHAPE_INFO[s].label }));

// ———————————————— Estado de moderación visible para el equipo ————————————————

export type ModerationView = "visible" | "flagged" | "hidden" | "removed";

export const MODERATION_VIEW: Record<ModerationView, { label: string; tone: Tone; help: string }> = {
  visible: { label: "Visible", tone: "success", help: "Se muestra en la web con normalidad." },
  flagged: {
    label: "En revisión",
    tone: "warning",
    help: "Ha llegado al umbral de reportes. Sigue visible hasta que alguien decida.",
  },
  hidden: {
    label: "Oculto temporalmente",
    tone: "warning",
    help: "No se muestra en la web. Se puede restaurar; fotos y datos se conservan.",
  },
  removed: {
    label: "Retirado por incumplimiento",
    tone: "error",
    help: "No se muestra en la web y el vendedor no puede volver a publicarlo. Fotos y datos se conservan.",
  },
};

/**
 * Oculto y retirado comparten `moderation = 'removed'`; los distingue la última acción hide/remove
 * registrada en moderation_actions. Sin registro (datos antiguos) se trata como retirado.
 */
export function moderationView(moderation: string, lastHideOrRemove: string | null | undefined): ModerationView {
  if (moderation === "flagged") return "flagged";
  if (moderation !== "removed") return "visible";
  return lastHideOrRemove === "hide" ? "hidden" : "removed";
}

/** Última acción hide/remove por anuncio, a partir de acciones ordenadas de más reciente a más antigua. */
export function lastHideOrRemoveByListing(actions: { listing_id: number; action: string }[]) {
  const out = new Map<number, string>();
  for (const a of actions) {
    if ((a.action === "hide" || a.action === "remove") && !out.has(a.listing_id)) out.set(a.listing_id, a.action);
  }
  return out;
}

/** Acciones de moderación disponibles según el estado (la base de datos vuelve a comprobarlo). */
export function availableModeration(view: ModerationView, status: string, openReports: number) {
  return {
    hide: view === "visible" || view === "flagged",
    remove: view !== "removed",
    restore: view === "hidden" || view === "removed",
    markSold: status === "published",
    reports: openReports > 0,
  };
}

// ———————————————— Filtros de /admin/anuncios (GET) ————————————————

type Sp = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZONE = /^[a-z0-9-]{2,40}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function validDay(v: string | undefined) {
  if (!v || !DAY.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? undefined : v;
}

export interface ListingFilters {
  estado?: DbListingStatus;
  moderacion?: DbModeration;
  tipo?: Shape;
  zona?: string;
  desde?: string;
  hasta?: string;
  vendedor?: string;
  q?: string;
}

/** Lee y valida los filtros de la URL. Lo que no es válido se ignora (no se pasa a la consulta). */
export function parseListingFilters(sp: Sp): ListingFilters {
  const zona = one(sp.zona);
  const vendedor = one(sp.vendedor);
  const q = cleanSearch(one(sp.q));
  return {
    estado: pick(one(sp.estado), LISTING_STATUSES),
    moderacion: pick(one(sp.moderacion), MODERATION_FILTERS),
    tipo: pick(one(sp.tipo), SHAPES),
    zona: zona && ZONE.test(zona) ? zona : undefined,
    desde: validDay(one(sp.desde)),
    hasta: validDay(one(sp.hasta)),
    vendedor: vendedor && UUID.test(vendedor) ? vendedor.toLowerCase() : undefined,
    q: q || undefined,
  };
}

/** Filtros como parámetros de URL (para la paginación y los enlaces). */
export const filtersToParams = (f: ListingFilters): Record<string, string | undefined> => ({ ...f });

export const hasFilters = (f: ListingFilters) => Object.values(f).some(Boolean);

/** Día siguiente (YYYY-MM-DD) para un «hasta» inclusivo: created_at < hasta + 1 día. */
export function nextDay(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Texto de búsqueda seguro para filtros PostgREST (`or()` / `ilike`): solo letras, números,
 * espacios, guion y punto. Sin comas, paréntesis, comillas ni comodines que alteren la consulta.
 */
export function cleanSearch(raw: string | undefined) {
  if (!raw) return "";
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Búsqueda: id público exacto («a100123» o «100123») o texto (marca, marca libre o slug). */
export function parseSearch(q: string | undefined): { kind: "id"; id: number } | { kind: "text"; text: string } | null {
  if (!q) return null;
  const idMatch = /^a?(\d{1,15})$/i.exec(q);
  if (idMatch) {
    const id = listingDbId(`a${idMatch[1]}`);
    if (id != null) return { kind: "id", id };
  }
  return { kind: "text", text: q };
}

/** Filtro `or()` de texto: marca libre, slug o alguna marca del catálogo que coincida. */
export function textSearchOr(text: string, brandIds: number[]) {
  // Valores entre comillas dobles: el texto ya viene sin comillas ni comas (cleanSearch).
  const slug = text.replace(/[ .]+/g, "-").toLowerCase();
  const parts = [`brand_text.ilike."%${text}%"`, `slug.ilike."%${slug}%"`];
  if (brandIds.length) parts.push(`brand_id.in.(${brandIds.slice(0, 200).join(",")})`);
  return parts.join(",");
}

// ———————————————— Reportes ————————————————

/** Cuenta reportes por anuncio (una sola consulta para toda la página). */
export function countByListing(rows: { listing_id: number }[]) {
  const m = new Map<number, number>();
  for (const r of rows) m.set(r.listing_id, (m.get(r.listing_id) ?? 0) + 1);
  return m;
}

export interface ReportLike {
  id: number;
  listing_id: number;
  created_at: string;
}

/** Agrupa reportes por anuncio: primero los que más reportes tienen y, a igualdad, el más reciente. */
export function groupReports<R extends ReportLike>(rows: R[]) {
  const groups = new Map<number, R[]>();
  for (const r of rows) {
    const g = groups.get(r.listing_id);
    if (g) g.push(r);
    else groups.set(r.listing_id, [r]);
  }
  return [...groups.entries()]
    .map(([listingId, reports]) => ({
      listingId,
      reports: [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      latest: reports.reduce((m, r) => (r.created_at > m ? r.created_at : m), ""),
    }))
    .sort((a, b) => b.reports.length - a.reports.length || b.latest.localeCompare(a.latest));
}

// ———————————————— Edición de textos ————————————————

export const EDITABLE_FIELDS = ["brand_text", "model_text", "town", "fins", "accessories", "repairs", "description"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

export const EDITABLE_LABEL: Record<EditableField, string> = {
  brand_text: "Marca (texto libre)",
  model_text: "Modelo (texto libre)",
  town: "Municipio",
  fins: "Quillas",
  accessories: "Accesorios",
  repairs: "Reparaciones",
  description: "Descripción",
};

export const EDITABLE_MAX: Record<EditableField, number> = {
  brand_text: 60,
  model_text: 60,
  town: 80,
  fins: 60,
  accessories: 120,
  repairs: 600,
  description: 2000,
};

/** Solo los campos que cambian (recortados). Así la auditoría registra exactamente lo editado. */
export function changedFields(initial: Partial<Record<EditableField, string | null>>, next: Partial<Record<EditableField, string>>) {
  const patch: Partial<Record<EditableField, string>> = {};
  for (const k of EDITABLE_FIELDS) {
    if (!(k in next)) continue;
    const v = (next[k] ?? "").trim();
    if (v !== (initial[k] ?? "").trim()) patch[k] = v;
  }
  return patch;
}
