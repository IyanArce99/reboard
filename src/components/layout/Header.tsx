import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
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
          <SavedButton />
          <AccountButton />
          <Link href="/vender/publicar" className={styles.publish}>
            Publicar tabla
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
