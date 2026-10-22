import Link from "next/link";
import { Logo } from "@/components/Logo";
import styles from "./Footer.module.css";

const BUY: [string, string][] = [
  ["Todas las tablas", "/buscar"],
  ["Evolutivas", "/tablas/evolutiva"],
  ["Softboards", "/tablas/softboard"],
  ["Gran Canaria", "/tablas/gran-canaria"],
  ["Asturias", "/tablas/asturias"],
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo size={28} />
          <span className={styles.tagline}>Tu próxima tabla ya existe.</span>
          <span className={styles.muted}>
            Tablas de surf de segunda mano en España. Sin pagos ni comisiones: contacto directo entre comprador y vendedor.
          </span>
        </div>
        <nav className={styles.col} aria-label="Comprar">
          <strong>Comprar</strong>
          {BUY.map(([l, href]) => (
            <Link key={href} href={href}>
              {l}
            </Link>
          ))}
        </nav>
        <nav className={styles.col} aria-label="Herramientas">
          <strong>Herramientas</strong>
          <Link href="/calculadora-litros">¿Qué tabla necesito?</Link>
          <Link href="/comparar">Comparar anuncios</Link>
          <Link href="/guias">Guías</Link>
        </nav>
        <nav className={styles.col} aria-label="Vender">
          <strong>Vender</strong>
          <Link href="/vender/publicar">Publicar gratis</Link>
          <Link href="/tiendas">Tiendas y escuelas</Link>
        </nav>
      </div>
    </footer>
  );
}
