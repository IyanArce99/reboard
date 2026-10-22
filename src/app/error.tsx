"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BoardsIllustration } from "@/components/brand/EmptyState";
import ui from "@/styles/ui.module.css";
import styles from "./not-found.module.css";

/** Error inesperado en una página. Cabecera y pie siguen visibles (el layout no se rompe). */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={`container ${styles.plain}`}>
      <BoardsIllustration />
      <p className={styles.plainEyebrow}>Algo ha fallado</p>
      <h1 className={styles.plainTitle}>No hemos podido cargar esta página</h1>
      <p className={styles.plainLead}>Puede ser un problema puntual de conexión. Vuelve a intentarlo; si sigue fallando, prueba dentro de un rato.</p>
      <div className={styles.plainActions}>
        <button type="button" className={ui.btnPrimary} onClick={() => retry()}>
          Reintentar
        </button>
        <Link href="/" className={ui.btnNeutral}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
