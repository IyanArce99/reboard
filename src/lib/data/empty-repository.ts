import "server-only";
import { cacheLife } from "next/cache";
import type { ListingRepository } from "./repository";

const none = { items: [], total: 0 };

// Igual que en Supabase: la fecha de referencia se cachea (Next no permite new Date() al prerenderizar).
async function cachedNow() {
  "use cache";
  cacheLife("minutes");
  return new Date();
}

/**
 * Sin base de datos configurada (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY): la web
 * funciona con la interfaz vacía (estados vacíos, alertas, calculadora), sin datos simulados.
 * El sitio va con noindex mientras tanto (ver siteIndexable en ./index).
 */
export const emptyRepository: ListingRepository = {
  isDemo: false,
  capabilities: { distance: false },
  now: cachedNow,
  search: async () => none,
  unknownVolume: async () => none,
  count: async () => 0,
  facets: async () => ({ anyZone: 0, zones: {}, shapes: {}, brands: {} }),
  byId: async () => null,
  byIds: async () => [],
  similar: async () => [],
  countBySeller: async () => 0,
  shopListings: async () => [],
  modelPrices: async () => ({}),
  sellerListings: async () => [],
  listingParams: async () => [],
  catalog: async () => [],
  brands: async () => [],
  shops: async () => [],
};
