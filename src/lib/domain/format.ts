// Formateadores compartidos (equivalentes a eur, fmtIn, ftLabel y ago del prototipo).

export const eur = (n: number) => `${n.toLocaleString("es-ES")} €`;

export const num = (n: number) => n.toLocaleString("es-ES");

/** Pulgadas decimales a fracción de octavos: 21.5 → 21 1/2". */
export function fmtIn(x: number) {
  const whole = Math.floor(x);
  const fr = x - whole;
  const F: [number, string][] = [
    [0, ""],
    [0.125, " 1/8"],
    [0.25, " 1/4"],
    [0.375, " 3/8"],
    [0.5, " 1/2"],
    [0.625, " 5/8"],
    [0.75, " 3/4"],
    [0.875, " 7/8"],
    [1, ""],
  ];
  let best = F[0];
  for (const f of F) if (Math.abs(fr - f[0]) < Math.abs(fr - best[0])) best = f;
  return `${best[0] === 1 ? whole + 1 : whole}${best[1]}"`;
}

/** Pulgadas totales a pies: 86 → 7'2". */
export const ftLabel = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;

export const inToCm = (inches: number) => Math.round(inches * 2.54);

export const DAY_MS = 86_400_000;

export const daysBetween = (iso: string, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));

export const ago = (days: number) =>
  days === 0 ? "hoy" : days === 1 ? "ayer" : `hace ${days} días`;
