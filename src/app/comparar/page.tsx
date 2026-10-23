import { Comparator } from "@/components/compare/Comparator";
import { privateMetadata } from "@/components/saved/metadata";
import ui from "@/styles/ui.module.css";
import styles from "@/components/compare/Compare.module.css";

export const metadata = privateMetadata("Comparar tablas", "Compara de 2 a 4 tablas lado a lado, con las diferencias resaltadas.");

export default function CompararPage() {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={`${ui.h1} ${styles.title}`}>Comparar tablas</h1>
      <p className={styles.lead}>De 2 a 4 tablas, una al lado de otra. Las filas resaltadas son las que cambian entre ellas.</p>
      <Comparator />
    </main>
  );
}
