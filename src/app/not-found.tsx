import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/brand/Photo";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <Photo slug="surfista-niebla" sizes="100vw" position="50% 50%" decorative />
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>Error 404</p>
        <h1 className={styles.title}>Esta ola ya pasó</h1>
        <p className={styles.lead}>
          No encontramos esta página. Puede que el anuncio ya no esté o que el enlace esté mal. Busca otra tabla por litros, tipo e
          isla.
        </p>
        <div className={styles.actions}>
          <Link href="/buscar" className={styles.primary}>
            Buscar tablas
          </Link>
          <Link href="/" className={styles.secondary}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
