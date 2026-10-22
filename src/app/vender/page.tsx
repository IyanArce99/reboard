import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/brand/Photo";
import { SectionHeader } from "@/components/brand/SectionHeader";
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
  ["Hablas directamente", "Quien la quiera te escribe por WhatsApp o te llama. Sin chats intermedios ni pagos por la plataforma."],
  ["Te encuentran por sus medidas", "Litros, largo, tipo y zona: tu tabla aparece a quien busca exactamente eso."],
  ["Sin registrarte antes", "Empiezas por las fotos. La cuenta se crea al final, con tu email, justo antes de publicar."],
] as const;

const STEPS = [
  ["Fotos", "Con el móvil o desde la galería. La tabla entera por arriba y por abajo, y los detalles: quillas, cantos y reparaciones."],
  ["La tabla", "Marca, modelo y medida del catálogo, o escribe las medidas que tengas apuntadas."],
  ["Tipo y estado", "Forma, construcción, estado y reparaciones. Contarlo todo ahorra mensajes y viajes en balde."],
  ["Precio y zona", "Tu precio, el municipio donde se puede ver y cómo prefieres que te contacten."],
  ["Revisa y publica", "Ves cómo quedará el anuncio y confirmas tu email."],
] as const;

const TIPS = [
  "Fotos con luz natural y la tabla entera: es lo primero que se mira.",
  "Pon los litros si los sabes. Es el dato por el que más se busca.",
  "Cuenta las reparaciones, aunque sean pequeñas. Da confianza y evita sorpresas al quedar.",
  "Precio realista: mira lo que piden por tablas parecidas en la ficha de su modelo.",
];

export default function VenderPage() {
  const isDemo = getRepository().isDemo;
  return (
    <main>
      <section className={styles.heroWrap}>
        <div className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Vender tu tabla</p>
            <h1 className={styles.h1}>
              Vende tu tabla de surf <span>usada</span>
            </h1>
            <p className={styles.lead}>
              Si lleva meses parada, alguien la está buscando con esas medidas. Publícala gratis desde el móvil en cinco pasos.
            </p>
            <div className={styles.ctas}>
              <Link href="/vender/publicar" className={styles.cta}>
                Publicar gratis
              </Link>
              <Link href="/panel" className={styles.secondary}>
                Ya tengo anuncios
              </Link>
            </div>
            {isDemo && (
              <p className={styles.demo}>
                <span className={ui.demoTag}>DEMO</span> Puedes probar el formulario, pero todavía no se publican anuncios reales.
              </p>
            )}
          </div>
          <div className={styles.heroPhoto}>
            <Photo slug="tabla-usada-tarima" sizes="(max-width: 759px) 100vw, 40vw" preload position="50% 45%" />
          </div>
        </div>
      </section>

      <section className={`container ${styles.block}`} aria-labelledby="vender-por-que">
        <SectionHeader id="vender-por-que" eyebrow="Por qué aquí" title="Hecho para vender tablas, no de todo" />
        <ul className={styles.benefits}>
          {BENEFITS.map(([t, d]) => (
            <li key={t} className={styles.benefit}>
              <h3 className={styles.h3}>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.howWrap} aria-labelledby="vender-como">
        <div className={`container ${styles.how}`}>
          <div>
            <SectionHeader id="vender-como" eyebrow="Cómo se publica" title="Cinco pasos, unos minutos" />
            <ol className={styles.steps}>
              {STEPS.map(([t, d], i) => (
                <li key={t}>
                  <span className={styles.num} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className={styles.stepT}>{t}</h3>
                    <p className={styles.stepD}>{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.note}>
              Cada 14 días te pediremos que confirmes que sigue disponible. Si no lo confirmas, el anuncio caduca a los 30 días.
            </p>
            <Link href="/vender/publicar" className={styles.cta}>
              Empezar con las fotos
            </Link>
          </div>
          <aside className={styles.tips} aria-labelledby="vender-consejos">
            <div className={styles.tipsPhoto}>
              <Photo slug="tablas-usadas-quillas" sizes="(max-width: 759px) 100vw, 34vw" decorative />
            </div>
            <h3 id="vender-consejos" className={styles.tipsTitle}>
              Para que se venda antes
            </h3>
            <ul>
              {TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
