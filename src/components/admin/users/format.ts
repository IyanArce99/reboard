// Utilidades puras de Usuarios y Auditoría del panel (sin acceso a datos; probadas en tests/unit).
import type { Tone } from "@/components/admin/ui";

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string | undefined | null): v is string => !!v && UUID_RE.test(v);

// ——— Usuarios ———

export const USER_STATUSES = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activas" },
  { value: "suspended", label: "Suspendidas" },
  { value: "staff", label: "Equipo (moderación y admin)" },
] as const;
export type UserStatusFilter = "active" | "suspended" | "staff";

export const ROLES = ["user", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { user: "Usuario", moderator: "Moderación", admin: "Administración" };
export const ROLE_TONE: Record<Role, Tone> = { user: "neutral", moderator: "info", admin: "warning" };

/** Filtros del listado de usuarios desde la URL. Lo no válido se ignora (no se envía a la base de datos). */
export function parseUserFilters(sp: Record<string, Param>) {
  const q = first(sp.q)?.slice(0, 200);
  const raw = first(sp.estado);
  const estado = USER_STATUSES.some((s) => s.value && s.value === raw) ? (raw as UserStatusFilter) : undefined;
  return { q, estado };
}

export const LISTING_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Borrador", tone: "neutral" },
  published: { label: "Publicado", tone: "success" },
  sold: { label: "Vendido", tone: "info" },
  expired: { label: "Caducado", tone: "neutral" },
  withdrawn: { label: "Retirado por el vendedor", tone: "neutral" },
};
export const MODERATION: Record<string, { label: string; tone: Tone }> = {
  visible: { label: "Visible", tone: "success" },
  flagged: { label: "En revisión", tone: "warning" },
  removed: { label: "Oculto", tone: "error" },
};

/** Estado del bloqueo de inicio de sesión de Auth (banned_until) respecto a `now`. */
export function banState(bannedUntil: string | null | undefined, now = Date.now()) {
  const t = bannedUntil ? Date.parse(bannedUntil) : NaN;
  const blocked = Number.isFinite(t) && t > now;
  return { blocked, forever: blocked && t - now > 50 * 365 * 86_400_000 };
}

// ——— Auditoría ———

export const ENTITY_TYPES = [
  { value: "user", label: "Usuario" },
  { value: "role", label: "Rol" },
  { value: "listing", label: "Anuncio" },
  { value: "report", label: "Reporte" },
  { value: "brand", label: "Marca" },
  { value: "model", label: "Modelo" },
  { value: "model_size", label: "Medida de modelo" },
  { value: "shop", label: "Tienda o escuela" },
  { value: "setting", label: "Configuración" },
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number]["value"];
export const entityLabel = (t: string) => ENTITY_TYPES.find((e) => e.value === t)?.label ?? t;

/** Filtros de la auditoría desde la URL. Solo pasan valores con el formato que admite la tabla. */
export function parseAuditFilters(sp: Record<string, Param>) {
  const tipo = first(sp.tipo);
  const accion = first(sp.accion)?.toLowerCase();
  const actor = first(sp.actor)?.toLowerCase();
  const entidad = first(sp.entidad);
  return {
    tipo: ENTITY_TYPES.some((e) => e.value === tipo) ? (tipo as EntityType) : undefined,
    accion: accion && /^[a-z_]{2,60}$/.test(accion) ? accion : undefined,
    actor: isUuid(actor) ? actor : undefined,
    entidad: entidad && entidad.length <= 80 ? entidad : undefined,
    /** Hay algún filtro escrito que no es válido (para avisar en vez de ignorarlo en silencio). */
    invalid:
      (!!first(sp.accion) && !(accion && /^[a-z_]{2,60}$/.test(accion))) ||
      (!!first(sp.actor) && !isUuid(actor)) ||
      (!!entidad && entidad.length > 80),
  };
}

/** Enlace a la página del panel de la entidad, cuando la hay. */
export function entityHref(type: string, id: string): string | null {
  switch (type) {
    case "user":
    case "role":
      return isUuid(id) ? `/admin/usuarios/${id}` : null;
    case "listing":
      return /^a\d{1,15}$/.test(id) ? `/admin/anuncios/${id}` : null;
    case "brand":
    case "model":
    case "model_size":
      return "/admin/catalogo";
    case "shop":
      return "/admin/tiendas";
    case "report":
      return "/admin/reportes";
    case "setting":
      return "/admin/configuracion";
    default:
      return null;
  }
}

const ACTION_LABEL: Record<string, string> = {
  suspend: "Suspender",
  reactivate: "Reactivar",
  ban: "Bloquear acceso",
  unban: "Desbloquear acceso",
  ban_failed: "Bloqueo de acceso fallido",
  unban_failed: "Desbloqueo de acceso fallido",
  set_role: "Cambiar rol",
  hide: "Ocultar",
  remove: "Retirar",
  restore: "Restaurar",
  mark_sold: "Marcar vendido",
  dismiss_reports: "Descartar reportes",
  resolve_reports: "Resolver reportes",
  flag: "Marcar en revisión",
  edit: "Editar",
  merge: "Fusionar",
  verify: "Verificar",
  unverify: "Quitar verificación",
  set_status: "Cambiar estado",
  insert: "Crear",
  update: "Modificar",
  delete: "Eliminar",
};
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a;

// ——— Diferencias antes / después ———

/** Claves que nunca se muestran aunque llegaran a guardarse (datos de contacto o credenciales). */
const SENSITIVE = /phone|tel[eé]fono|whatsapp|contact_value|password|secret|token|api_?key|ip_?addr/i;
/** Campos técnicos que cambian siempre y no aportan al leer la auditoría. */
const NOISE = new Set(["updated_at"]);

export const MAX_VALUE = 80;
export const MAX_KEYS = 8;

export function shortValue(v: unknown, max = MAX_VALUE): string {
  if (v === undefined) return "—";
  if (v === null) return "vacío";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export interface DiffRow {
  key: string;
  before: string;
  after: string;
}

/**
 * Cambios entre `before` y `after` (jsonb de la auditoría): solo las claves distintas, con valores
 * recortados, sin claves sensibles y como mucho MAX_KEYS filas (el resto se cuenta en `more`).
 * Si alguno no es un objeto, se muestra entero (recortado) como una sola fila.
 */
export function auditDiff(before: unknown, after: unknown, maxKeys = MAX_KEYS): { rows: DiffRow[]; more: number } {
  if (before == null && after == null) return { rows: [], more: 0 };
  if ((before != null && !isObject(before)) || (after != null && !isObject(after))) {
    return { rows: [{ key: "valor", before: shortValue(before ?? undefined), after: shortValue(after ?? undefined) }], more: 0 };
  }
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !NOISE.has(k));
  const rows: DiffRow[] = [];
  let hidden = false;
  for (const k of keys) {
    const bv = before == null ? undefined : b[k];
    const av = after == null ? undefined : a[k];
    if (JSON.stringify(bv) === JSON.stringify(av)) continue;
    if (SENSITIVE.test(k)) {
      hidden = true;
      continue;
    }
    rows.push({ key: k, before: shortValue(bv), after: shortValue(av) });
  }
  const more = Math.max(0, rows.length - maxKeys);
  const out = rows.slice(0, maxKeys);
  if (hidden) out.push({ key: "(datos privados)", before: "oculto", after: "oculto" });
  return { rows: out, more };
}
