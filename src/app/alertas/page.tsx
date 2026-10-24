import { SavedScreen } from "@/components/saved/SavedScreen";
import { privateMetadata } from "@/components/saved/metadata";
import ui from "@/styles/ui.module.css";
import styles from "@/components/saved/Saved.module.css";

export const metadata = privateMetadata("Búsquedas guardadas", "Tus búsquedas guardadas, solo en este dispositivo. No envían avisos.");

export default function AlertasPage() {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={`${ui.h1} ${styles.title}`}>Búsquedas guardadas</h1>
      <SavedScreen tab="alerts" />
    </main>
  );
}
