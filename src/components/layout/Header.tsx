import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { HeartIcon, MenuIcon, UserIcon } from "@/components/icons";
import { AccountButton, MainNav, MobileMenu, SavedButton } from "./HeaderClient";
import styles from "./Header.module.css";

// Cabecera: explorar, encontrar mi tabla y publicar. Sin buscador (el completo está en /buscar).
// Escritorio: logo · Explorar tablas · TablaFinder · Guías | guardadas · cuenta · Publicar tabla.
// Tablet: logo | guardadas · cuenta · Publicar tabla · menú. Móvil: logo | guardadas · cuenta · menú.
export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" aria-label="Reboard, inicio" className={styles.logoLink}>
          <span className={styles.logoD}>
            <Logo size={30} />
          </span>
          <span className={styles.logoM}>
            <Logo size={26} />
          </span>
        </Link>

        <Suspense fallback={<nav className={styles.nav} aria-label="Principal" />}>
          <MainNav className={styles.nav} linkClassName={styles.navLink} />
        </Suspense>

        <div className={styles.actions}>
          {/* Leen la URL (página activa): cada uno con su Suspense y un respaldo estático idéntico,
              para que la cabecera siga en el HTML inicial también en rutas dinámicas sin prerender (/admin). */}
          <Suspense
            fallback={
              <Link href="/guardado" aria-label="Guardadas" data-tip="Guardadas" className={styles.iconBtn}>
                <HeartIcon />
              </Link>
            }
          >
            <SavedButton />
          </Suspense>
          <Suspense
            fallback={
              <Link href="/entrar" aria-label="Entrar" data-tip="Entrar" className={styles.iconBtn}>
                <UserIcon />
              </Link>
            }
          >
            <AccountButton />
          </Suspense>
          <Link href="/vender/publicar" className={styles.publish}>
            Publicar tabla
          </Link>
          <Suspense
            fallback={
              <button type="button" aria-label="Menú" className={`${styles.iconBtn} ${styles.menuBtn}`} disabled>
                <MenuIcon />
              </button>
            }
          >
            <MobileMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
