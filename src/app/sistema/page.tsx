import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ListingCard } from "@/components/listing/ListingCard";
import { getRepository } from "@/lib/data";
import { emptyFilters } from "@/lib/search/filters";
import ui from "@/styles/ui.module.css";
import styles from "./Sistema.module.css";

// Pantalla interna «Sistema visual» (docs/PAGES.md): referencia para el equipo. No se enlaza ni se indexa.
export const metadata: Metadata = {
  title: "Sistema visual",
  robots: { index: false, follow: false },
};

const SWATCHES: [string, string, string][] = [
  ["Azul petróleo", "#102D3B", "Hero, títulos, estructura"],
  ["Turquesa oceánico", "#087E8B", "Enlaces, activo, seleccionado"],
  ["Turquesa claro", "#7AD1CE", "Acentos sobre petróleo"],
  ["Amarillo arena", "#F4C15A", "Solo acciones principales"],
  ["Blanco agua", "#EFF6F5", "Fondo general"],
  ["Blanco", "#FFFFFF", "Tarjetas y formularios"],
  ["Azul grisáceo", "#4A6670", "Texto secundario (AA)"],
  ["Línea", "#D6E4E3", "Bordes 1 px"],
  ["Éxito", "#1E6A47", "Disponible · confirmado"],
  ["Aviso", "#C08A2E", "Pendiente · sin indicar"],
  ["Error", "#A23A2C", "Vendida · reportar"],
];

export default async function SistemaPage() {
  const repo = getRepository();
  const [first, noVolume, sold] = await Promise.all([
    repo.search(emptyFilters(), { limit: 1 }),
    repo.unknownVolume(emptyFilters(), 1),
    repo.search(emptyFilters(), { limit: 1, statuses: ["vendida"] }),
  ]);
  const now = repo.now();
  const card1 = first.items[0];
  const card2 = noVolume.items[0] ?? card1;
  const card3 = sold.items[0] ?? card1;

  return (
    <main className={`container ${styles.page}`}>
      <div>
        <div className={styles.kicker}>Sistema visual · v1</div>
        <div className={styles.logo}>
          <Logo size={72} />
        </div>
        <p className={styles.lead}>
          Reboard · Atlantic Blue. Petróleo para la estructura, turquesa para navegar y seleccionar, y amarillo arena solo
          para la acción principal. Titulares en Barlow Condensed; todo lo que se lee (precios, litros, filtros) en Barlow,
          y las medidas técnicas en mono.
        </p>
      </div>

      <section>
        <h2 className={styles.h2}>Color</h2>
        <div className={styles.swatches}>
          {SWATCHES.map(([n, c, u]) => (
            <div key={n} className={styles.swatch}>
              <div className={styles.swatchColor} style={{ background: c }} />
              <div className={styles.swatchBody}>
                <div className={styles.swatchName}>{n}</div>
                <div className={styles.swatchHex}>{c}</div>
                <div className={styles.swatchUse}>{u}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.h2}>Tipografía</h2>
        <div className={`${styles.box} ${styles.type}`}>
          <div className={styles.display}>Barlow Condensed 800</div>
          <div className={styles.displaySm}>Títulos de sección · 24–32 px</div>
          <div className={styles.body}>
            Barlow 400–700 para interfaz y texto. 15–16 px en cuerpo, 13 px en metadatos. Nunca menos de 12 px.
          </div>
          <div className={styles.monoBig}>7&apos;2&quot; · 47 L · 21 1/2&quot; · 2 7/8&quot;</div>
          <div className={styles.note}>IBM Plex Mono para medidas, litros, contadores y rangos.</div>
        </div>
      </section>

      <section>
        <h2 className={styles.h2}>Controles</h2>
        <div className={`${styles.box} ${styles.row}`}>
          <button type="button" className={`${ui.btnPrimary} ${styles.bigBtn}`}>
            Primario · Buscar tablas
          </button>
          <button type="button" className={`${ui.btnStrong} ${styles.bigBtn}`}>
            Secundario fuerte · Crear alerta
          </button>
          <button type="button" className={`${ui.btnNeutral} ${styles.bigBtn}`}>
            Neutro
          </button>
          <button type="button" className={`${styles.bigBtn} ${styles.disabledBtn}`} disabled>
            Deshabilitado
          </button>
          <button type="button" className={ui.chip} aria-pressed="true">
            Chip activo
          </button>
          <button type="button" className={ui.chip} aria-pressed="false">
            Chip
          </button>
          <span className={ui.chipApplied}>Filtro aplicado ✕</span>
          <input className={`${ui.input} ${styles.input}`} placeholder="Input · 48 px" aria-label="Ejemplo de campo" />
        </div>
      </section>

      <section>
        <h2 className={styles.h2}>Distintivos y estados</h2>
        <div className={`${styles.box} ${styles.badges}`}>
          <span className={styles.state}>
            <span className={styles.stateDot} style={{ background: "var(--rb-success)" }} />
            Disponible · confirmada hace 2 días
          </span>
          <span className={styles.state}>
            <span className={styles.stateDot} style={{ background: "var(--rb-warning)" }} />
            Pendiente de confirmar
          </span>
          <span className={ui.offBadge}>Vendida</span>
          <span className={ui.proBadge}>Tienda</span>
          <span className={ui.proBadge}>Escuela</span>
          <span className={styles.fitBadge}>Te encaja</span>
          <span className={`${styles.src} ${styles.srcSeller}`}>Confirmado por vendedor</span>
          <span className={`${styles.src} ${styles.srcMaker}`}>Según fabricante · variante confirmada</span>
          <span className={`${styles.src} ${styles.srcNone}`}>Sin indicar</span>
        </div>
      </section>

      {card1 && (
        <section>
          <h2 className={`${styles.h2} ${styles.h2Tight}`}>Tarjeta de anuncio</h2>
          <p className={styles.sub}>
            Vertical en escritorio; horizontal en móvil para comparar precio y medidas de un vistazo. Fotos reales del
            vendedor, fondo neutro, tabla entera.
          </p>
          <div className={styles.cards}>
            <ListingCard listing={card1} now={now} hereZone="" layout="vertical" />
            {card2 && <ListingCard listing={card2} now={now} hereZone="" layout="vertical" />}
            <div className={styles.cardCol}>
              <ListingCard listing={card1} now={now} hereZone="" layout="horizontal" />
              {card3 && <ListingCard listing={card3} now={now} hereZone="" layout="horizontal" />}
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className={styles.h2}>Espaciado, bordes y sombras</h2>
        <div className={styles.two}>
          <div>
            <strong>Escala 4 px:</strong> 4 · 8 · 12 · 16 · 24 · 32 · 56. Secciones de la home separadas 56 px. Áreas
            táctiles mínimas de 44 px.
          </div>
          <div>
            <strong>Bordes, no sombras:</strong> 1 px #D6E4E3 en tarjetas, radio de 12–16 px. La única sombra es la del
            buscador de la home. Iconos de trazo de 2 px, solo funcionales.
          </div>
        </div>
      </section>
    </main>
  );
}
