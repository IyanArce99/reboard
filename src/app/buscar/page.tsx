import type { Metadata } from "next";
import { Suspense } from "react";
import { getHere } from "@/components/home/NearSection";
import { SearchResults } from "@/components/search/SearchResults";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { placeName } from "@/lib/domain/taxonomy";
import { resultsShortTitle, resultsTitle } from "@/lib/search/describe";
import { parseFilters, parseView, searchHref } from "@/lib/search/filters";
import { landingPath, landingPathFor } from "@/lib/search/landings";
import styles from "@/components/search/Search.module.css";
import { noindexRobots } from "@/lib/seo";

// /buscar no es una landing: noindex, follow. Su canonical apunta a la landing equivalente si la hay (docs/SEO.md).
export async function generateMetadata({ searchParams }: PageProps<"/buscar">): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const names = await getCatalogNames(getRepository());
  return {
    title: resultsTitle(f, names),
    description: "Busca tablas de surf de segunda mano por litros, medidas, tipo, precio e isla, en toda Canarias, y guarda la búsqueda si aún no hay ninguna.",
    robots: noindexRobots(),
    alternates: { canonical: landingPathFor(f) ?? "/buscar" },
  };
}

async function Results({ searchParams }: { searchParams: PageProps<"/buscar">["searchParams"] }) {
  const raw = await searchParams;
  const f = parseFilters(raw);
  const view = parseView(raw);
  const here = await getHere();
  const names = await getCatalogNames(getRepository());
  const shape = f.shapes.length === 1 ? f.shapes[0] : null;
  const crumbs = [
    { label: "Inicio", href: "/" },
    { label: "Tablas", href: "/buscar" },
    ...(shape && f.zone ? [{ label: placeName(f.zone) ?? f.zone, href: landingPath(f.zone, null) }] : []),
  ];
  return (
    <SearchResults
      filters={f}
      view={view}
      here={here}
      title={resultsTitle(f, names)}
      intro=""
      crumbs={crumbs}
      current={{ label: resultsShortTitle(f), href: searchHref(f) }}
      isSearchPage
      openAdvanced={raw.avanzados === "1"}
    />
  );
}

export default function BuscarPage(props: PageProps<"/buscar">) {
  return (
    <Suspense fallback={<main className={`container ${styles.page}`} aria-busy="true" style={{ minHeight: "100svh" }} />}>
      <Results searchParams={props.searchParams} />
    </Suspense>
  );
}
