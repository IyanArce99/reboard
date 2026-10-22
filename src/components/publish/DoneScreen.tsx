"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./Publish.module.css";

export interface Done {
  path: string | null;
  persisted: boolean;
}

export function DoneScreen({ done, editing, onAgain }: { done: Done; editing: boolean; onAgain: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const real = done.persisted;
  return (
    <main className={`${styles.page} ${styles.donePage}`}>
      <section className={styles.done}>
        <span className={styles.doneIcon} data-demo={!real || undefined} aria-hidden="true">
          {real ? "✓" : "i"}
        </span>
        <h1 ref={ref} tabIndex={-1} className={styles.doneH1}>
          {real ? (editing ? "Cambios guardados" : "Tu tabla está publicada") : editing ? "Cambios revisados (demo)" : "Anuncio listo (demo)"}
        </h1>
        <div className={styles.doneKicker}>Reboard · su próxima vida empieza aquí</div>
        {real ? (
          <p className={styles.doneText}>
            {editing
              ? "Los cambios ya se ven en el anuncio y en las búsquedas."
              : "Ya aparece en las búsquedas por sus medidas. Cada 14 días te pediremos que confirmes que sigue disponible; si no, caduca a los 30."}
          </p>
        ) : (
          <p className={styles.doneText}>
            Esto es una demostración: el anuncio no se ha publicado y las fotos no han salido de tu dispositivo. Con el servicio activo,
            aparecería en las búsquedas por sus medidas.
          </p>
        )}
        <div className={styles.doneBtns}>
          {real && done.path && (
            <Link href={done.path} className={styles.btnPetrol}>
              Ver mi anuncio
            </Link>
          )}
          <Link href="/panel" className={real && done.path ? styles.btnWhite : styles.btnPetrol}>
            Ir a mi panel
          </Link>
          {!editing && (
            <button type="button" className={styles.btnWhite} onClick={onAgain}>
              Publicar otra tabla
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
