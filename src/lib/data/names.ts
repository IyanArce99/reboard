import "server-only";
import { NO_BRAND, slugify } from "@/lib/domain/taxonomy";
import type { CatalogNames } from "@/lib/search/describe";
import type { ListingRepository } from "./repository";

/** Nombres de marcas y modelos del catálogo, para títulos y chips. */
export async function getCatalogNames(repo: ListingRepository): Promise<CatalogNames> {
  const [catalog, known] = await Promise.all([repo.catalog(), repo.brands()]);
  // Marcas conocidas + las del catálogo (por si alguna no estuviera en la lista).
  const bySlug = new Map(known.map((b) => [b.slug, b]));
  for (const name of new Set(catalog.map((m) => m.brand))) if (!bySlug.has(slugify(name))) bySlug.set(slugify(name), { slug: slugify(name), name });
  const brands = [...bySlug.values()];
  return {
    brands,
    models: catalog.map((m) => ({ slug: m.slug, name: m.model, brandSlug: slugify(m.brand) })),
  };
}

export const brandOptions = (names: CatalogNames) => [...names.brands, { slug: NO_BRAND.slug, name: NO_BRAND.label }];
