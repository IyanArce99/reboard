import { LANDING_FORMS, LANDING_PLACES } from "@/lib/search/landings";
import { LandingPage, landingMetadata, resolveLanding } from "@/components/search/LandingPage";

// /tablas/[forma] y /tablas/[zona]
export function generateStaticParams() {
  return [...LANDING_FORMS, ...LANDING_PLACES].map((segmento) => ({ segmento }));
}

export async function generateMetadata({ params }: PageProps<"/tablas/[segmento]">) {
  const { place, form } = resolveLanding((await params).segmento);
  return landingMetadata(place, form);
}

export default async function Page({ params }: PageProps<"/tablas/[segmento]">) {
  const { place, form } = resolveLanding((await params).segmento);
  return <LandingPage place={place} form={form} />;
}
