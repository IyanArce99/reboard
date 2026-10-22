import Link from "next/link";
import { Photo } from "./Photo";
import styles from "./ClosingBand.module.css";

/** Cierre de marca para páginas editoriales (home, vender, guías): foto a sangre + dos acciones. */
export function ClosingBand() {
  return (
    <section className={styles.band} aria-labelledby="closing-title">
      <Photo slug="atardecer-playa" sizes="100vw" position="50% 60%" decorative />
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>Reboard</p>
        <h2 id="closing-title" className={styles.title}>
          Tu próxima tabla ya existe.
          <br />
          <span>Y la que tienes parada, alguien la está buscando.</span>
        </h2>
        <div className={styles.actions}>
          <Link href="/buscar" className={styles.primary}>
            Buscar tablas
          </Link>
          <Link href="/vender/publicar" className={styles.secondary}>
            Publicar la mía gratis
          </Link>
        </div>
      </div>
    </section>
  );
}
