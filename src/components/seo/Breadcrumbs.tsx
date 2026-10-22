import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "./JsonLd";
import styles from "./Breadcrumbs.module.css";

export interface Crumb {
  label: string;
  href: string;
}

/** Migas de pan con BreadcrumbList. El último elemento es la página actual. */
export function Breadcrumbs({ items, current, back }: { items: Crumb[]; current?: Crumb; back?: Crumb }) {
  const all = current ? [...items, current] : items;
  return (
    <>
      <nav aria-label="Migas de pan" className={styles.crumbs}>
        {back && (
          <>
            <Link href={back.href} className={styles.back}>
              ← {back.label}
            </Link>
            <span className={styles.sep} aria-hidden="true">
              ·
            </span>
          </>
        )}
        {items.map((c) => (
          <span key={c.href} className={styles.item}>
            <Link href={c.href}>{c.label}</Link>
            <span className={styles.sep} aria-hidden="true">
              /
            </span>
          </span>
        ))}
        {current && (
          <span className={styles.current} aria-current="page">
            {current.label}
          </span>
        )}
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: absoluteUrl(c.href),
          })),
        }}
      />
    </>
  );
}
