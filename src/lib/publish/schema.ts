// Esquema del anuncio que llega al servidor al publicar o editar (E1).
// Los límites son los mismos que los CHECK de public.listings: si el esquema lo acepta, la base
// de datos también. Módulo puro: lo usan la isla cliente (para avisar antes) y las Server Actions.

import { z } from "zod";
import { CONDITIONS, CONSTRUCTIONS, SHAPES, ZONES, slugify, type Shape } from "@/lib/domain/taxonomy";
import type { CatalogModel } from "@/lib/domain/types";
import { ftLabel } from "@/lib/domain/format";
import { OTHER_MODEL, SHAPER_LOCAL, type FieldSource, type PublishDraft, OTHER_BRAND, isListedBrand } from "./draft";
import { fieldToInches, parseLitres, type MeasureKey } from "./parse";

// En el navegador, sin compilación con `new Function`: la CSP lo bloquea y zod lo detectaba con una
// prueba que deja un aviso `securitypolicyviolation`. Va antes de crear los esquemas (zod lee la
// opción al construirlos). En el servidor se mantiene el modo rápido.
if (typeof window !== "undefined") z.config({ jitless: true });

const source = z.enum(["seller", "manufacturer"]);
const text = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .transform((v) => (v ? v : null));
const longText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim())
    .transform((v) => (v ? v : null));

/** Teléfono en formato E.164. Sin prefijo, se asume España (+34). */
export function toE164(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) digits = /^[6789]\d{8}$/.test(digits) ? `+34${digits}` : `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export const ListingInput = z
  .object({
    // Catálogo (opcional): slugs; el servidor los resuelve a ids.
    brandSlug: z.string().regex(/^[a-z0-9-]{2,60}$/).nullable(),
    modelSlug: z.string().regex(/^[a-z0-9-]{1,60}$/).nullable(),
    catalogSize: z.string().max(20).nullable(),
    brandText: text(60).nullable(),
    modelText: text(60).nullable(),

    sizeLabel: z.string().trim().min(1).max(20),
    lengthIn: z.number().min(48).max(144),
    lengthSource: source,
    widthIn: z.number().min(14).max(30).nullable(),
    widthSource: source.nullable(),
    thicknessIn: z.number().min(1.5).max(5).nullable(),
    thicknessSource: source.nullable(),
    volumeL: z.number().min(10).max(150).nullable(),
    volumeSource: source.nullable(),

    shape: z.enum(SHAPES),
    construction: z.enum(CONSTRUCTIONS),
    condition: z.enum(CONDITIONS),
    repairs: longText(600).nullable(),
    description: longText(2000).nullable(),
    priceEur: z.number().int().min(1).max(20000),

    zoneSlug: z.enum(ZONES.map((zn) => zn.slug) as [string, ...string[]]),
    town: z.string().trim().min(2).max(80),
    contactMethod: z.enum(["whatsapp", "phone"]),
    phone: z.string().max(30).transform((v, ctx) => {
      const e164 = toE164(v);
      if (!e164) ctx.addIssue({ code: "custom", message: "phone" });
      return e164 ?? "";
    }),
  })
  .superRefine((v, ctx) => {
    const pairs: [unknown, unknown, string][] = [
      [v.widthIn, v.widthSource, "widthSource"],
      [v.thicknessIn, v.thicknessSource, "thicknessSource"],
      [v.volumeL, v.volumeSource, "volumeSource"],
    ];
    for (const [value, src, path] of pairs) {
      if ((value == null) !== (src == null)) ctx.addIssue({ code: "custom", path: [path], message: "source" });
    }
    if (v.modelSlug && !v.brandSlug) ctx.addIssue({ code: "custom", path: ["modelSlug"], message: "brand" });
    if (v.catalogSize && !v.modelSlug) ctx.addIssue({ code: "custom", path: ["catalogSize"], message: "model" });
    const usesManufacturer = [v.lengthSource, v.widthSource, v.thicknessSource, v.volumeSource].includes("manufacturer");
    if (usesManufacturer && !v.catalogSize) ctx.addIssue({ code: "custom", path: ["lengthSource"], message: "manufacturer" });
  });

export type ListingInput = z.input<typeof ListingInput>;
export type ListingData = z.output<typeof ListingInput>;

/** Mensajes para el vendedor según el campo que falla. */
export const FIELD_TEXT: Record<string, string> = {
  lengthIn: "La longitud debe estar entre 4' y 12' (122–366 cm).",
  widthIn: "La anchura debe estar entre 14\" y 30\".",
  thicknessIn: "El grosor debe estar entre 1 1/2\" y 5\".",
  volumeL: "Los litros deben estar entre 10 y 150.",
  priceEur: "El precio debe estar entre 1 y 20.000 €.",
  town: "Escribe la localidad donde está la tabla (entre 2 y 80 caracteres).",
  phone: "Revisa el teléfono: por ejemplo, 600 000 000 o +34 600 000 000.",
  shape: "Elige el tipo de tabla.",
  construction: "Elige la construcción.",
  condition: "Elige el estado de la tabla.",
  repairs: "El texto de golpes y reparaciones puede tener hasta 600 caracteres.",
  description: "La descripción puede tener hasta 2.000 caracteres.",
  sizeLabel: "Indica la longitud de la tabla.",
};

export function firstIssueText(error: z.ZodError): string {
  const field = String(error.issues[0]?.path[0] ?? "");
  return FIELD_TEXT[field] ?? "Revisa los datos del anuncio.";
}

const isCatalogValue = (s: FieldSource | undefined) => s === "cat";

/**
 * Borrador de la UI → datos para el servidor.
 * Origen de cada medida: si viene del catálogo y no se ha tocado → 'manufacturer'; si la ha escrito,
 * pegado o confirmado el vendedor → 'seller'. Sin valor, sin origen (nunca se inventan medidas).
 */
export function draftToInput(d: PublishDraft, catalog: CatalogModel[]): ListingInput {
  const catalogBrand = isListedBrand(d.brand) ? d.brand : null;
  const cm = catalogBrand && d.model && d.model !== OTHER_MODEL ? catalog.find((m) => m.brand === catalogBrand && m.model === d.model) : undefined;
  const size = cm?.sizes.find((s) => s.label === d.size);
  const inches = (k: Exclude<MeasureKey, "vol">) => fieldToInches(k, d[k], d.unit);
  const round = (n: number | null, digits: number) => (n == null ? null : Math.round(n * 10 ** digits) / 10 ** digits);
  const src = (k: MeasureKey, value: number | null) =>
    value == null ? null : size && isCatalogValue(d.src[k]) ? ("manufacturer" as const) : ("seller" as const);

  const lengthIn = round(inches("len"), 2);
  const widthIn = round(inches("width"), 3);
  const thicknessIn = round(inches("thick"), 3);
  const volumeL = round(parseLitres(d.vol), 1);

  return {
    brandSlug: catalogBrand ? slugify(catalogBrand) : null,
    modelSlug: cm?.slug ?? null,
    catalogSize: size?.label ?? null,
    // Texto de marca: «Shaper local», la que escribe el vendedor en «Otra marca» o, como respaldo, el
    // nombre de una marca de la lista (si el servidor no la encuentra, la guarda como texto).
    brandText: d.brand === SHAPER_LOCAL ? SHAPER_LOCAL : d.brand === OTHER_BRAND ? d.brandOther.trim().slice(0, 60) || null : catalogBrand,
    modelText: null,
    sizeLabel: size?.label ?? (lengthIn != null ? ftLabel(Math.round(lengthIn)) : d.len.trim().slice(0, 20)),
    lengthIn: lengthIn ?? 0,
    lengthSource: src("len", lengthIn) ?? "seller",
    widthIn,
    widthSource: src("width", widthIn),
    thicknessIn,
    thicknessSource: src("thick", thicknessIn),
    volumeL,
    volumeSource: src("vol", volumeL),
    shape: (d.shape || "evolutiva") as Shape,
    construction: (d.construction || "pu") as ListingInput["construction"],
    condition: (d.condition || "buen-estado") as ListingInput["condition"],
    repairs: d.repairs,
    description: d.description,
    priceEur: Number(d.price) || 0,
    zoneSlug: d.zone,
    town: d.town,
    contactMethod: d.contact === "phone" ? "phone" : "whatsapp",
    phone: d.phone,
  };
}

/** Slug legible del anuncio (como los DEMO): marca o forma, modelo, medida y zona. */
export function listingSlugFor(v: Pick<ListingData, "brandText" | "sizeLabel" | "zoneSlug" | "shape">, brandName: string | null, modelName: string | null) {
  // Sin catálogo: «shaper-local-6-4-…» o «fish-artesanal-6-4-…», como los títulos de la ficha.
  const maker = brandName ?? v.brandText;
  const parts = maker ? [maker, modelName, v.sizeLabel, v.zoneSlug] : [v.shape, "artesanal", v.sizeLabel, v.zoneSlug];
  const base = slugify(parts.filter(Boolean).join(" "));
  let slug = (base.length >= 3 ? base : `tabla-${base}`).slice(0, 120);
  while (slug.endsWith("-")) slug = slug.slice(0, -1);
  return slug;
}
