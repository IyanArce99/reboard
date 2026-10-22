import type { MetadataRoute } from "next";
import { getRepository, siteIndexable } from "@/lib/data";
import { GUIDES } from "@/lib/content/guides";
import { slugify } from "@/lib/domain/taxonomy";
import { listingPath } from "@/lib/listing/present";
import { landingIndexable } from "@/lib/search/indexing";
import { LANDING_FORMS, LANDING_PLACES, landingFilters, landingPath } from "@/lib/search/landings";
import { emptyFilters } from "@/lib/search/filters";
import { absoluteUrl } from "@/lib/site";

// Solo páginas indexables con contenido. Las landings siguen src/lib/search/indexing.ts y los
// anuncios solo entran si están disponibles (vendidos, caducados o retirados son noindex).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getRepository();
  if (!siteIndexable()) return [];
  const combos = [
    ...LANDING_FORMS.map((f) => [null, f] as const),
    ...LANDING_PLACES.map((p) => [p, null] as const),
    ...LANDING_PLACES.flatMap((p) => LANDING_FORMS.map((f) => [p, f] as const)),
  ];
  const [catalog, shops, active, comboCounts] = await Promise.all([
    repo.catalog(),
    repo.shops(),
    repo.search(emptyFilters(), { sort: "recientes", limit: 50_000 }),
    Promise.all(combos.map(([p, f]) => repo.count(landingFilters(p, f)))),
  ]);
  const brands = [...new Set(catalog.map((m) => slugify(m.brand)))];
  return [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/calculadora-litros") },
    { url: absoluteUrl("/vender") },
    { url: absoluteUrl("/tiendas") },
    { url: absoluteUrl("/guias") },
    ...combos
      .filter(([p, f], i) => landingIndexable(p, f, comboCounts[i]))
      .map(([p, f]) => ({ url: absoluteUrl(landingPath(p, f)) })),
    ...brands.map((b) => ({ url: absoluteUrl(`/marcas/${b}`) })),
    ...catalog.map((m) => ({ url: absoluteUrl(`/marcas/${slugify(m.brand)}/${m.slug}`) })),
    ...shops.map((s) => ({ url: absoluteUrl(`/tiendas/${s.slug}`) })),
    // Las guías de demostración llevan noindex hasta que las revise alguien con experiencia.
    ...GUIDES.filter((g) => !g.isDemo).map((g) => ({ url: absoluteUrl(`/guias/${g.slug}`), lastModified: g.updatedAt })),
    ...active.items.map((l) => ({ url: absoluteUrl(listingPath(l)), lastModified: l.confirmedAt })),
  ];
}
