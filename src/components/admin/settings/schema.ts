// Configuración editable (app_settings): validación pura. Copia las reglas de admin_update_setting
// (supabase/migrations/20261025090100_admin_panel.sql), que vuelve a comprobarlo todo.

import { z } from "zod";

export const NOTICE_MAX = 280;

export const siteNoticeSchema = z.object({
  active: z.boolean(),
  text: z.string().trim().max(NOTICE_MAX, `El aviso admite como máximo ${NOTICE_MAX} caracteres.`),
  tone: z.enum(["info", "warning"], { error: "Elige el tono del aviso." }),
}).refine((v) => !v.active || v.text.length > 0, "Escribe el texto del aviso para activarlo.");
export type SiteNotice = z.output<typeof siteNoticeSchema>;

export const NUMBER_SETTINGS = ["report_threshold", "report_daily_limit"] as const;
export type NumberSetting = (typeof NUMBER_SETTINGS)[number];

export const settingNumberSchema = z.coerce
  .number({ error: "Escribe un número." })
  .int("Debe ser un número entero.")
  .min(1, "Entre 1 y 100.")
  .max(100, "Entre 1 y 100.");

/** Valor guardado → aviso válido (o el aviso apagado si el valor no es válido). */
export function parseSiteNotice(value: unknown): SiteNotice {
  const off: SiteNotice = { active: false, text: "", tone: "info" };
  if (!value || typeof value !== "object") return off;
  const v = value as Record<string, unknown>;
  const r = siteNoticeSchema.safeParse({ active: v.active === true, text: typeof v.text === "string" ? v.text : "", tone: v.tone });
  return r.success ? r.data : off;
}
