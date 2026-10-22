import { Comparator } from "@/components/compare/Comparator";
import { privateMetadata } from "@/components/saved/metadata";
import ui from "@/styles/ui.module.css";
import styles from "@/components/compare/Compare.module.css";

export const metadata = privateMetadata("Comparar tablas", "Compara de 2 a 4 anuncios lado a lado, con las diferencias resaltadas.");

export default function CompararPage() {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={`${ui.h1} ${styles.title}`}>Comparar tablas</h1>
      <p className={styles.lead}>Entre 2 y 4 anuncios. Las filas marcadas en azul tienen valores distintos.</p>
      <Comparator />
    </main>
  );
}
