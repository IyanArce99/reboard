import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingPage, pendingMetadata } from "@/components/layout/PendingPage";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { GUIDES, PENDING_GUIDES, guideBySlug, guideDate, type Guide } from "@/lib/content/guides";
import { getRepository } from "@/lib/data";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { unsplash } from "@/mocks/demo-inventory";
import ui from "@/styles/ui.module.css";
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
  const image = unsplash(g.image.unsplashId, 1400);
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: path, languages: { "es-ES": path } },
    openGraph: { type: "article", title: g.title, description: g.description, url: path, images: [{ url: image }], modifiedTime: g.updatedAt },
  };
}

export default async function GuidePage({ params }: PageProps<"/guias/[slug]">) {
  const r = guide((await params).slug);
  if ("pending" in r) {
    return (
      <PendingPage
        title={r.pending}
        text="Respuesta corta, tabla de comprobación, enlace al asistente, anuncios relacionados y fecha de actualización."
      />
    );
  }
  const g = r.guide;
  const repo = getRepository();
  const active = await repo.active();
  const now = repo.now();
  const recent = [...active].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)).slice(0, 4);
  const image = unsplash(g.image.unsplashId, 1400);

  return (
    <main className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ label: "Guías", href: "/guias" }]} current={{ label: g.section, href: guidePath(g) }} />
      <h1 className={`${ui.h1} ${styles.title}`}>{g.h1}</h1>
      <div className={styles.meta}>
        Actualizada el <time dateTime={g.updatedAt}>{guideDate(g.updatedAt)}</time> · {g.byline}
      </div>
      <div className={styles.answer}>
        <strong>Respuesta corta:</strong> {g.shortAnswer}
      </div>
      <div className={styles.figure}>
        <Image src={image} alt={g.image.alt} fill sizes="(max-width: 759px) 100vw, 728px" preload />
        <span className={styles.stockTag}>foto de stock</span>
      </div>

      <h2 className={styles.h2}>Lista de comprobación</h2>
      <div className={styles.checklist} role="table" aria-label="Lista de comprobación">
        <div role="rowgroup">
          {g.checklist.map((row) => (
            <div key={row.zone} className={styles.row} role="row">
              <strong role="rowheader">{row.zone}</strong>
              <span role="cell">
                <span className={styles.ok}>Aceptable:</span> {row.ok}
              </span>
              <span role="cell">
                <span className={styles.ko}>Cuidado:</span> {row.ko}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.cta}>
        <span className={styles.ctaText}>¿Aún no sabes qué volumen buscar?</span>
        <Link href="/calculadora-litros" className={ui.btnStrong}>
          ¿Qué tabla necesito?
        </Link>
      </div>

      {recent.length > 0 && (
        <section aria-labelledby="recientes-title">
          <h2 id="recientes-title" className={`${styles.h2} ${styles.h2Cards}`}>
            Tablas publicadas recientemente
          </h2>
          <div className={styles.cards}>
            {recent.map((l) => (
              <ListingCard key={l.id} listing={l} now={now} hereZone="" layout="horizontal" />
            ))}
          </div>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.h1,
          description: g.description,
          image: [image],
          dateModified: g.updatedAt,
          mainEntityOfPage: absoluteUrl(guidePath(g)),
          author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
          publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
          inLanguage: "es-ES",
        }}
      />
    </main>
  );
}
