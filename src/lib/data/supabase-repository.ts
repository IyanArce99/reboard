import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { REGIONS, ZONES, type ListingStatus } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import type { Filters } from "@/lib/search/filters";
import { photoUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createUserClient } from "@/lib/supabase/server";
import type { Facets, ListingRepository, SearchOptions } from "./repository";
import {
  LISTING_SELECT,
  rowToCatalogModel,
  rowToListing,
  rowToShop,
  toDbStatuses,
  toRpcParams,
  type ListingWithRelations,
} from "./supabase-mapping";

// Lecturas públicas cacheadas. Etiquetas (las invalidan las Server Actions con updateTag):
//   listings · listing:{public_id} · catalog · shops
// Las claves de caché son los argumentos (filtros): nunca contienen datos personales.

const fail = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`Supabase (${what}): ${error.message}`);
};

const toListings = (rows: unknown, now: Date) =>
  ((rows as ListingWithRelations[] | null) ?? []).map((r) => rowToListing(r, now, photoUrl));

async function cachedNow() {
  "use cache";
  cacheLife("minutes");
  return new Date();
}

interface RpcSearch {
  f: Filters;
  sort: string;
  limit: number;
  offset: number;
  here: string | null;
  excludeZone: string | null;
  statuses: ListingStatus[] | null;
  unknownVolume: boolean;
}

async function searchCached(a: RpcSearch) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const sb = createPublicClient();
  const p = toRpcParams(a.f);
  const statuses = toDbStatuses(a.statuses ?? undefined);
  const [rows, count] = await Promise.all([
    sb
      .rpc("search_listings", {
        p,
        p_sort: a.sort,
        p_limit: a.limit,
        p_offset: a.offset,
        p_here: a.here ?? undefined,
        p_exclude_zone: a.excludeZone ?? undefined,
        p_statuses: statuses,
        p_unknown_volume: a.unknownVolume,
      })
      .select(LISTING_SELECT),
    sb.rpc("count_listings", {
      p,
      p_exclude_zone: a.excludeZone ?? undefined,
      p_statuses: statuses,
      p_unknown_volume: a.unknownVolume,
    }),
  ]);
  fail("search_listings", rows.error);
  fail("count_listings", count.error);
  return { items: toListings(rows.data, new Date()), total: Number(count.data ?? 0) };
}

async function countCached(f: Filters) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const { data, error } = await createPublicClient().rpc("count_listings", { p: toRpcParams(f) });
  fail("count_listings", error);
  return Number(data ?? 0);
}

async function facetsCached(f: Filters): Promise<Facets> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const { data, error } = await createPublicClient().rpc("listing_facets", { p: toRpcParams(f) });
  fail("listing_facets", error);
  const out: Facets = { anyZone: 0, zones: {}, shapes: {}, brands: {} };
  for (const r of data ?? []) {
    const n = Number(r.n);
    if (r.dimension === "any_zone") out.anyZone = n;
    else if (r.dimension === "zone") out.zones[r.key] = n;
    else if (r.dimension === "shape") out.shapes[r.key] = n;
    else if (r.dimension === "brand") out.brands[r.key] = n;
  }
  // Regiones: suma de sus zonas (mismo resultado que filtrar por la región).
  for (const region of REGIONS) out.zones[region.slug] = region.zones.reduce((s, z) => s + (out.zones[z] ?? 0), 0);
  // Sin zona = todo el territorio activo: no cuenta anuncios de zonas fuera del lanzamiento.
  out.anyZone = ZONES.reduce((s, z) => s + (out.zones[z.slug] ?? 0), 0);
  return out;
}

async function byIdsCached(ids: string[]) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings", ...ids.map((id) => `listing:${id}`));
  if (!ids.length) return [];
  const { data, error } = await createPublicClient().from("listings").select(LISTING_SELECT).in("public_id", ids);
  fail("listings by id", error);
  const found = toListings(data, new Date());
  return ids.map((id) => found.find((l) => l.id === id)).filter((l): l is Listing => !!l);
}

async function similarCached(publicId: string, limit: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const { data, error } = await createPublicClient()
    .rpc("similar_listings", { p_public_id: publicId, p_limit: limit })
    .select(LISTING_SELECT);
  fail("similar_listings", error);
  return toListings(data, new Date());
}

async function countBySellerCached(sellerId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const { count, error } = await createPublicClient()
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .eq("status", "published")
    .neq("moderation", "removed");
  fail("countBySeller", error);
  return count ?? 0;
}

async function shopListingsCached(shopSlug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings", "shops");
  const sb = createPublicClient();
  const { data: shop, error } = await sb.from("shops").select("profile_id").eq("slug", shopSlug).maybeSingle();
  fail("shop", error);
  if (!shop?.profile_id) return [];
  const res = await sb
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_id", shop.profile_id)
    .eq("status", "published")
    .neq("moderation", "removed")
    .order("published_at", { ascending: false });
  fail("shopListings", res.error);
  return toListings(res.data, new Date());
}

async function modelPricesCached() {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");
  const { data, error } = await createPublicClient()
    .from("listings")
    .select("price_eur, model:board_models!inner(slug)")
    .eq("status", "published")
    .neq("moderation", "removed");
  fail("modelPrices", error);
  const out: Record<string, number[]> = {};
  for (const r of (data as unknown as { price_eur: number; model: { slug: string } }[]) ?? [])
    (out[r.model.slug] ??= []).push(r.price_eur);
  return out;
}

async function listingParamsCached(limit: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");
  const { data, error } = await createPublicClient()
    .from("listings")
    .select("slug, public_id")
    .in("status", ["published", "sold", "expired"])
    .neq("moderation", "removed")
    .order("published_at", { ascending: false })
    .limit(limit);
  fail("listingParams", error);
  return (data ?? []).map((r) => ({ slug: r.slug, id: r.public_id ?? "" })).filter((r) => r.id);
}

// Catálogo público (publicar, /marcas, sitemap): solo modelos activos y verificados de marcas activas.
// Un modelo sin verificar no se presenta nunca como dato del fabricante.
async function catalogCached() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const { data, error } = await createPublicClient()
    .from("board_models")
    .select("*, brand:brands!board_models_brand_id_fkey!inner(name), sizes:board_model_sizes(*)")
    .eq("active", true)
    .eq("verification", "verified")
    .eq("brand.active", true)
    .order("name");
  fail("catalog", error);
  return (data ?? []).map((m) => rowToCatalogModel(m as Parameters<typeof rowToCatalogModel>[0]));
}

async function brandsCached() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  // Activas; destacadas primero en el orden del panel y luego por nombre (índice brands_publish).
  const { data, error } = await createPublicClient()
    .from("brands")
    .select("slug, name, featured")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("sort_order")
    .order("name");
  fail("brands", error);
  return (data ?? []).map((b) => ({ slug: b.slug, name: b.name, featured: b.featured }));
}

async function shopsCached() {
  "use cache";
  cacheLife("hours");
  cacheTag("shops");
  const { data, error } = await createPublicClient().from("shops").select("*").order("name");
  fail("shops", error);
  return (data ?? []).map(rowToShop);
}

/** Repositorio de datos reales (Supabase). isDemo = false. */
export const supabaseRepository: ListingRepository = {
  isDemo: false,
  capabilities: { distance: false },
  now: cachedNow,

  search: (f, opts: SearchOptions) =>
    searchCached({
      f,
      sort: opts.sort ?? "recientes",
      limit: opts.limit,
      offset: opts.offset ?? 0,
      here: opts.here ?? null,
      excludeZone: opts.excludeZone ?? null,
      statuses: opts.statuses ?? null,
      unknownVolume: false,
    }),

  unknownVolume: (f, limit) =>
    searchCached({ f, sort: "recientes", limit, offset: 0, here: null, excludeZone: null, statuses: null, unknownVolume: true }),

  count: countCached,
  facets: facetsCached,

  byId: async (id) => (await byIdsCached([id]))[0] ?? null,
  byIds: byIdsCached,
  similar: (l, limit) => similarCached(l.id, limit),
  countBySeller: async (l) => (l.seller.id ? countBySellerCached(l.seller.id) : 1),
  shopListings: shopListingsCached,
  modelPrices: modelPricesCached,

  // Panel: anuncios del usuario en cualquier estado, con su sesión (RLS: solo los suyos). Sin caché.
  sellerListings: async (sellerId) => {
    if (!sellerId) return [];
    const sb = await createUserClient();
    const { data, error } = await sb
      .from("listings")
      .select(LISTING_SELECT)
      .eq("seller_id", sellerId)
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    fail("sellerListings", error);
    return toListings(data, new Date());
  },

  listingParams: (limit = 200) => listingParamsCached(limit),
  catalog: catalogCached,
  brands: () => brandsCached(),
  shops: shopsCached,
};
