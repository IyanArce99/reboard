import { Suspense } from "react";
import { Comparator } from "@/components/compare/Comparator";
import { privateMetadata } from "@/components/saved/metadata";
import ui from "@/styles/ui.module.css";
import styles from "@/components/compare/Compare.module.css";

export const metadata = privateMetadata("Compara tablas de surf", "Pon hasta 4 tablas de surf una al lado de otra y mira en qué se diferencian: precio, litros, medidas, estado e isla.");

export default function CompararPage() {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={`${ui.h1} ${styles.title}`}>Compara tablas de surf</h1>
      <p className={styles.lead}>Hasta 4 tablas, una al lado de otra: precio, litros, medidas, estado e isla.</p>
      {/* Lee ?ids= de un enlace compartido: la URL en el cliente necesita su Suspense. */}
      <Suspense fallback={<div className={styles.skeleton} aria-hidden="true" />}>
        <Comparator />
      </Suspense>
    </main>
  );
}
