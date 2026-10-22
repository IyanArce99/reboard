import type { Metadata } from "next";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { PHOTOS, type EditorialPhoto } from "@/lib/photos";
import { noindexRobots } from "@/lib/seo";
import styles from "./creditos.module.css";

export const metadata: Metadata = {
  title: "Créditos de fotografía",
  description: "Autoría y origen de las fotografías editoriales que usa Reboard.",
  alternates: { canonical: "/creditos" },
  robots: noindexRobots(),
};

export default function Creditos() {
  const photos: [string, EditorialPhoto][] = Object.entries(PHOTOS);
  return (
    <main className="container">
      <div className={styles.page}>
        <SectionHeader
          as="h1"
          eyebrow="Créditos"
          title="Créditos de fotografía"
          lead="Las fotos de ambiente de Reboard son de Pexels y se usan con su licencia gratuita. No son fotos de anuncios: las tablas en venta se muestran con las fotos que sube quien vende. (Con datos de demostración, los anuncios usan fotos de stock de Unsplash, señaladas como tales. Las tiendas y escuelas sin foto propia también usan una foto de stock de Unsplash.)"
        />
        <ul className={styles.list}>
          {photos.map(([slug, p]) => (
            <li key={slug}>
              <a href={p.credit.pexels} rel="noopener" target="_blank">
                {p.credit.title}
              </a>
              <span>
                {" "}
                ·{" "}
                <a href={p.credit.profile} rel="noopener" target="_blank">
                  {p.credit.author}
                </a>
                {p.credit.place ? ` · ${p.credit.place}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Licencia de Pexels:{" "}
          <a href="https://www.pexels.com/license/" rel="noopener" target="_blank">
            pexels.com/license
          </a>
          .
        </p>
      </div>
    </main>
  );
}
