import type { Metadata } from "next";
import { SellerPanel } from "@/components/panel/SellerPanel";
import { getRepository } from "@/lib/data";
import type { Listing } from "@/lib/domain/types";
import { noindexRobots } from "@/lib/seo";

// Área privada: noindex (docs/SEO.md).
export const metadata: Metadata = {
  title: "Mi panel de vendedor",
  robots: noindexRobots(),
};

/** Anuncios del vendedor DEMO del prototipo (state.own). */
const PROTOTYPE_OWN = ["a1040", "a1054", "a1096"];

/**
 * Elige de forma determinista 3 anuncios del inventario demo como «míos»: los del prototipo
 * que existan y, si no hay ninguno pendiente o vendido, añade el primero de cada estado.
 */
function pickOwn(all: Listing[]): Listing[] {
  const own = PROTOTYPE_OWN.map((id) => all.find((l) => l.id === id)).filter((l): l is Listing => !!l);
  const ensure = (status: Listing["status"]) => {
    if (own.some((l) => l.status === status)) return;
    const extra = all.find((l) => l.status === status && !own.includes(l));
    if (!extra) return;
    // Sustituye el último anuncio disponible (nunca el primero) para seguir con 3.
    const i = own.length >= 3 ? own.findLastIndex((l, k) => k > 0 && l.status === "disponible") : -1;
    if (i > 0) own[i] = extra;
    else own.push(extra);
  };
  ensure("vendida");
  ensure("pendiente");
  for (const l of all) {
    if (own.length >= 3) break;
    if (!own.includes(l)) own.push(l);
  }
  return own;
}

export default async function PanelPage() {
  const repo = getRepository();
  const own = pickOwn(await repo.all());
  return <SellerPanel listings={own} nowIso={repo.now().toISOString()} />;
}
