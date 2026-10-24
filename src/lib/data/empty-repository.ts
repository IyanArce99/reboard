import "server-only";
import { cacheLife } from "next/cache";
import { POPULAR_BRANDS, REFERENCE_BRANDS, slugify } from "@/lib/domain/taxonomy";
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
  saveCount: async () => 0,
  byIds: async () => [],
  similar: async () => [],
  countBySeller: async () => 0,
  shopListings: async () => [],
  modelPrices: async () => ({}),
  sellerListings: async () => [],
  listingParams: async () => [],
  catalog: async () => [],
  // Nombres de marca de referencia (no son datos de anuncios): el selector de publicar no sale vacío.
  // Mismo orden que Supabase: destacadas (las habituales, POPULAR_BRANDS) primero y luego por nombre.
  brands: async () => {
    const featured = POPULAR_BRANDS.filter((b) => REFERENCE_BRANDS.includes(b));
    const rest = REFERENCE_BRANDS.filter((b) => !featured.includes(b)).sort((a, b) => a.localeCompare(b, "es"));
    return [
      ...featured.map((name) => ({ slug: slugify(name), name, featured: true })),
      ...rest.map((name) => ({ slug: slugify(name), name, featured: false })),
    ];
  },
  shops: async () => [],
};
