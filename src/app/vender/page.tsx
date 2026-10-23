import type { Metadata } from "next";
import Link from "next/link";
import { authEnabled } from "@/lib/auth/config";
import { Photo } from "@/components/brand/Photo";
import { SectionHeader } from "@/components/brand/SectionHeader";
import styles from "@/components/publish/SellLanding.module.css";

// Landing de venta indexable (docs/SEO.md). Con datos DEMO hereda el noindex global del layout.
export const metadata: Metadata = {
  title: "Vende tu tabla de surf usada gratis",
  description:
    "Publica gratis tu tabla de surf de segunda mano desde el móvil, sin comisiones. Quien la quiera te escribe por WhatsApp o te llama.",
  alternates: { canonical: "/vender" },
};

const BENEFITS = [
  ["Gratis y sin comisión", "Publicar no cuesta nada y no nos llevamos ningún porcentaje de la venta."],
  ["Tratas directamente con el comprador", "Te escribe por WhatsApp o te llama. Sin intermediarios: el pago y la entrega los acordáis entre vosotros."],
  ["Te encuentran por medidas", "Litros, longitud, tipo e isla: tu tabla le sale a quien busca justo eso."],
  ["Sin registrarte antes", "Empiezas por las fotos. La cuenta se crea al final, con tu email, justo antes de publicar."],
] as const;

const STEPS = [
  ["Fotos", "Con el móvil o desde la galería. La tabla entera por arriba y por abajo, y los detalles: quillas, cantos y reparaciones."],
  ["La tabla", "Marca, modelo y medida del catálogo, o las medidas que tengas apuntadas. Luego, el tipo de tabla y la construcción."],
  ["Estado", "Cómo está, qué golpes o reparaciones tiene y lo que quieras añadir. Si lo cuentas todo, te ahorras mensajes y viajes en balde."],
  ["Precio y ubicación", "Cuánto pides, en qué localidad se puede ver y cómo prefieres que te contacten."],
  ["Revisar", "Ves cómo quedará el anuncio, confirmas tu email y lo publicas."],
] as const;

const TIPS = [
  "Fotos con luz natural y la tabla entera: es lo primero que se mira.",
  "Pon los litros si los sabes. Es el dato por el que más se busca.",
  "Cuenta las reparaciones, aunque sean pequeñas. Da confianza y evita sorpresas cuando quedéis.",
  "Pon un precio realista: mira cuánto piden por tablas parecidas en la ficha de su modelo.",
];

export default function VenderPage() {
  // Sin base de datos no se puede publicar: se dice antes de entrar al formulario.
  const closed = !authEnabled();
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
              ¿Lleva meses en el garaje? Publícala gratis desde el móvil en cinco pasos y que la encuentre quien busca justo esas medidas.
            </p>
            <div className={styles.ctas}>
              <Link href="/vender/publicar" className={styles.cta}>
                Publicar mi tabla
              </Link>
              {!closed && (
                <Link href="/panel" className={styles.secondary}>
                  Ver mis anuncios
                </Link>
              )}
            </div>
            {closed && (
              <p className={styles.demo}>
                Todavía no se puede publicar: puedes recorrer el formulario para ver cómo es, pero no se guarda ningún anuncio.
              </p>
            )}
          </div>
          <div className={styles.heroPhoto}>
            <Photo slug="tabla-usada-tarima" sizes="(max-width: 759px) 100vw, 40vw" preload position="50% 45%" />
          </div>
        </div>
      </section>

      <section className={`container ${styles.block}`} aria-labelledby="vender-por-que">
        <SectionHeader id="vender-por-que" eyebrow="Por qué aquí" title="Solo tablas de surf, nada más" />
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
              Después, entra en «Mis anuncios» cada 14 días y confirma que la tabla sigue a la venta. Si pasan 30 días sin
              confirmarlo, el anuncio caduca. No enviamos recordatorios.
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
