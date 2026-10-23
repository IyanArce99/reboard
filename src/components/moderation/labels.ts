// Etiquetas en español de los valores de moderación que guarda la base de datos.
// Se usan en la ficha pública (modal de reporte), en /moderacion y en el panel de administración.

export const MODERATION_ACTION_LABEL: Record<string, string> = {
  flag: "Pasado a revisión",
  hide: "Ocultado temporalmente",
  remove: "Retirado por incumplimiento",
  restore: "Restaurado",
  dismiss_reports: "Reportes descartados",
  resolve_reports: "Reportes resueltos",
  mark_sold: "Marcado como vendido",
  edit: "Textos corregidos",
};

export const LISTING_STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  sold: "Vendido",
  expired: "Caducado",
  withdrawn: "Retirado por el vendedor",
};

/** Motivos de reporte (enum report_reason), en el orden en que se ofrecen al usuario. */
export const REPORT_REASONS = [
  ["fraude", "Posible estafa"],
  ["fotos", "Fotografías que no corresponden"],
  ["datos-falsos", "Contenido engañoso"],
  ["duplicado", "Anuncio duplicado"],
  ["inapropiado", "Producto prohibido o no relacionado"],
  ["vendida", "Anuncio ya vendido"],
  ["otro", "Otro motivo"],
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number][0];

export const REPORT_REASON_VALUES = REPORT_REASONS.map(([v]) => v) as [ReportReason, ...ReportReason[]];

export const REPORT_REASON_LABEL: Record<string, string> = Object.fromEntries(REPORT_REASONS);
