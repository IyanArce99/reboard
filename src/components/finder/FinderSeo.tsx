import Link from "next/link";
import { FACTORS, exampleRows, initialFinderState, recommend } from "@/lib/finder/recommend";
import styles from "./Finder.module.css";

const LINKS: [string, string][] = [
  ["Evolutivas", "/tablas/evolutiva"],
  ["Softboards", "/tablas/softboard"],
  ["Longboards", "/tablas/longboard"],
  ["Midlengths", "/tablas/midlength"],
  ["Guía: qué revisar al comprar una tabla usada", "/guias/que-revisar-al-comprar-una-tabla-usada"],
];

/**
 * Contenido SEO bajo el asistente, siempre visible (docs/SEO.md). Textos del prototipo;
 * los ejemplos se calculan con la misma función que el asistente.
 */
const dec = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

export function FinderSeo() {
  // Referencia calculada con la misma lógica del asistente (FACTORS), para que el texto no se desvíe.
  const [learnLo, learnHi] = FACTORS.learn;
  const ex = recommend({ ...initialFinderState(), w: "75", lvl: "learn" })!;
  return (
    <section className={styles.seo} aria-labelledby="finder-seo">
      <div className={styles.seoText}>
        <h2 id="finder-seo" className={styles.seoTitle}>
          Cómo interpretar los litros y las medidas
        </h2>
        <p>
          El volumen (en litros) indica cuánto flota una tabla. Más litros dan más estabilidad y remada; menos litros, más
          respuesta en los giros. La longitud, la anchura y el grosor reparten ese volumen: dos tablas de 47 L pueden
          comportarse distinto si una es una evolutiva de 7&apos;2&quot; y otra una fish de 6&apos;0&quot;.
        </p>
        <p>
          Como referencia, quien aprende suele ir con entre {dec(learnLo)} y {dec(learnHi)} litros por kilo de peso (con 75 kg,
          unos {ex.lo}–{ex.hi} L), y quien surfea a nivel avanzado, con algo menos de la mitad de su peso.
        </p>
        <p>
          El asistente calcula un rango orientativo a partir de tu peso y tu nivel, y lo ajusta según la frecuencia con la que
          surfeas, el tipo de ola y tu objetivo. Si nos dices los litros de tu tabla actual, no te propone bajar más de un 20 %
          de golpe.
        </p>
      </div>
      <div>
        <h3 className={styles.seoSub}>Ejemplos orientativos</h3>
        <table className={styles.examples}>
          <caption className={styles.srOnly}>Volumen orientativo según peso y nivel</caption>
          <thead className={styles.srOnly}>
            <tr>
              <th scope="col">Peso y nivel</th>
              <th scope="col">Volumen orientativo</th>
            </tr>
          </thead>
          <tbody>
            {exampleRows().map((e) => (
              <tr key={e.label}>
                <th scope="row">{e.label}</th>
                <td>{e.range}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.seoLinks}>
          {LINKS.map(([l, href]) => (
            <Link key={href} href={href} className={styles.seoLink}>
              {l}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
