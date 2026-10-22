"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserState } from "@/components/user/UserStateProvider";
import styles from "./CompareTray.module.css";

/** Barra petróleo fija abajo con las tablas en comparación. No aparece en la ficha ni en el comparador. */
export function CompareTray() {
  const { compare, removeCompare } = useUserState();
  const pathname = usePathname();
  // Tampoco en publicar ni en el asistente: taparía su barra fija Atrás / Continuar.
  const hidden = ["/anuncio", "/comparar", "/vender/publicar", "/calculadora-litros"].some((p) => pathname.startsWith(p));
  if (!compare.length || hidden) return null;
  const ready = compare.length >= 2;
  return (
    <div className={styles.tray}>
      <div className={styles.inner}>
        <div className={styles.items}>
          {compare.map((c) => (
            <button key={c.id} type="button" className={styles.item} onClick={() => removeCompare(c.id)} aria-label={`Quitar ${c.label} de la comparación`}>
              {c.label} <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
        <Link href="/comparar" className={styles.go} data-ready={ready || undefined}>
          Comparar ({compare.length})
        </Link>
      </div>
    </div>
  );
}
