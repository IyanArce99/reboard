import type { MetadataRoute } from "next";
import { getRepository } from "@/lib/data";
import { GUIDES } from "@/lib/content/guides";
import { slugify } from "@/lib/domain/taxonomy";
import { listingPath } from "@/lib/listing/present";
import { LANDING_FORMS, LANDING_PLACES, landingFilters, landingPath } from "@/lib/search/landings";
import { countMatches } from "@/lib/search/match";
import { absoluteUrl } from "@/lib/site";

// Solo páginas indexables con contenido. Umbral de inventario pendiente (docs/SEO.md).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getRepository();
  if (repo.isDemo) return [];
  const [active, catalog, shops] = await Promise.all([repo.active(), repo.catalog(), repo.shops()]);
  const combos = [
    ...LANDING_FORMS.map((f) => [null, f] as const),
    ...LANDING_PLACES.map((p) => [p, null] as const),
    ...LANDING_PLACES.flatMap((p) => LANDING_FORMS.map((f) => [p, f] as const)),
  ];
  const brands = [...new Set(catalog.map((m) => slugify(m.brand)))];
  return [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/calculadora-litros") },
    { url: absoluteUrl("/vender") },
    { url: absoluteUrl("/tiendas") },
    { url: absoluteUrl("/guias") },
    ...combos
      .filter(([p, f]) => countMatches(active, landingFilters(p, f)) > 0)
      .map(([p, f]) => ({ url: absoluteUrl(landingPath(p, f)) })),
    ...brands.map((b) => ({ url: absoluteUrl(`/marcas/${b}`) })),
    ...catalog.map((m) => ({ url: absoluteUrl(`/marcas/${slugify(m.brand)}/${m.slug}`) })),
    ...shops.map((s) => ({ url: absoluteUrl(`/tiendas/${s.slug}`) })),
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/guias/${g.slug}`), lastModified: g.updatedAt })),
    ...active.map((l) => ({ url: absoluteUrl(listingPath(l)), lastModified: l.confirmedAt })),
  ];
}
