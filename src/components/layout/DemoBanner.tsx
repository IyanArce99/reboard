import ui from "@/styles/ui.module.css";
import styles from "./DemoBanner.module.css";

/** Aviso visible mientras los datos sean simulados: nunca se presentan como anuncios reales. */
export function DemoBanner() {
  return (
    <div className={styles.banner} role="note">
      <span className={ui.demoTag}>DEMO</span>
      <span>Todos los anuncios, vendedores y tiendas son datos de demostración.</span>
    </div>
  );
}
