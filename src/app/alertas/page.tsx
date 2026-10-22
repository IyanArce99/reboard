import { SavedScreen } from "@/components/saved/SavedScreen";
import { privateMetadata } from "@/components/saved/metadata";
import ui from "@/styles/ui.module.css";
import styles from "@/components/saved/Saved.module.css";

export const metadata = privateMetadata("Alertas", "Tus alertas de búsqueda guardadas en este dispositivo.");

export default function AlertasPage() {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={`${ui.h1} ${styles.title}`}>Alertas</h1>
      <SavedScreen tab="alerts" />
    </main>
  );
}
