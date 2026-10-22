import "server-only";
import { NO_BRAND, slugify } from "@/lib/domain/taxonomy";
import type { CatalogNames } from "@/lib/search/describe";
import type { ListingRepository } from "./repository";

/** Nombres de marcas y modelos del catálogo, para títulos y chips. */
export async function getCatalogNames(repo: ListingRepository): Promise<CatalogNames> {
  const catalog = await repo.catalog();
  const brands = [...new Set(catalog.map((m) => m.brand))].map((name) => ({ slug: slugify(name), name }));
  return {
    brands,
    models: catalog.map((m) => ({ slug: m.slug, name: m.model, brandSlug: slugify(m.brand) })),
  };
}

export const brandOptions = (names: CatalogNames) => [...names.brands, { slug: NO_BRAND.slug, name: NO_BRAND.label }];
