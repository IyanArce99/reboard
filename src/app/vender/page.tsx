import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import ui from "@/styles/ui.module.css";
import styles from "@/components/publish/SellLanding.module.css";

// Landing de venta indexable (docs/SEO.md). Con datos DEMO hereda el noindex global del layout.
export const metadata: Metadata = {
  title: "Vende tu tabla de surf usada gratis",
  description:
    "Publica tu tabla de surf de segunda mano gratis y sin comisión, desde el móvil. Contacto directo por WhatsApp o teléfono con quien la busca.",
  alternates: { canonical: "/vender" },
};

const BENEFITS = [
  ["Gratis y sin comisión", "Publicar no cuesta nada y no nos quedamos con parte de la venta."],
  [
    "Contacto directo",
    "Quien la quiera te escribe por WhatsApp o te llama. No gestionamos pagos ni envíos: enseñas la tabla en persona.",
  ],
  ["Te encuentran por sus medidas", "Litros, medidas, tipo y ubicación: tu tabla sale a quien busca exactamente eso."],
  ["Registro al final", "Empiezas por las fotos. Solo te pedimos verificar el teléfono al final, antes de publicar."],
] as const;

const STEPS = [
  "Fotos: hazlas con el móvil o elígelas de la galería.",
  "La tabla: marca, modelo y medida del catálogo, o pega las medidas que tengas escritas.",
  "Tipo y estado: forma, construcción, estado y reparaciones.",
  "Precio, zona y cómo quieres que te contacten.",
  "Revisa cómo se verá y verifica tu teléfono.",
];

export default function VenderPage() {
  const isDemo = getRepository().isDemo;
  return (
    <main className={`container ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.kicker}>Vender tu tabla</div>
        <h1 className={ui.h1}>Vende tu tabla de surf usada</h1>
        <p className={styles.lead}>
          Su próximo surfista ya la está buscando. Publícala gratis desde el móvil, sin comisión.
        </p>
        <div className={styles.ctas}>
          <Link href="/vender/publicar" className={styles.cta}>
            Publicar gratis
          </Link>
          <Link href="/panel" className={styles.secondary}>
            Ya tengo anuncios: ir a mi panel
          </Link>
        </div>
        {isDemo && (
          <p className={styles.demo}>
            <span className={ui.demoTag}>DEMO</span> Reboard está en fase de demostración: puedes probar el formulario, pero
            todavía no publica anuncios reales.
          </p>
        )}
      </section>

      <section aria-labelledby="vender-por-que" className={styles.block}>
        <h2 id="vender-por-que" className={styles.h2}>
          Por qué venderla en Reboard
        </h2>
        <ul className={styles.benefits}>
          {BENEFITS.map(([t, d]) => (
            <li key={t} className={styles.benefit}>
              <h3 className={styles.h3}>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="vender-como" className={styles.block}>
        <h2 id="vender-como" className={styles.h2}>
          Cómo se publica
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s}>
              <span className={styles.num} aria-hidden="true">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          Cada 14 días te pediremos que confirmes que sigue disponible; si no lo confirmas, el anuncio caduca a los 30.
        </p>
        <Link href="/vender/publicar" className={styles.cta}>
          Publicar gratis
        </Link>
      </section>
    </main>
  );
}
