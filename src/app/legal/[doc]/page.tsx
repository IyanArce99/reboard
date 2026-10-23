import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, legalDoc } from "@/lib/content/legal";
import { noindexRobots } from "@/lib/seo";
import styles from "./Legal.module.css";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const d = legalDoc((await params).doc);
  // Borradores sin revisar: no se indexan.
  return d ? { title: d.title, description: d.intro, robots: noindexRobots(), alternates: { canonical: `/legal/${d.slug}` } } : {};
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const d = legalDoc((await params).doc);
  if (!d) notFound();
  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.draft} role="note">
        <strong>Borrador pendiente de revisión legal.</strong> Este texto aún no es definitivo: falta la revisión de un
        profesional y hay apartados por completar (los que van entre corchetes).
      </div>
      <h1 className={styles.title}>{d.title}</h1>
      <p className={styles.intro}>{d.intro}</p>
      {d.sections.map((s) => (
        <section key={s.h} className={styles.section}>
          <h2>{s.h}</h2>
          {s.p.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </section>
      ))}
      <nav className={styles.others} aria-label="Textos legales">
        {LEGAL_DOCS.filter((x) => x.slug !== d.slug).map((x) => (
          <Link key={x.slug} href={`/legal/${x.slug}`}>
            {x.title}
          </Link>
        ))}
      </nav>
    </main>
  );
}
