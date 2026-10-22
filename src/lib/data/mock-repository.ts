import "server-only";
import { REGIONS, SHAPES, ZONES, isActiveStatus, slugify } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import type { Filters } from "@/lib/search/filters";
import { countMatches, matches, sortListings } from "@/lib/search/match";
import { isOfShop } from "@/components/shops/shops";
import {
  DEMO_CATALOG,
  DEMO_REFERENCE_DATE,
  DEMO_SHOPS,
  buildDemoInventory,
} from "@/mocks/demo-inventory";
import type { ListingRepository, SearchOptions } from "./repository";

/** Tamaños del inventario demo, como el selector «Inventario» del prototipo. */
const SIZES = [20, 100, 1000];

function demoSize() {
  const n = Number(process.env.REBOARD_DEMO_INVENTORY ?? 100);
  return SIZES.includes(n) ? n : 100;
}

let cache: Listing[] | null = null;
const inventory = () => (cache ??= buildDemoInventory(demoSize()));
const activeListings = () => inventory().filter((l) => isActiveStatus(l.status));

const byRecent = (a: Listing, b: Listing) => +new Date(b.publishedAt) - +new Date(a.publishedAt);

/** Filtra y ordena en memoria. Es el único sitio de la app que filtra anuncios así. */
function query(f: Filters, opts: Omit<SearchOptions, "limit" | "offset">) {
  const statuses = opts.statuses;
  const pool = statuses ? inventory().filter((l) => statuses.includes(l.status)) : activeListings();
  const res = pool.filter((l) => matches(l, f) && (!opts.excludeZone || l.zone !== opts.excludeZone));
  return opts.sort ? sortListings(res, opts.sort, opts.here ?? "") : res;
}

const page = (items: Listing[], limit: number, offset = 0) => ({ items: items.slice(offset, offset + limit), total: items.length });

// Anuncios «propios» del vendedor DEMO en el panel (prototipo: own = ['a1040','a1054','a1096']).
const PROTOTYPE_OWN = ["a1040", "a1054", "a1096"];

/**
 * Elige de forma determinista 3 anuncios del inventario demo como «míos»: los del prototipo
 * que existan y, si no hay ninguno pendiente o vendido, añade el primero de cada estado.
 */
function pickOwn(all: Listing[]): Listing[] {
  const own = PROTOTYPE_OWN.map((id) => all.find((l) => l.id === id)).filter((l): l is Listing => !!l);
  const ensure = (status: Listing["status"]) => {
    if (own.some((l) => l.status === status)) return;
    const extra = all.find((l) => l.status === status && !own.includes(l));
    if (!extra) return;
    // Sustituye el último anuncio disponible (nunca el primero) para seguir con 3.
    const i = own.length >= 3 ? own.findLastIndex((l, k) => k > 0 && l.status === "disponible") : -1;
    if (i > 0) own[i] = extra;
    else own.push(extra);
  };
  ensure("vendida");
  ensure("pendiente");
  for (const l of all) {
    if (own.length >= 3) break;
    if (!own.includes(l)) own.push(l);
  }
  return own;
}

/** Repositorio DEMO en memoria. Todo lo que devuelve lleva isDemo = true. */
export const mockRepository: ListingRepository = {
  isDemo: true,
  now: () => DEMO_REFERENCE_DATE,

  search: async (f, { limit, offset, ...opts }) => page(query(f, opts), limit, offset),

  unknownVolume: async (f, limit) =>
    page(activeListings().filter((l) => l.volume.value == null && matches(l, f, true)), limit),

  count: async (f) => countMatches(activeListings(), f),

  facets: async (f) => {
    const active = activeListings();
    const n = (p: Partial<Filters>) => countMatches(active, { ...f, ...p });
    const brandSlugs = [...new Set(DEMO_CATALOG.map((m) => slugify(m.brand))), "sin-marca"];
    return {
      anyZone: n({ zone: "", dist: null }),
      zones: Object.fromEntries([...REGIONS, ...ZONES].map((z) => [z.slug, n({ zone: z.slug, dist: null })])),
      shapes: Object.fromEntries(SHAPES.map((s) => [s, n({ shapes: [s] })])),
      brands: Object.fromEntries(brandSlugs.map((b) => [b, n({ brand: b, model: "" })])),
    };
  },

  byId: async (id) => inventory().find((l) => l.id === id) ?? null,

  byIds: async (ids) => ids.map((id) => inventory().find((l) => l.id === id)).filter((l): l is Listing => !!l),

  similar: async (l, limit) => {
    const vol = l.volume.value;
    return activeListings()
      .filter((x) => x.id !== l.id && (x.shape === l.shape || (vol != null && x.volume.value != null && Math.abs(x.volume.value - vol) <= 8)))
      .sort((a, b) => Number(b.zone === l.zone) - Number(a.zone === l.zone) || byRecent(a, b))
      .slice(0, limit);
  },

  countBySeller: async (l) => activeListings().filter((x) => x.seller.name === l.seller.name).length,

  shopListings: async (shopSlug) => {
    const s = DEMO_SHOPS.find((x) => x.slug === shopSlug);
    if (!s) return [];
    return activeListings()
      .filter((l) => isOfShop(l, s))
      .sort(byRecent);
  },

  modelPrices: async () => {
    const out: Record<string, number[]> = {};
    for (const l of activeListings()) if (l.modelSlug) (out[l.modelSlug] ??= []).push(l.price);
    return out;
  },

  sellerListings: async () => pickOwn(inventory()),

  listingParams: async (limit) => inventory().slice(0, limit).map((l) => ({ slug: l.slug, id: l.id })),

  catalog: async () => DEMO_CATALOG,
  shops: async () => DEMO_SHOPS,
};
