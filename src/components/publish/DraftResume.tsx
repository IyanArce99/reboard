"use client";

// «Tienes una tabla a medias»: el borrador de publicar vive en este dispositivo (IndexedDB) y antes solo
// se recuperaba al entrar en publicar. Aquí se avisa en /vender para no perderlo.

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadStoredDraft } from "@/lib/publish/draft-store";
import styles from "./DraftResume.module.css";

export function DraftResume() {
  const [draft, setDraft] = useState<{ photos: number; step: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStoredDraft()
      .then((s) => {
        if (!cancelled && s && (s.photos.length > 0 || s.step > 1)) setDraft({ photos: s.photos.length, step: s.step });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!draft) return null;
  return (
    <div className={styles.box} role="status">
      <span>
        <strong>Tienes una tabla a medias.</strong> {draft.photos === 1 ? "1 foto" : `${draft.photos} fotos`} · paso {Math.min(draft.step, 5)} de 5,
        guardado en este dispositivo.
      </span>
      <Link href="/vender/publicar" className={styles.link}>
        Seguir publicando
      </Link>
    </div>
  );
}
