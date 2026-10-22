import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { SearchIcon } from "@/components/icons";
import type { CatalogNames } from "@/lib/search/describe";
import { BuyLink, CompactSearch, MobileMenu, MobileSavedLink } from "./HeaderClient";
import { SavedCount } from "@/components/user/islands";
import styles from "./Header.module.css";

export function Header({ names }: { names: CatalogNames }) {
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

        <nav className={styles.navD} aria-label="Principal">
          <Suspense fallback={<Link href="/buscar" className={styles.navLink}>Comprar tablas</Link>}>
            <BuyLink className={styles.navLink} />
          </Suspense>
          <Link href="/calculadora-litros" className={styles.navLink}>
            ¿Qué tabla necesito?
          </Link>
          <Link href="/guias" className={styles.navLink}>
            Guías
          </Link>
          <span className={styles.spacer} />
          <Suspense fallback={null}>
            <CompactSearch names={names} className={styles.compact} />
          </Suspense>
          <Link href="/guardado" className={styles.navLink}>
            <SavedCount prefix="Guardado · " />
          </Link>
          <Link href="/vender/publicar" className={styles.sell}>
            Vender gratis
          </Link>
        </nav>

        <div className={styles.navM}>
          <Link href="/buscar" aria-label="Buscar" className={styles.iconBtn}>
            <SearchIcon />
          </Link>
          <MobileSavedLink className={styles.iconBtn} badgeClassName={styles.badge} />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
