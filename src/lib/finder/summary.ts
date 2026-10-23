// Resumen de respuestas del asistente («Tu perfil hasta ahora» y chips del resultado).
// Módulo puro: sin React.

import { finderZoneName } from "./listings";
import { FREQS, GOALS, LEVELS, WAVES, isValidWeight, type FinderState } from "./recommend";

export interface SummaryItem {
  label: string;
  value: string;
  step: number;
}

/**
 * Respuestas ya dadas, en orden de paso. Solo se listan las contestadas: nada de filas «—» o
 * «Sin indicar». Con `withScope`, la zona y el presupuesto aparecen siempre (el resultado
 * siempre filtra por una zona, aunque sea «Toda España»).
 */
export function summaryOf(W: FinderState, withScope = false): SummaryItem[] {
  const items: (SummaryItem | null)[] = [
    isValidWeight(W.w) ? { label: "Peso", value: `${W.w} kg`, step: 1 } : null,
    W.lvl ? { label: "Nivel", value: LEVELS.find((l) => l[0] === W.lvl)![1], step: 2 } : null,
    W.cur ? { label: "Tabla actual", value: W.cur, step: 3 } : null,
    W.freq ? { label: "Frecuencia", value: FREQS.find((f) => f[0] === W.freq)![1], step: 4 } : null,
    W.waves ? { label: "Olas", value: WAVES.find((w) => w[0] === W.waves)![1], step: 5 } : null,
    W.goals.length
      ? { label: "Objetivo", value: W.goals.map((g) => GOALS.find((x) => x[0] === g)![1]).join(", "), step: 6 }
      : null,
    withScope || W.zone || W.budget
      ? {
          label: "Zona y presupuesto",
          value: `${finderZoneName(W).replace(/^toda/, "Toda")}${W.budget ? ` · hasta ${W.budget} €` : ""}`,
          step: 7,
        }
      : null,
  ];
  return items.filter((s): s is SummaryItem => !!s);
}
