import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { GUIDES, guideDate } from "@/lib/content/guides";
import { unsplash } from "@/lib/images";
import ui from "@/styles/ui.module.css";
import styles from "@/components/guides/Guides.module.css";

const TITLE = "Guías de compra";
const DESCRIPTION =
  "Guías útiles para comprar y vender tablas de surf de segunda mano: qué revisar antes de pagar, cuántos litros necesitas y cómo interpretar las medidas.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guias", languages: { "es-ES": "/guias" } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/guias" },
};

// Solo se listan las guías con contenido. Las pendientes (PENDING_GUIDES) siguen como página provisional.
export default function GuidesPage() {
  return (
    <main className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} current={{ label: "Guías", href: "/guias" }} />
      <h1 className={ui.h1}>{TITLE}</h1>
      <p className={styles.intro}>
        Respuestas cortas y listas de comprobación para comprar una tabla usada con criterio. Si no sabes qué volumen
        buscar, empieza por el asistente <Link href="/calculadora-litros">¿Qué tabla necesito?</Link>
      </p>
      <div className={styles.list}>
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/guias/${g.slug}`} className={styles.item}>
            <div className={styles.itemImg}>
              <Image src={unsplash(g.image.unsplashId, 400)} alt="" fill sizes="160px" />
            </div>
            <div className={styles.itemBody}>
              <span className={styles.itemSection}>{g.section}</span>
              <span className={styles.itemTitle}>{g.title}</span>
              <span className={styles.itemText}>Actualizada el {guideDate(g.updatedAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
