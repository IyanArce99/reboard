import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/brand/Photo";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { GUIDES, guideDate } from "@/lib/content/guides";
import type { PhotoSlug } from "@/lib/photos";
import styles from "@/components/guides/Guides.module.css";

const TITLE = "Guías de compra";
const DESCRIPTION =
  "Qué revisar antes de comprar una tabla usada y herramientas para calcular tus litros y comparar tablas.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guias", languages: { "es-ES": "/guias" } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/guias" },
};

const TOOLS: { t: string; d: string; href: string; photo: PhotoSlug; cta: string }[] = [
  {
    t: "¿Qué tabla necesito?",
    d: "Peso, nivel, olas y lo que quieres conseguir. Un rango orientativo de litros y las tablas publicadas que entran en él.",
    href: "/calculadora-litros",
    photo: "clase-surf",
    cta: "Calcular mis litros",
  },
  {
    t: "Comparar tablas",
    d: "Hasta cuatro tablas lado a lado: litros, medidas, estado, precio y zona.",
    href: "/comparar",
    photo: "tablas-orilla",
    cta: "Abrir el comparador",
  },
];

// Solo se listan las guías con contenido. Las pendientes (PENDING_GUIDES) siguen como página provisional.
export default function GuidesPage() {
  return (
    <main>
      <div className={styles.indexHead}>
        <div className="container">
          <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} current={{ label: "Guías", href: "/guias" }} />
          <SectionHeader
            as="h1"
            eyebrow="Antes de comprar"
            title={TITLE}
            lead="Respuestas cortas y listas de comprobación para comprar una tabla usada con criterio."
          />
        </div>
      </div>

      <section className={`container ${styles.indexBody}`} aria-label="Guías">
        <div className={styles.list}>
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guias/${g.slug}`} className={styles.item}>
              <span className={styles.itemImg}>
                <Photo slug={g.photo} sizes="(max-width: 759px) 100vw, 50vw" decorative />
              </span>
              <span className={styles.itemBody}>
                <span className={styles.itemSection}>{g.section}</span>
                <span className={styles.itemTitle}>{g.title}</span>
                <span className={styles.itemText}>{g.description}</span>
                <span className={styles.itemDate}>Actualizada el {guideDate(g.updatedAt)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`container ${styles.indexBody} ${styles.indexEnd}`} aria-labelledby="herramientas-title">
        <SectionHeader id="herramientas-title" eyebrow="Herramientas" title="Para decidir con datos" />
        <div className={styles.tools}>
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className={styles.tool}>
              <span className={styles.toolImg}>
                <Photo slug={t.photo} sizes="(max-width: 759px) 100vw, 50vw" decorative />
              </span>
              <span className={styles.itemTitle}>{t.t}</span>
              <span className={styles.itemText}>{t.d}</span>
              <span className={styles.toolCta}>{t.cta} →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
