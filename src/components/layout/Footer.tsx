import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LAUNCH, ZONES } from "@/lib/domain/taxonomy";
import { landingPath } from "@/lib/search/landings";
import styles from "./Footer.module.css";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Comprar",
    links: [
      ["Todas las tablas", "/buscar"],
      ["Evolutivas", "/tablas/evolutiva"],
      ["Softboards", "/tablas/softboard"],
      ["Para principiantes", "/tablas/principiantes"],
    ],
  },
  {
    // Las islas del territorio activo (LAUNCH), en el orden del catálogo.
    title: `Por ${LAUNCH.zoneNoun}`,
    links: ZONES.map((z) => [z.name, landingPath(z.slug, null)] as [string, string]),
  },
  {
    title: "Elegir bien",
    links: [
      ["¿Qué tabla necesito?", "/calculadora-litros"],
      ["Comparar tablas", "/comparar"],
      ["Guías", "/guias"],
    ],
  },
  {
    title: "Vender",
    links: [
      ["Vender mi tabla", "/vender/publicar"],
      ["Cómo vender tu tabla", "/vender"],
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
          <p className={styles.muted}>
            Tablas de surf de segunda mano en Canarias. Sin comisiones ni pagos por la web: quien compra y quien vende hablan directamente.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} className={styles.col} aria-label={c.title}>
            {/* Título de columna, no de sección: no entra en el esquema de encabezados de la página. */}
            <p className={styles.colTitle}>{c.title}</p>
            {c.links.map(([l, href]) => (
              <Link key={href} href={href}>
                {l}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className={styles.bottom}>
        <span>© Reboard · Hecho en Canarias para surfistas de todas las islas</span>
        <nav className={styles.legal} aria-label="Legal">
          <Link href="/legal/aviso-legal">Aviso legal</Link>
          <Link href="/legal/privacidad">Privacidad</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <Link href="/legal/condiciones">Condiciones</Link>
          <Link href="/creditos">Créditos de fotografía</Link>
        </nav>
      </div>
    </footer>
  );
}
