import type { Metadata } from "next";
import { SellerPanel } from "@/components/panel/SellerPanel";
import { getRepository } from "@/lib/data";
import { noindexRobots } from "@/lib/seo";

// Área privada: noindex (docs/SEO.md).
export const metadata: Metadata = {
  title: "Mi panel de vendedor",
  robots: noindexRobots(),
};

export default async function PanelPage() {
  const repo = getRepository();
  // DEMO: sin autenticación, el panel muestra los anuncios del vendedor de demostración.
  const own = await repo.sellerListings(null);
  return <SellerPanel listings={own} nowIso={repo.now().toISOString()} />;
}
