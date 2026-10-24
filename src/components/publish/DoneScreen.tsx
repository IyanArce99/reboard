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
          {real ? (editing ? "Cambios guardados" : "Tu tabla está publicada") : "Prueba terminada"}
        </h1>
        {real ? (
          <>
            <p className={styles.doneText}>
              {editing ? "Los cambios ya se ven en el anuncio y en las búsquedas." : "Ya sale en las búsquedas y quien busque esas medidas te podrá escribir."}
            </p>
            {!editing && (
              // Lo más importante después de publicar: sin confirmar, el anuncio caduca (no hay recordatorios).
              <p className={styles.doneNote}>
                <strong>Apúntatelo:</strong> cada 14 días, entra en «Mis anuncios» y confirma que sigue a la venta. Si pasan 30 días sin
                confirmarlo, el anuncio caduca. No enviamos recordatorios.
              </p>
            )}
          </>
        ) : (
          <p className={styles.doneText}>
            Todavía no se puede publicar, así que el anuncio no se ha guardado y las fotos no han salido de tu dispositivo.
            Cuando se pueda, tu tabla saldrá en las búsquedas por sus medidas.
          </p>
        )}
        <div className={styles.doneBtns}>
          {real && done.path && (
            <Link href={done.path} className={styles.btnPetrol}>
              Ver mi anuncio
            </Link>
          )}
          <Link href="/panel" className={real && done.path ? styles.btnWhite : styles.btnPetrol}>
            Ver mis anuncios
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
