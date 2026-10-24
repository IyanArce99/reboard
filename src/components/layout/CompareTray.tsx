"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoardShape } from "@/components/brand/BoardShape";
import { MAX_COMPARE, useUserState } from "@/components/user/UserStateProvider";
import ui from "@/styles/ui.module.css";
import styles from "./CompareTray.module.css";

/**
 * Barra fija abajo con las tablas elegidas para comparar. Solo aparece con alguna tabla.
 * - No aparece en /comparar (ya estás comparando) ni en publicar o TablaFinder (taparía su barra
 *   Atrás / Continuar; el resultado de TablaFinder tiene su propio acceso al comparador).
 * - En la ficha solo en escritorio: en móvil ya hay una barra de contacto fija (y un enlace al comparador).
 */
export function CompareTray() {
  const { compare, removeCompare, clearCompare } = useUserState();
  const pathname = usePathname();
  const hidden = ["/comparar", "/vender/publicar", "/calculadora-litros"].some((p) => pathname.startsWith(p));
  if (!compare.length || hidden) return null;
  const n = compare.length;
  const ready = n >= 2;
  const onListing = pathname.startsWith("/anuncio");

  return (
    <aside className={styles.tray} aria-label="Comparación de tablas" data-desktop-only={onListing || undefined}>
      <div className={styles.inner}>
        <p className={styles.status} aria-live="polite" data-ready={ready || undefined}>
          <strong>
            {n} {n === 1 ? "tabla" : "tablas"}
          </strong>
          <span className={styles.statusRest}>{ready ? ` de ${MAX_COMPARE} para comparar` : " seleccionada. Añade otra para comparar"}</span>
        </p>
        <ul className={styles.thumbs}>
          {compare.map((c) => (
            <li key={c.id}>
              <button type="button" className={styles.thumb} onClick={() => removeCompare(c.id)} aria-label={`Quitar ${c.label} de la comparación`} title={c.label}>
                <span className={styles.pic}>
                  {c.photo ? (
                    <Image src={c.photo} alt="" width={44} height={44} sizes="44px" className={styles.img} />
                  ) : (
                    <BoardShape shape={c.shape ?? "evolutiva"} size={30} />
                  )}
                </span>
                <span className={styles.x} aria-hidden="true">
                  ✕
                </span>
              </button>
            </li>
          ))}
          {/* Huecos libres (escritorio): se ve de un vistazo cuántas caben. */}
          {Array.from({ length: MAX_COMPARE - n }, (_, i) => (
            <li key={`hueco-${i}`} className={styles.slot} aria-hidden="true" />
          ))}
        </ul>
        <button type="button" className={styles.clear} onClick={clearCompare}>
          Vaciar
        </button>
        {ready ? (
          <Link href="/comparar" className={`${ui.btnPrimary} ${styles.go}`}>
            <span className={styles.goLong}>Comparar {n} tablas</span>
            <span className={styles.goShort} aria-hidden="true">
              Comparar ({n})
            </span>
          </Link>
        ) : (
          // Con una sola tabla, /comparar solo diría que falta otra.
          <span className={styles.hint}>Añade otra</span>
        )}
      </div>
    </aside>
  );
}
