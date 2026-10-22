import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brandPath, modelMeta, modelPath, modelRange, usedCount } from "@/components/catalog/catalog";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlertButton } from "@/components/user/islands";
import { brandContent } from "@/lib/content/brands";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { slugify } from "@/lib/domain/taxonomy";
import { listingPath, listingTitle } from "@/lib/listing/present";
import { alertText } from "@/lib/search/describe";
import { searchHref, toQuery, withFilters } from "@/lib/search/filters";
import { absoluteUrl } from "@/lib/site";
import ui from "@/styles/ui.module.css";
import styles from "@/components/catalog/Catalog.module.css";

/** Tarjetas de tablas usadas que se muestran antes de enlazar a la búsqueda completa. */
const MAX_CARDS = 8;

export async function generateStaticParams() {
  const names = await getCatalogNames(getRepository());
  return names.brands.map((b) => ({ marca: b.slug }));
}

async function brand(slug: string) {
  const names = await getCatalogNames(getRepository());
  const b = names.brands.find((x) => x.slug === slug);
  if (!b) notFound();
  return b;
}

export async function generateMetadata({ params }: PageProps<"/marcas/[marca]">): Promise<Metadata> {
  const b = await brand((await params).marca);
  const title = `Tablas ${b.name} de segunda mano`;
  const description = `Tablas de surf ${b.name} usadas en venta y los modelos de su catálogo con sus medidas y litros. Contacto directo con el vendedor, sin comisiones.`;
  const path = brandPath(b.slug);
  return {
    title,
    description,
    alternates: { canonical: path, languages: { "es-ES": path } },
    openGraph: { title, description, url: path },
  };
}

export default async function BrandPage({ params }: PageProps<"/marcas/[marca]">) {
  const b = await brand((await params).marca);
  const repo = getRepository();
  const f = withFilters({ brand: b.slug });
  const [usedPage, catalog, names] = await Promise.all([
    repo.search(f, { sort: "recientes", limit: MAX_CARDS }),
    repo.catalog(),
    getCatalogNames(repo),
  ]);
  const now = repo.now();

  const used = usedPage.items;
  const models = catalog.filter((m) => slugify(m.brand) === b.slug);
  const modelCounts = await Promise.all(models.map((m) => repo.count(withFilters({ brand: b.slug, model: m.slug }))));
  const content = brandContent(b.name);

  return (
    <main className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} current={{ label: b.name, href: brandPath(b.slug) }} />
      <div className={styles.head}>
        <div className={styles.headText}>
          {/* Los logotipos de las marcas no están autorizados: marcador neutro con el nombre. */}
          <div className={styles.logo} aria-hidden="true">
            <span className={styles.logoName}>{b.name}</span>
            <span className={styles.logoNote}>espacio para el logotipo autorizado</span>
          </div>
          <h1 className={ui.h1}>Tablas {b.name} de segunda mano</h1>
          {content && (
            <p className={styles.intro}>
              {content.intro}
              {content.isDemo && <span className={`${ui.demoTag} ${styles.introTag}`}>texto demo</span>}
            </p>
          )}
        </div>
        <AlertButton text={alertText(f, names)} query={toQuery(f)} className={`${ui.btnStrong} ${styles.alertBtn}`}>
          Avísame de nuevas {b.name}
        </AlertButton>
      </div>

      <section className={styles.section} aria-labelledby="usadas-title">
        <h2 id="usadas-title" className={styles.h2}>
          {b.name} de segunda mano · {usedPage.total}
        </h2>
        {used.length > 0 ? (
          <>
            <div className={styles.grid}>
              {used.map((l) => (
                <ListingCard key={l.id} listing={l} now={now} hereZone="" layout="responsive" />
              ))}
            </div>
            {usedPage.total > MAX_CARDS && (
              <Link href={searchHref(f)} className={styles.more}>
                Ver las {usedPage.total} {b.name} usadas →
              </Link>
            )}
          </>
        ) : (
          <div className={styles.empty}>Ahora no hay ninguna {b.name} usada publicada. Crea una alerta y te avisamos.</div>
        )}
      </section>

      {models.length > 0 && (
        <section className={styles.section} aria-labelledby="modelos-title">
          <h2 id="modelos-title" className={styles.h2}>
            Modelos del catálogo
          </h2>
          <div className={styles.models}>
            {models.map((m, i) => {
              const n = modelCounts[i];
              return (
                <Link key={m.slug} href={modelPath(m)} className={styles.modelCard}>
                  <span className={styles.modelName}>{m.model}</span>
                  <span className={styles.modelMeta}>{modelMeta(m)}</span>
                  <span className={styles.modelRange}>{modelRange(m)}</span>
                  <span className={styles.modelCount} data-none={n === 0 || undefined}>
                    {usedCount(n)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {used.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Tablas ${b.name} de segunda mano`,
            itemListElement: used.map((l, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(listingPath(l)),
              name: listingTitle(l),
            })),
          }}
        />
      )}
    </main>
  );
}
