import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  landingIntro,
  landingPath,
  landingTitle,
  type LandingForm,
} from "@/lib/search/landings";
import { countMatches } from "@/lib/search/match";
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
  const n = countMatches(await getRepository().active(), landingFilters(place, form));
  const intro = landingIntro(place, form);
  return {
    title,
    description: `${n} anuncios. ${intro || "Busca por litros, medidas, tipo y ubicación."} Sin comisiones.`.trim(),
    alternates: { canonical: path, languages: { "es-ES": path } },
    openGraph: { title, url: path },
    // Umbral de indexación pendiente (docs/SEO.md): de momento, sin anuncios no se indexa.
    ...(n === 0 ? { robots: noindexRobots() } : {}),
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
    />
  );
}
