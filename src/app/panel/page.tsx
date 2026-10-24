import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SellerPanel } from "@/components/panel/SellerPanel";
import { authEnabled } from "@/lib/auth/config";
import { getRepository } from "@/lib/data";
import { noindexRobots } from "@/lib/seo";
import { createUserClient } from "@/lib/supabase/server";

// Área privada: noindex (docs/SEO.md).
export const metadata: Metadata = {
  title: "Mis anuncios",
  robots: noindexRobots(),
};

async function Panel() {
  const repo = getRepository();
  const now = (await repo.now()).toISOString();
  if (!authEnabled()) {
    // DEMO: sin cuentas, el panel muestra los anuncios del vendedor de demostración.
    return <SellerPanel listings={await repo.sellerListings(null)} nowIso={now} />;
  }
  // proxy.ts ya pide entrar sin sesión; aquí se comprueba de nuevo.
  const sb = await createUserClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/entrar?siguiente=/panel");
  const [own, { data: profile }, { data: events }] = await Promise.all([
    repo.sellerListings(data.user.id),
    sb.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle(),
    // Clics reales en «Mostrar contacto» (RLS: solo los de sus anuncios). Sin visitas ni guardados inventados.
    sb.from("contact_events").select("listing_id").limit(10_000),
  ]);
  const contacts: Record<string, number> = {};
  for (const e of events ?? []) contacts[`a${e.listing_id}`] = (contacts[`a${e.listing_id}`] ?? 0) + 1;
  return <SellerPanel live listings={own} nowIso={now} sellerName={profile?.display_name ?? "Surfista"} contacts={contacts} />;
}

export default function PanelPage() {
  return (
    <Suspense fallback={<main className="container" aria-busy="true" style={{ minHeight: "100svh" }} />}>
      <Panel />
    </Suspense>
  );
}
