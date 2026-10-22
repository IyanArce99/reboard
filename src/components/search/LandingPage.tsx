import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RelatedLandings } from "./RelatedLandings";
import { SearchResults } from "./SearchResults";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { placeName, zoneBySlug } from "@/lib/domain/taxonomy";
import { resultsTitle } from "@/lib/search/describe";
import { defaultView } from "@/lib/search/filters";
import {
  formLabel,
  isLandingForm,
  isLandingPlace,
  landingFilters,
  landingDescription,
  landingIntro,
  landingPath,
  landingTitle,
  type LandingForm,
} from "@/lib/search/landings";
import { landingIndexable } from "@/lib/search/indexing";
import { noindexRobots } from "@/lib/seo";

/** Interpreta los segmentos de /tablas/[segmento]/[forma]. */
export function resolveLanding(segment: string, form?: string): { place: string | null; form: LandingForm | null } {
  if (form !== undefined) {
    if (!isLandingPlace(segment) || !isLandingForm(form)) notFound();
    return { place: segment, form };
  }
  if (isLandingForm(segment)) return { place: null, form: segment };
  if (isLandingPlace(segment)) return { place: segment, form: null };
  notFound();
}

async function titleFor(place: string | null, form: LandingForm | null) {
  const names = await getCatalogNames(getRepository());
  return landingTitle(place, form, resultsTitle(landingFilters(place, form), names));
}

export async function landingMetadata(place: string | null, form: LandingForm | null): Promise<Metadata> {
  const title = await titleFor(place, form);
  const path = landingPath(place, form);
  const n = await getRepository().count(landingFilters(place, form));
  const description = landingDescription(place, form, n);
  return {
    title,
    description,
    alternates: { canonical: path, languages: { "es-ES": path } },
    openGraph: { title, description, url: path },
    // Política de indexación: src/lib/search/indexing.ts (el sitemap aplica la misma).
    ...(landingIndexable(place, form, n) ? {} : { robots: noindexRobots() }),
  };
}

export async function LandingPage({ place, form }: { place: string | null; form: LandingForm | null }) {
  const title = await titleFor(place, form);
  const crumbs = [
    { label: "Inicio", href: "/" },
    { label: "Tablas", href: "/buscar" },
    ...(place && form ? [{ label: placeName(place)!, href: landingPath(place, null) }] : []),
  ];
  const current = { label: form ? formLabel(form) : placeName(place!)!, href: landingPath(place, form) };
  return (
    <SearchResults
      filters={landingFilters(place, form)}
      view={defaultView()}
      // Página estática: la distancia se muestra respecto a la zona de la propia landing.
      here={place && zoneBySlug(place) ? place : ""}
      title={title}
      intro={landingIntro(place, form)}
      crumbs={crumbs}
      current={current}
      isSearchPage={false}
      related={<RelatedLandings place={place} form={form} />}
    />
  );
}
