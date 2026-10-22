import type { Metadata } from "next";
import { Suspense } from "react";
import { PublishFlow } from "@/components/publish/PublishFlow";
import { getRepository } from "@/lib/data";
import { draftFromListing } from "@/lib/publish/draft";
import styles from "@/components/publish/Publish.module.css";
import { noindexRobots } from "@/lib/seo";

// Formulario privado: noindex (docs/SEO.md).
export const metadata: Metadata = {
  title: "Publicar tabla",
  description: "Publica tu tabla de surf usada en 5 pasos, gratis y sin comisión.",
  robots: noindexRobots(),
};

async function Flow({ searchParams }: { searchParams: PageProps<"/vender/publicar">["searchParams"] }) {
  const raw = await searchParams;
  const editId = typeof raw.editar === "string" ? raw.editar : null;
  const repo = getRepository();
  // Referencia de precio: solo anuncios existentes del mismo modelo de catálogo.
  const [catalog, priceRefs, editing] = await Promise.all([
    repo.catalog(),
    repo.modelPrices(),
    editId ? repo.byId(editId) : Promise.resolve(null),
  ]);

  return (
    <PublishFlow
      catalog={catalog}
      priceRefs={priceRefs}
      nowIso={(await repo.now()).toISOString()}
      dataIsDemo={repo.isDemo}
      initial={editing ? draftFromListing(editing) : null}
      editingId={editing?.id ?? null}
    />
  );
}

export default function PublicarPage(props: PageProps<"/vender/publicar">) {
  return (
    <Suspense fallback={<main className={styles.page} aria-busy="true" />}>
      <Flow searchParams={props.searchParams} />
    </Suspense>
  );
}
