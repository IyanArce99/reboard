import type { Metadata } from "next";
import Link from "next/link";
import ui from "@/styles/ui.module.css";
import styles from "./PendingPage.module.css";
import { noindexRobots } from "@/lib/seo";

export const pendingMetadata = (title: string): Metadata => ({ title, robots: noindexRobots() });

/**
 * Pantalla diseñada en el prototipo que aún no está implementada en Next.js.
 * Evita enlaces rotos sin inventar contenido. Ver el orden de implementación en docs/ROADMAP.md.
 */
export function PendingPage({ title, text }: { title: string; text: string }) {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={ui.h1}>{title}</h1>
      <p className={styles.text}>{text}</p>
      <p className={styles.note}>
        Esta pantalla ya está diseñada en el prototipo y se implementará en una próxima fase.
      </p>
      <div className={styles.actions}>
        <Link href="/buscar" className={ui.btnPrimary}>
          Buscar tablas
        </Link>
        <Link href="/" className={ui.btnNeutral}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
