import { LANDING_FORMS, LANDING_PLACES } from "@/lib/search/landings";
import { LandingPage, landingMetadata, resolveLanding } from "@/components/search/LandingPage";

// /tablas/[zona]/[forma], p. ej. /tablas/gran-canaria/evolutiva
export function generateStaticParams() {
  return LANDING_PLACES.flatMap((segmento) => LANDING_FORMS.map((forma) => ({ segmento, forma })));
}

export async function generateMetadata({ params }: PageProps<"/tablas/[segmento]/[forma]">) {
  const { segmento, forma } = await params;
  const { place, form } = resolveLanding(segmento, forma);
  return landingMetadata(place, form);
}

export default async function Page({ params }: PageProps<"/tablas/[segmento]/[forma]">) {
  const { segmento, forma } = await params;
  const { place, form } = resolveLanding(segmento, forma);
  return <LandingPage place={place} form={form} />;
}
