import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, LEGAL_UPDATED, legalDoc } from "@/lib/content/legal";
import styles from "./Legal.module.css";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const d = legalDoc((await params).doc);
  // Textos definitivos: siguen la regla general de indexación del sitio (SITE_INDEXABLE).
  return d ? { title: d.title, description: d.intro, alternates: { canonical: `/legal/${d.slug}` } } : {};
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const d = legalDoc((await params).doc);
  if (!d) notFound();
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={styles.title}>{d.title}</h1>
      <p className={styles.intro}>{d.intro}</p>
      <p className={styles.updated}>Última actualización: {LEGAL_UPDATED}</p>
      {d.sections.map((s) => (
        <section key={s.h} className={styles.section}>
          <h2>{s.h}</h2>
          {s.p.map((t) => (
            <p key={t}>{t}</p>
          ))}
          {s.links && (
            <ul className={styles.links}>
              {s.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label} →</Link>
                </li>
              ))}
            </ul>
          )}
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
