// Catálogo del panel (marcas, modelos, medidas y tiendas): validación y utilidades puras.
// Sin red ni Next: lo usan las Server Actions (src/app/admin/catalogo/actions.ts, tiendas/actions.ts),
// las páginas y los tests (tests/unit/admin-catalog.test.ts). Los límites copian los checks de la
// base de datos (supabase/migrations/20261022120000_schema.sql y 20261025090100_admin_panel.sql).

import { z } from "zod";
import { CONSTRUCTIONS, SHAPES, slugify } from "@/lib/domain/taxonomy";
import { parseInches } from "@/lib/publish/parse";

export const SLUG_RE = /^[a-z0-9-]{2,60}$/;
export const MAX_ALIASES = 30;

/** Texto de un FormData (null si no está) → string recortado. */
export const fdText = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};
/** Casilla de un formulario: presente y distinta de "off"/"false". */
export const fdBool = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return v != null && v !== "" && v !== "off" && v !== "false";
};

/** Slug a partir de un nombre: el de la taxonomía, recortado a 60 caracteres y sin guion final. */
export const toSlug = (name: string) => slugify(name).slice(0, 60).replace(/-+$/, "");

/**
 * «Torq Surfboards, TORQ ,  torq-surf» → ["Torq Surfboards", "torq-surf"]: recorta, quita vacíos y
 * duplicados (sin distinguir mayúsculas ni acentos) y descarta el propio nombre de la marca.
 */
export function parseAliases(raw: string, brandName = ""): string[] {
  const own = normalizeName(brandName);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n;]/)) {
    const a = part.replace(/\s+/g, " ").trim();
    const key = normalizeName(a);
    if (!a || !key || key === own || seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

/** Nombre comparable: minúsculas, sin acentos y sin espacios, guiones ni signos. */
export const normalizeName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** Distancia de edición (Levenshtein) con corte: devuelve max + 1 si la supera. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * ¿Parecen el mismo nombre? Iguales al normalizar («Fun-Tet» = «fun tet»), o casi iguales:
 * 1 letra de diferencia desde 4 caracteres, 2 desde 9 («Mod Fish» / «Mod Fsh»).
 */
export function similarNames(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const len = Math.min(x.length, y.length);
  if (len < 4) return false;
  return editDistance(x, y, 2) <= (len >= 9 ? 2 : 1);
}

/**
 * Grupos de posibles duplicados dentro del mismo grupo (`group`: la marca para modelos; uno solo
 * para marcas). Compara el nombre y los alias. Solo avisa: no fusiona ni borra nada.
 */
export function findSimilar<T extends { id: number; name: string; aliases?: string[] }>(
  items: T[],
  group: (x: T) => string | number = () => 0,
): T[][] {
  const byGroup = new Map<string | number, T[]>();
  for (const it of items) {
    const g = group(it);
    const list = byGroup.get(g);
    if (list) list.push(it);
    else byGroup.set(g, [it]);
  }
  const out: T[][] = [];
  for (const list of byGroup.values()) {
    // Unión de pares parecidos (un grupo por cada conjunto conectado).
    const parent = list.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const names = list.map((x) => [x.name, ...(x.aliases ?? [])]);
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (names[i].some((a) => names[j].some((b) => similarNames(a, b)))) parent[find(i)] = find(j);
    const groups = new Map<number, T[]>();
    list.forEach((x, i) => {
      const r = find(i);
      const g = groups.get(r);
      if (g) g.push(x);
      else groups.set(r, [x]);
    });
    for (const g of groups.values()) if (g.length > 1) out.push(g);
  }
  return out;
}

/**
 * Nuevo orden de las marcas destacadas tras mover una arriba o abajo. Devuelve los cambios
 * necesarios (id → sort_order 1..n), solo de las filas cuyo orden cambia.
 */
export function moveFeatured(
  featured: { id: number; sort_order: number }[],
  id: number,
  dir: "up" | "down",
): { id: number; sort_order: number }[] {
  const ids = featured.map((b) => b.id);
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < ids.length) [ids[i], ids[j]] = [ids[j], ids[i]];
  const current = new Map(featured.map((b) => [b.id, b.sort_order]));
  return ids.map((bid, k) => ({ id: bid, sort_order: k + 1 })).filter((c) => current.get(c.id) !== c.sort_order);
}

// ─────────────── Esquemas (zod) ───────────────

const slug = z
  .string()
  .trim()
  .regex(SLUG_RE, "El slug solo admite minúsculas, números y guiones (2 a 60 caracteres).");
const optText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}: máximo ${max} caracteres.`)
    .transform((v) => v || null);

export const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/** Ruta o URL https del logotipo. Nada de javascript:, data: ni http. */
const logoPath = optText(300, "Logotipo").refine(
  (v) => v == null || /^(https:\/\/[^\s"'<>]+|[A-Za-z0-9][A-Za-z0-9/_.-]*)$/.test(v),
  "Logotipo: una ruta de Storage (marcas/torq.svg) o una URL https.",
);

export const brandSchema = z
  .object({
    name: z.string().trim().min(1, "Escribe el nombre de la marca.").max(60, "Nombre: máximo 60 caracteres."),
    slug,
    intro: optText(2000, "Introducción"),
    logo_path: logoPath,
    aliases: z.string().max(3000, "Demasiados alias."),
    featured: z.boolean(),
    sort_order: z.coerce.number().int("El orden es un número entero.").min(0, "Orden: de 0 a 999.").max(999, "Orden: de 0 a 999."),
  })
  .transform((b, ctx) => {
    const aliases = parseAliases(b.aliases, b.name);
    if (aliases.length > MAX_ALIASES) ctx.addIssue({ code: "custom", message: `Máximo ${MAX_ALIASES} alias.` });
    if (aliases.some((a) => a.length > 60)) ctx.addIssue({ code: "custom", message: "Cada alias: máximo 60 caracteres." });
    return { ...b, aliases };
  });
export type BrandInput = z.output<typeof brandSchema>;

export const brandFromForm = (fd: FormData) =>
  brandSchema.safeParse({
    name: fdText(fd, "name"),
    slug: fdText(fd, "slug") || toSlug(fdText(fd, "name")),
    intro: fdText(fd, "intro"),
    logo_path: fdText(fd, "logo_path"),
    aliases: fdText(fd, "aliases"),
    featured: fdBool(fd, "featured"),
    sort_order: fdText(fd, "sort_order") || "0",
  });

export const mergeSchema = z.object({
  into: idSchema,
  reason: z.string().trim().min(3, "Indica el motivo (al menos 3 caracteres).").max(1000),
  confirm: z.literal(true, { error: "Marca la casilla de confirmación." }),
});

export const modelSchema = z.object({
  brand_id: idSchema,
  name: z.string().trim().min(1, "Escribe el nombre del modelo.").max(60, "Nombre: máximo 60 caracteres."),
  slug,
  shape: z.enum(SHAPES, { error: "Elige una forma." }),
  construction: z.enum(CONSTRUCTIONS, { error: "Elige una construcción." }),
  description: optText(2000, "Descripción"),
  source_note: optText(500, "Fuente"),
});
export type ModelInput = z.output<typeof modelSchema>;

export const modelFromForm = (fd: FormData) =>
  modelSchema.safeParse({
    brand_id: fdText(fd, "brand_id"),
    name: fdText(fd, "name"),
    slug: fdText(fd, "slug") || toSlug(fdText(fd, "name")),
    shape: fdText(fd, "shape"),
    construction: fdText(fd, "construction"),
    description: fdText(fd, "description"),
    source_note: fdText(fd, "source_note"),
  });

/** «20 1/2», «20,5» o «20.5» → pulgadas (null si vacío; NaN si no se entiende). */
export const inchesField = (text: string) => (!text.trim() ? null : text.length > 24 ? Number.NaN : (parseInches(text) ?? Number.NaN));
/** «7'2"» o «86» → pulgadas de longitud. */
export function lengthField(text: string): number | null {
  const t = text.trim();
  if (t.length > 24) return Number.NaN; // campos cortos: acota el coste de las expresiones regulares
  if (!t) return null;
  const ft = t.match(/^(\d{1,2})\s*['’]\s*(\d{1,2}(?:[.,]\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?\s*["”]?$/);
  if (ft) {
    const inches = ft[2] ? Number(ft[2].replace(",", ".")) : 0;
    const frac = ft[3] && Number(ft[4]) ? Number(ft[3]) / Number(ft[4]) : 0;
    return Number(ft[1]) * 12 + inches + frac;
  }
  return inchesField(t);
}

const range = (min: number, max: number, label: string) =>
  z
    .number({ error: `${label}: escribe un número.` })
    .refine((n) => Number.isFinite(n), `${label}: no se entiende el valor.`)
    .refine((n) => n >= min && n <= max, `${label}: entre ${min} y ${max}.`);

export const sizeSchema = z.object({
  label: z.string().trim().min(1, "Escribe la etiqueta de la medida (p. ej. 7'2\").").max(20, "Etiqueta: máximo 20 caracteres."),
  length_in: range(48, 144, "Longitud (pulgadas)").transform((n) => Math.round(n * 100) / 100),
  width_in: range(14, 30, "Anchura (pulgadas)").transform((n) => Math.round(n * 1000) / 1000),
  thickness_in: range(1.5, 5, "Grosor (pulgadas)").transform((n) => Math.round(n * 1000) / 1000),
  volume_l: range(10, 150, "Volumen (litros)")
    .transform((n) => Math.round(n * 10) / 10)
    .nullable(),
  sort_order: z.number().int("Orden: número entero.").min(0, "Orden: de 0 a 999.").max(999, "Orden: de 0 a 999."),
});
export type SizeInput = z.output<typeof sizeSchema>;

const numOrNaN = (t: string) => (t.trim() ? Number(t.replace(",", ".")) : null);

export function sizeFromForm(fd: FormData) {
  const vol = numOrNaN(fdText(fd, "volume_l"));
  return sizeSchema.safeParse({
    label: fdText(fd, "label"),
    length_in: lengthField(fdText(fd, "length_in")) ?? undefined,
    width_in: inchesField(fdText(fd, "width_in")) ?? undefined,
    thickness_in: inchesField(fdText(fd, "thickness_in")) ?? undefined,
    volume_l: vol,
    sort_order: numOrNaN(fdText(fd, "sort_order")) ?? 0,
  });
}

export const SHOP_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];
export const SHOP_STATUS_INFO: Record<ShopStatus, { label: string; tone: "warning" | "success" | "error" | "neutral" }> = {
  pending: { label: "Pendiente", tone: "warning" },
  approved: { label: "Aprobada", tone: "success" },
  rejected: { label: "Rechazada", tone: "error" },
  suspended: { label: "Suspendida", tone: "neutral" },
};
export const isShopStatus = (v: unknown): v is ShopStatus => SHOP_STATUSES.includes(v as ShopStatus);

export const shopSchema = z.object({
  name: z.string().trim().min(2, "Nombre: al menos 2 caracteres.").max(80, "Nombre: máximo 80 caracteres."),
  slug,
  type: z.enum(["tienda", "escuela"], { error: "Elige tienda o escuela." }),
  zone_slug: z.string().regex(/^[a-z0-9-]{2,40}$/, "Elige una zona."),
  town: z.string().trim().min(2, "Localidad: al menos 2 caracteres.").max(80, "Localidad: máximo 80 caracteres."),
  address: optText(200, "Dirección"),
  hours: optText(200, "Horario"),
  inventory_source: optText(200, "Origen del inventario"),
});
export type ShopInput = z.output<typeof shopSchema>;

export const shopFromForm = (fd: FormData) =>
  shopSchema.safeParse({
    name: fdText(fd, "name"),
    slug: fdText(fd, "slug") || toSlug(fdText(fd, "name")),
    type: fdText(fd, "type"),
    zone_slug: fdText(fd, "zone_slug"),
    town: fdText(fd, "town"),
    address: fdText(fd, "address"),
    hours: fdText(fd, "hours"),
    inventory_source: fdText(fd, "inventory_source"),
  });

export const reasonSchema = z
  .string()
  .max(1000, "Motivo: máximo 1000 caracteres.")
  .transform((v) => v.trim());

/** Primer mensaje de error de zod, listo para mostrar. */
export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Revisa los datos del formulario.";
