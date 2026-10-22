import type { CatalogModel, Listing, Shop } from "@/lib/domain/types";

/**
 * Acceso a datos de Reboard. Hoy solo existe la implementación DEMO en memoria
 * (src/lib/data/mock-repository.ts). La base de datos real está pendiente de decidir
 * (docs/ROADMAP.md): cuando exista, se implementa esta misma interfaz.
 */
export interface ListingRepository {
  /** true si los datos son simulados. La UI muestra el aviso DEMO y el sitio va con noindex. */
  readonly isDemo: boolean;
  /** Fecha respecto a la que se calculan «hace N días». */
  now(): Date;
  /** Todos los anuncios, incluidos vendidos, caducados y retirados. */
  all(): Promise<Listing[]>;
  /** Anuncios visibles en búsquedas: disponibles o pendientes de confirmar. */
  active(): Promise<Listing[]>;
  byId(id: string): Promise<Listing | null>;
  catalog(): Promise<CatalogModel[]>;
  shops(): Promise<Shop[]>;
}
