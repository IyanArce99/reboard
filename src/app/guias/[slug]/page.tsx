import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "@/components/brand/Photo";
import { PendingPage, pendingMetadata } from "@/components/layout/PendingPage";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { GUIDES, PENDING_GUIDES, guideBySlug, guideDate, type Guide } from "@/lib/content/guides";
import { getRepository } from "@/lib/data";
import { PHOTOS } from "@/lib/photos";
import { emptyFilters } from "@/lib/search/filters";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import styles from "@/components/guides/Guides.module.css";

export function generateStaticParams() {
  return [...GUIDES, ...PENDING_GUIDES].map((g) => ({ slug: g.slug }));
}

/** Guía con contenido, o el título de una pendiente (página provisional noindex). */
function guide(slug: string): { guide: Guide } | { pending: string } {
  const g = guideBySlug(slug);
  if (g) return { guide: g };
  const p = PENDING_GUIDES.find((x) => x.slug === slug);
  if (!p) notFound();
  return { pending: p.title };
}

const guidePath = (g: Guide) => `/guias/${g.slug}`;

export async function generateMetadata({ params }: PageProps<"/guias/[slug]">): Promise<Metadata> {
  const r = guide((await params).slug);
  if ("pending" in r) return pendingMetadata(r.pending);
  const g = r.guide;
  const path = guidePath(g);
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: path, languages: { "es-ES": path } },
    openGraph: {
      type: "article",
      title: g.title,
      description: g.description,
      url: path,
      images: [
        {
          url: PHOTOS[g.photo].src,
          width: PHOTOS[g.photo].width,
          height: PHOTOS[g.photo].height,
        },
      ],
      modifiedTime: g.updatedAt,
    },
  };
}

export default async function GuidePage({ params }: PageProps<"/guias/[slug]">) {
  const r = guide((await params).slug);
  if ("pending" in r) {
    return (
      <PendingPage
        title={r.pending}
        text="Estamos escribiendo esta guía. Mientras tanto, el asistente de litros te da un rango orientativo y te enseña las tablas que encajan."
      />
    );
  }
  const g = r.guide;
  const photo = PHOTOS[g.photo];
  const repo = getRepository();
  const recent = (await repo.search(emptyFilters(), { sort: "recientes", limit: 4 })).items;
  const now = await repo.now();

  return (
    <main className={styles.article}>
      <div className="container">
        <header className={styles.head}>
          <Breadcrumbs items={[{ label: "Guías", href: "/guias" }]} current={{ label: g.section, href: guidePath(g) }} />
          <p className={styles.eyebrow}>Guía · {g.section}</p>
          <h1 className={styles.title}>{g.h1}</h1>
          <p className={styles.meta}>
            Actualizada el <time dateTime={g.updatedAt}>{guideDate(g.updatedAt)}</time> · {g.byline}
          </p>
        </header>

        <figure className={styles.figureWrap}>
          <div className={styles.figure}>
            <Photo slug={g.photo} sizes="(max-width: 1280px) 100vw, 1280px" preload />
          </div>
          <figcaption className={styles.caption}>
            Foto: {photo.credit.author} / Pexels. Imagen ilustrativa, no corresponde a ningún anuncio.
          </figcaption>
        </figure>

        <div className={styles.body}>
          <div className={styles.answer}>
            <strong>Respuesta corta:</strong> {g.shortAnswer}
          </div>

          <h2 className={styles.h2}>Lista de comprobación</h2>
          <div className={styles.checklist} role="table" aria-label="Lista de comprobación">
            <div className={styles.checkHead} role="rowgroup" aria-hidden="true">
              <span />
              <span className={styles.ok}>Aceptable</span>
              <span className={styles.ko}>Cuidado</span>
            </div>
            <div role="rowgroup">
              {g.checklist.map((row) => (
                <div key={row.zone} className={styles.row} role="row">
                  <strong role="rowheader">{row.zone}</strong>
                  <span role="cell">
                    <span className={styles.okLabel}>Aceptable: </span>
                    {row.ok}
                  </span>
                  <span role="cell">
                    <span className={styles.koLabel}>Cuidado: </span>
                    {row.ko}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.cta}>
            <div>
              <p className={styles.ctaTitle}>¿Aún no sabes qué volumen buscar?</p>
              <p className={styles.ctaText}>Siete preguntas sobre tu peso, nivel y olas, y un rango orientativo de litros.</p>
            </div>
            <Link href="/calculadora-litros" className={styles.ctaBtn}>
              Calcular mis litros
            </Link>
          </div>
        </div>

        {recent.length > 0 && (
          <section className={styles.recent} aria-labelledby="recientes-title">
            <h2 id="recientes-title" className={styles.h2}>
              Tablas publicadas recientemente
            </h2>
            <div className={styles.cards}>
              {recent.map((l) => (
                <ListingCard key={l.id} listing={l} now={now} hereZone="" layout="horizontal" />
              ))}
            </div>
          </section>
        )}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.h1,
          description: g.description,
          image: [absoluteUrl(photo.src)],
          dateModified: g.updatedAt,
          mainEntityOfPage: absoluteUrl(guidePath(g)),
          author: {
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl("/"),
          },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl("/"),
          },
          inLanguage: "es-ES",
        }}
      />
    </main>
  );
}
