import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PublishFlow } from "@/components/publish/PublishFlow";
import { authEnabled } from "@/lib/auth/config";
import { getRepository } from "@/lib/data";
import { draftFromListing, type PublishDraft } from "@/lib/publish/draft";
import { loadOwnDraft } from "@/lib/publish/edit-load";
import { noindexRobots } from "@/lib/seo";
import ui from "@/styles/ui.module.css";
import styles from "@/components/publish/Publish.module.css";
import { PageFlag } from "@/components/layout/PageFlag";

// Formulario privado: noindex (docs/SEO.md).
export const metadata: Metadata = {
  title: "Publicar tabla",
  description: "Publica tu tabla de surf usada en 5 pasos, gratis y sin comisión.",
  robots: noindexRobots(),
};

async function Flow({ searchParams }: { searchParams: PageProps<"/vender/publicar">["searchParams"] }) {
  const raw = await searchParams;
  const editId = typeof raw.editar === "string" ? raw.editar : null;
  const live = authEnabled();
  const repo = getRepository();
  // Referencia de precio: solo anuncios existentes del mismo modelo de catálogo.
  const [catalog, brandList, priceRefs, now] = await Promise.all([repo.catalog(), repo.brands(), repo.modelPrices(), repo.now()]);

  let initial: PublishDraft | null = null;
  let editingId: string | null = null;
  if (editId && live) {
    // Editar exige ser el dueño: se lee con la sesión del usuario (RLS).
    const own = await loadOwnDraft(editId);
    if (own === null) redirect(`/entrar?siguiente=${encodeURIComponent(`/vender/publicar?editar=${editId}`)}`);
    if (own === "ajeno") {
      return (
        <main className={styles.page}>
          <h1 className={ui.h1}>No puedes editar este anuncio</h1>
          <p className={styles.lead}>Puede que ya no exista o que sea de otra cuenta.</p>
          <Link href="/panel" className={ui.btnPrimary}>
            Ver mis anuncios
          </Link>
        </main>
      );
    }
    initial = own.draft;
    editingId = own.id;
  } else if (editId) {
    // DEMO: se edita el anuncio simulado y los cambios no se guardan.
    const l = await repo.byId(editId);
    if (l) {
      initial = draftFromListing(l);
      editingId = l.id;
    }
  }

  return (
    <>
      {/* Modo enfocado: sin pie ni «Vender» en la cabecera mientras se publica (ver globals.css). */}
      <PageFlag flag="focus" />
      <PublishFlow
        catalog={catalog}
        brands={brandList.map((b) => b.name)}
        featuredBrands={brandList.filter((b) => b.featured).map((b) => b.name)}
        priceRefs={priceRefs}
        nowIso={now.toISOString()}
        dataIsDemo={repo.isDemo}
        initial={initial}
        editingId={editingId}
        live={live}
      />
    </>
  );
}

export default function PublicarPage(props: PageProps<"/vender/publicar">) {
  return (
    <Suspense fallback={<main className={styles.page} aria-busy="true" style={{ minHeight: "100svh" }} />}>
      <Flow searchParams={props.searchParams} />
    </Suspense>
  );
}
