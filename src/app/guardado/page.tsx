import { SavedScreen } from "@/components/saved/SavedScreen";
import { privateMetadata } from "@/components/saved/metadata";
import ui from "@/styles/ui.module.css";
import styles from "@/components/saved/Saved.module.css";

export const metadata = privateMetadata("Guardadas", "Tus tablas guardadas en este dispositivo.");

export default function GuardadoPage() {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={`${ui.h1} ${styles.title}`}>Guardadas</h1>
      <SavedScreen tab="saved" />
    </main>
  );
}
