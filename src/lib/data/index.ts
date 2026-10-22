import "server-only";
import { mockRepository } from "./mock-repository";
import type { ListingRepository } from "./repository";

export type { ListingRepository } from "./repository";

/**
 * Devuelve el repositorio de datos.
 * REBOARD_DATA_SOURCE=mock (por defecto) usa el inventario DEMO.
 * No hay base de datos todavía: pedir otra fuente falla en lugar de inventarla.
 */
export function getRepository(): ListingRepository {
  const source = process.env.REBOARD_DATA_SOURCE ?? "mock";
  if (source === "mock") return mockRepository;
  throw new Error(
    `REBOARD_DATA_SOURCE="${source}" no está implementado. La base de datos real está pendiente (docs/ROADMAP.md).`,
  );
}
