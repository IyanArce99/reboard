// Estado local del panel del vendedor DEMO (confirmar, bajar precio, vendida…).
// Vive SOLO en este dispositivo, con clave propia `rb-panel-v1`. No modifica los anuncios
// del repositorio ni lo que ven otros usuarios: no hay backend (docs/ROADMAP.md).

import type { ListingStatus } from "@/lib/domain/taxonomy";

export const PANEL_KEY = "rb-panel-v1";

export interface OwnOverride {
  status?: ListingStatus;
  confirmedAt?: string;
  price?: number;
}

export type PanelState = Record<string, OwnOverride>;

export function readPanelState(): PanelState {
  try {
    const raw = localStorage.getItem(PANEL_KEY);
    const p: unknown = raw ? JSON.parse(raw) : null;
    return p && typeof p === "object" && !Array.isArray(p) ? (p as PanelState) : {};
  } catch {
    return {};
  }
}

export function writePanelState(s: PanelState) {
  try {
    localStorage.setItem(PANEL_KEY, JSON.stringify(s));
  } catch {
    // Navegación privada o almacenamiento bloqueado: el estado sigue en memoria.
  }
}
