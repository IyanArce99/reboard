// Traducción entre la base de datos y el dominio de la UI. Módulo puro (sin red), con tests.
// Esquema: supabase/migrations · Mapeo documentado en docs/DATABASE.md.

import { regionBySlug } from "@/lib/domain/taxonomy";
import type { CatalogModel, DataSource, Listing, Measured, Shop } from "@/lib/domain/types";
import { finLabel, type Filters } from "@/lib/search/filters";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];
export type ListingRow = Tables["listings"]["Row"];

/** Columnas embebidas que se piden junto a cada anuncio (PostgREST). */
// Cada relación se nombra por su clave foránea: entre listings y profiles hay varios caminos
// (favoritos, reportes, contactos) y PostgREST necesita saber cuál usar.
export const LISTING_SELECT =
  "*, brand:brands!listings_brand_id_fkey(slug,name), model:board_models!listings_model_id_fkey(slug,name), photos:listing_photos(storage_path,position,label), seller:profiles!listings_seller_id_fkey(id,display_name,seller_type,shop:shops!shops_profile_id_fkey(slug))";

export interface ListingWithRelations extends ListingRow {
  brand: { slug: string; name: string } | null;
  model: { slug: string; name: string } | null;
  photos: { storage_path: string; position: number; label: string | null }[] | null;
  seller: {
    id: string;
    display_name: string;
    seller_type: Enums["seller_type"];
    shop: { slug: string } | { slug: string }[] | null;
  } | null;
}

/** «Pendiente de confirmar»: publicada y sin confirmar en más de 14 días (no se guarda). */
export const PENDING_AFTER_DAYS = 14;

/** Filtros de la URL → parámetro `p` de listing_matches (supabase/migrations/…_functions.sql). */
export function toRpcParams(f: Filters) {
  const zones = f.zone ? (regionBySlug(f.zone)?.zones ?? [f.zone]) : [];
  return {
    zones,
    vol_min: f.volMin,
    vol_max: f.volMax,
    len_min: f.lenMin,
    len_max: f.lenMax,
    shapes: f.shapes,
    constructions: f.constructions,
    price_min: f.priceMin,
    price_max: f.priceMax,
    brand: f.brand,
    model: f.model,
    conditions: f.conditions,
    sellers: f.sellers,
    no_repairs: f.noRepairs,
    accessories: f.accessories,
    fins: f.fins ? finLabel(f.fins) : "",
    width_min: f.widthMin,
    thick_min: f.thickMin,
    fit_lo: f.fit?.lo ?? null,
    fit_hi: f.fit?.hi ?? null,
  };
}

/** Estados de la UI → estados de la base de datos. */
export function toDbStatuses(statuses?: Listing["status"][]): Enums["listing_status"][] {
  if (!statuses) return ["published"];
  const map: Record<Listing["status"], Enums["listing_status"]> = {
    disponible: "published",
    pendiente: "published",
    vendida: "sold",
    caducada: "expired",
    retirada: "withdrawn",
  };
  return [...new Set(statuses.map((s) => map[s]))];
}

const measured = <T,>(value: T | null, source: DataSource): Measured<T> =>
  value == null ? { value: null, source: null } : { value, source: source ?? "seller" };

const DAY = 86_400_000;

export function toUiStatus(row: Pick<ListingRow, "status" | "confirmed_at">, now: Date): Listing["status"] {
  switch (row.status) {
    case "published": {
      const confirmed = row.confirmed_at ? new Date(row.confirmed_at).getTime() : 0;
      return now.getTime() - confirmed > PENDING_AFTER_DAYS * DAY ? "pendiente" : "disponible";
    }
    case "sold":
      return "vendida";
    case "expired":
      return "caducada";
    default:
      return "retirada"; // withdrawn (los borradores nunca llegan a la UI pública)
  }
}

/** Fila de anuncio (con relaciones) → Listing de la UI. */
export function rowToListing(row: ListingWithRelations, now: Date, photoUrl: (path: string) => string): Listing {
  const shop = Array.isArray(row.seller?.shop) ? row.seller?.shop[0] : row.seller?.shop;
  const photos = [...(row.photos ?? [])].sort((a, b) => a.position - b.position);
  return {
    id: row.public_id ?? `a${row.id}`,
    slug: row.slug,
    brand: row.brand?.name ?? row.brand_text ?? null,
    model: row.model?.name ?? row.model_text ?? null,
    modelSlug: row.model?.slug ?? null,
    sizeLabel: row.size_label,
    length: measured(Number(row.length_in), row.length_source),
    width: measured(row.width_in == null ? null : Number(row.width_in), row.width_source),
    thickness: measured(row.thickness_in == null ? null : Number(row.thickness_in), row.thickness_source),
    volume: measured(row.volume_l == null ? null : Number(row.volume_l), row.volume_source),
    shape: row.shape,
    shapeSource: row.shape_source,
    construction: row.construction,
    constructionSource: row.construction_source,
    fins: measured(row.fins || null, "seller"),
    accessories: measured(row.accessories || null, "seller"),
    zone: row.zone_slug,
    town: row.town,
    distanceKm: null, // sin coordenadas (decisión aprobada)
    price: row.price_eur,
    previousPrice: row.previous_price_eur,
    condition: row.condition,
    repairs: row.repairs || null,
    seller: {
      id: row.seller?.id ?? row.seller_id,
      type: row.seller?.seller_type ?? "particular",
      name: row.seller?.display_name ?? "Surfista",
      shopSlug: shop?.slug ?? null,
    },
    // El teléfono NUNCA viaja en el listado: se revela con reveal_contact (docs/SECURITY.md §5).
    contact: { method: row.contact_method, phone: null },
    status: toUiStatus(row, now),
    publishedAt: row.published_at ?? row.created_at,
    confirmedAt: row.confirmed_at ?? row.published_at ?? row.created_at,
    photos: photos.map((p) => ({ url: photoUrl(p.storage_path), label: p.label ?? "foto" })),
    description: row.description ?? "",
    isDemo: false,
  };
}

type ModelRow = Tables["board_models"]["Row"] & {
  brand: { name: string } | null;
  sizes: Tables["board_model_sizes"]["Row"][] | null;
};

export function rowToCatalogModel(m: ModelRow): CatalogModel {
  const sizes = [...(m.sizes ?? [])].sort((a, b) => a.sort_order - b.sort_order || Number(a.length_in) - Number(b.length_in));
  return {
    brand: m.brand?.name ?? "",
    model: m.name,
    slug: m.slug,
    shape: m.shape,
    construction: m.construction,
    description: m.description,
    sizes: sizes.map((s) => ({
      label: s.label,
      lengthIn: Number(s.length_in),
      widthIn: Number(s.width_in),
      thickIn: Number(s.thickness_in),
      volume: s.volume_l == null ? null : Number(s.volume_l),
    })),
  };
}

type ShopRow = Tables["shops"]["Row"];

/** Foto de stock genérica para tiendas sin foto propia (public/images/IMAGE_SOURCES.md). */
const DEFAULT_SHOP_PHOTO = "1761435139247-e044088c2c3e";

export function rowToShop(s: ShopRow): Shop {
  return {
    name: s.name,
    slug: s.slug,
    type: s.type === "escuela" ? "escuela" : "tienda",
    zone: s.zone_slug,
    town: s.town,
    address: s.address ?? "",
    hours: s.hours ?? "",
    image: DEFAULT_SHOP_PHOTO, // sin foto propia todavía: foto de stock (la UI la etiqueta como tal)
    inventorySource: s.inventory_source ?? "",
  };
}
