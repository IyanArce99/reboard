import Link from "next/link";
import { Logo } from "@/components/Logo";
import styles from "./Footer.module.css";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Comprar",
    links: [
      ["Todas las tablas", "/buscar"],
      ["Evolutivas", "/tablas/evolutiva"],
      ["Softboards", "/tablas/softboard"],
      ["Gran Canaria", "/tablas/gran-canaria"],
      ["Asturias", "/tablas/asturias"],
    ],
  },
  {
    title: "Elegir bien",
    links: [
      ["¿Cuántos litros necesito?", "/calculadora-litros"],
      ["Comparar anuncios", "/comparar"],
      ["Guías", "/guias"],
    ],
  },
  {
    title: "Vender",
    links: [
      ["Publicar gratis", "/vender/publicar"],
      ["Cómo funciona vender", "/vender"],
      ["Tiendas y escuelas", "/tiendas"],
    ],
  },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo size={30} tone="dark" />
          <p className={styles.tagline}>Tu próxima tabla ya existe.</p>
          <p className={styles.muted}>
            Tablas de surf de segunda mano en España. Sin pagos ni comisiones: compradores y vendedores hablan directamente.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} className={styles.col} aria-label={c.title}>
            <h2 className={styles.colTitle}>{c.title}</h2>
            {c.links.map(([l, href]) => (
              <Link key={href} href={href}>
                {l}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className={styles.bottom}>
        <span>Reboard · Hecho para surfistas en España</span>
        <Link href="/creditos">Créditos de fotografía</Link>
      </div>
    </footer>
  );
}
