import type { CatalogModel, Listing, Shop } from "@/lib/domain/types";
import type { ListingStatus } from "@/lib/domain/taxonomy";
import type { Filters, Sort } from "@/lib/search/filters";

/**
 * Acceso a datos de Reboard, por consultas: cada pantalla pide lo que necesita y la
 * implementación decide cómo resolverlo (en memoria en el mock; en SQL con Supabase).
 * Implementaciones: supabase-repository.ts (datos reales) y empty-repository.ts (sin base de datos).
 * El repositorio en memoria con el inventario DEMO es un fixture de tests (tests/fixtures).
 * Contrato documentado en docs/ARCHITECTURE.md §2.3.
 */

export interface SearchOptions {
  sort?: Sort;
  limit: number;
  offset?: number;
  /** Zona de referencia del usuario: la usa el orden «distancia». */
  here?: string;
  /** Excluye una zona (p. ej. «otras zonas» de la home). */
  excludeZone?: string;
  /** Estados incluidos. Por defecto, los visibles en búsquedas: disponible y pendiente. */
  statuses?: ListingStatus[];
}

export interface SearchPage {
  items: Listing[];
  /** Total de anuncios que cumplen los filtros (sin paginar). */
  total: number;
}

/**
 * Recuentos de facetas del panel de filtros y de la home. Cada dimensión ignora su propio filtro:
 * - zones[slug]: con esa zona o región y sin distancia.
 * - shapes[forma]: con solo esa forma.
 * - brands[slug]: con esa marca y sin modelo.
 * - anyZone: en todo el territorio activo, «Todas las islas» (sin zona ni distancia).
 */
export interface Facets {
  anyZone: number;
  zones: Record<string, number>;
  shapes: Record<string, number>;
  brands: Record<string, number>;
}

export interface ListingRepository {
  /** true si los datos son simulados. La UI muestra el aviso DEMO y el sitio va con noindex. */
  readonly isDemo: boolean;
  /**
   * Capacidades de la fuente de datos. `distance`: hay km por anuncio (solo el mock DEMO).
   * Sin coordenadas (Supabase), la UI oculta la distancia y «Más cerca» ordena primero la zona.
   */
  readonly capabilities: { distance: boolean };
  /** Fecha respecto a la que se calculan «hace N días» (cacheada junto a los datos). */
  now(): Promise<Date>;

  /** Búsqueda paginada. Con filtro de litros, los anuncios sin litros no coinciden (ver unknownVolume). */
  search(f: Filters, opts: SearchOptions): Promise<SearchPage>;
  /** Anuncios que cumplirían los filtros salvo por no indicar los litros («litros sin indicar»). */
  unknownVolume(f: Filters, limit: number): Promise<SearchPage>;
  count(f: Filters): Promise<number>;
  facets(f: Filters): Promise<Facets>;

  /** Anuncio por su id público (a1040), en cualquier estado. */
  byId(id: string): Promise<Listing | null>;
  /** Anuncios por id público, en el orden pedido y en cualquier estado. Ignora los que no existen. */
  byIds(ids: string[]): Promise<Listing[]>;
  /** Alternativas activas: misma forma o volumen parecido (±8 L), primero de la misma zona. */
  similar(l: Listing, limit: number): Promise<Listing[]>;
  /** Anuncios activos del mismo vendedor (incluido este si está activo). */
  countBySeller(l: Listing): Promise<number>;
  /** Anuncios activos de una tienda o escuela, más recientes primero. */
  shopListings(shopSlug: string): Promise<Listing[]>;
  /** Precios de los anuncios activos por modelo de catálogo (referencia al publicar). */
  modelPrices(): Promise<Record<string, number[]>>;
  /**
   * Anuncios de un vendedor para su panel, en cualquier estado.
   * DEMO: con `null` devuelve el vendedor de demostración (no hay autenticación todavía).
   */
  sellerListings(sellerId: string | null): Promise<Listing[]>;
  /** Pares slug/id para prerenderizar fichas (todas las del mock; las N recientes con base de datos). */
  listingParams(limit?: number): Promise<{ slug: string; id: string }[]>;

  /** Catálogo público: solo modelos activos y verificados (medidas copiadas de la tabla del fabricante). */
  catalog(): Promise<CatalogModel[]>;
  /**
   * Marcas activas (tengan o no modelos en el catálogo): primero las destacadas en el orden del panel
   * (/admin/catalogo), luego el resto por nombre. `featured`: destacada en el formulario de publicación.
   * Opcional solo por los fixtures de tests; las implementaciones de la app siempre lo indican.
   */
  brands(): Promise<{ slug: string; name: string; featured?: boolean }[]>;
  shops(): Promise<Shop[]>;
}
