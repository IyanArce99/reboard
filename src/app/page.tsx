import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import { ClosingBand } from "@/components/brand/ClosingBand";
import { Photo } from "@/components/brand/Photo";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { NearSection, NearSkeleton, getHere } from "@/components/home/NearSection";
import { SearchBar } from "@/components/search/SearchBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { NO_BRAND, ZONES, slugify, type Shape } from "@/lib/domain/taxonomy";
import type { PhotoSlug } from "@/lib/photos";
import { emptyFilters, withFilters } from "@/lib/search/filters";
import { formFilters, landingPath, type LandingForm } from "@/lib/search/landings";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import styles from "@/components/home/Home.module.css";

const DESCRIPTION =
  "Compra y vende tablas de surf de segunda mano en España. Busca por litros, medidas, tipo y zona y habla directamente con quien vende, sin comisiones.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/", languages: { "es-ES": "/" } },
  openGraph: { url: "/", description: DESCRIPTION },
};

// Tipos de tabla con su silueta. Softboard es una construcción y «principiantes» una necesidad:
// se dibujan con la forma más habitual y en tono suave para distinguirlos.
const CATEGORIES: { label: string; form: LandingForm; shape: Shape; soft?: boolean; hint: string }[] = [
  { label: "Evolutivas", form: "evolutiva", shape: "evolutiva", hint: "Para salir de la softboard" },
  { label: "Softboards", form: "softboard", shape: "evolutiva", soft: true, hint: "Espuma: aprender sin miedo" },
  { label: "Para principiantes", form: "principiantes", shape: "longboard", soft: true, hint: "55 L o más" },
  { label: "Longboards", form: "longboard", shape: "longboard", hint: "Olas pequeñas y estilo" },
  { label: "Midlengths", form: "midlength", shape: "midlength", hint: "Remada fácil, surf fluido" },
  { label: "Fish", form: "fish", shape: "fish", hint: "Rápidas en olas pequeñas" },
  { label: "Híbridas", form: "hibrida", shape: "hibrida", hint: "Para progresar en maniobras" },
  { label: "Shortboards", form: "shortboard", shape: "shortboard", hint: "Rendimiento con fuerza" },
];

const STEPS = [
  { n: "01", t: "Busca por lo que importa", d: "Litros, longitud, tipo, precio y zona. Cada medida indica su origen: el vendedor, el fabricante o «sin indicar»." },
  { n: "02", t: "Habla directamente con quien vende", d: "Un mensaje de WhatsApp o una llamada, sin intermediarios. Reboard no cobra comisión." },
  { n: "03", t: "Mírala en persona y paga al recogerla", d: "Queda en un sitio público, revisa cantos, fondo y quillas, y paga en mano. Nunca por adelantado." },
];

const GUIDES: { t: string; d: string; href: string; photo: PhotoSlug }[] = [
  {
    t: "Qué revisar al comprar una tabla usada",
    d: "Golpes, reparaciones, zonas blandas y quillas: lo que se acepta y lo que no.",
    href: "/guias/que-revisar-al-comprar-una-tabla-usada",
    photo: "tablas-usadas-quillas",
  },
  {
    t: "Cuántos litros necesitas",
    d: "Peso, nivel y olas: 7 preguntas y un rango orientativo de volumen.",
    href: "/calculadora-litros",
    photo: "clase-surf",
  },
  {
    t: "Compara antes de decidir",
    d: "Hasta cuatro tablas lado a lado: litros, medidas, estado, precio y zona.",
    href: "/comparar",
    photo: "entrando-al-agua",
  },
];

async function HeroSearch() {
  const here = await getHere();
  const repo = getRepository();
  const [count, facets] = await Promise.all([repo.count(withFilters({ zone: here })), repo.facets(emptyFilters())]);
  return (
    <SearchBar
      here={here}
      initialCount={count}
      supportsDistance={repo.capabilities.distance}
      zoneCounts={facets.zones}
      totalCount={facets.anyZone}
    />
  );
}

export default async function Home() {
  const repo = getRepository();
  const catFilters = CATEGORIES.map((c) => ({ ...c, f: withFilters(formFilters(c.form)) }));
  const [names, facets, catCounts] = await Promise.all([
    getCatalogNames(repo),
    repo.facets(emptyFilters()),
    Promise.all(catFilters.map((c) => repo.count(c.f))),
  ]);

  // Sin ninguna tabla publicada (beta sin base de datos), la página no repite «0» ni «crear alerta» en
  // cada tarjeta y da más peso a publicar. Las zonas y marcas solo se listan si tienen tablas.
  const inventoryEmpty = facets.anyZone === 0;
  const cats = catFilters.map((c, i) => ({ ...c, n: catCounts[i] })).sort((a, b) => Number(b.n > 0) - Number(a.n > 0));
  const zones = ZONES.map((z) => ({ ...z, n: facets.zones[z.slug] ?? 0 }))
    .filter((z) => z.n > 0)
    .sort((a, b) => b.n - a.n);
  const brands = [...names.brands, { slug: NO_BRAND.slug, name: NO_BRAND.short }]
    .map((b) => ({ ...b, n: facets.brands[b.slug] ?? 0 }))
    .filter((b) => b.n > 0);
  const sellLink = (
    <Link key="vender" href="/vender/publicar" className={inventoryEmpty ? styles.heroSell : undefined}>
      ¿Vendes una tabla? <span>Publícala gratis</span>
    </Link>
  );

  return (
    <main>
      {/* ───────── Hero ───────── */}
      <div className={styles.heroWrap}>
        <div className={styles.heroPhoto}>
          <Photo slug="hero-surfistas-orilla" sizes="100vw" preload position="62% 55%" decorative />
        </div>
        <section className={`container ${styles.hero}`}>
          <p className={styles.kicker}>Compraventa entre surfistas · España</p>
          <h1 className={styles.h1}>
            Tablas de surf{" "}
            <br />
            <span>de segunda mano</span>
          </h1>
          <p className={styles.lead}>
            Busca por litros, medidas y zona entre tablas de surfistas, tiendas y escuelas. Hablas directamente con quien vende,
            sin comisiones.
          </p>

          <Suspense fallback={<div className={styles.searchSkeleton} />}>
            <HeroSearch />
          </Suspense>

          <div className={styles.heroLinks}>
            {/* Mientras no hay tablas publicadas, vender va primero y más visible. */}
            {inventoryEmpty && sellLink}
            <Link href="/calculadora-litros">
              ¿No sabes cuántos litros? <span>Calcúlalo en 7 preguntas</span>
            </Link>
            {!inventoryEmpty && sellLink}
          </div>
        </section>
      </div>

      {/* ───────── Tipos de tabla ───────── */}
      <section className={`container ${styles.section}`} aria-labelledby="tipos-title">
        <SectionHeader id="tipos-title" eyebrow="Explora por tipo" title="¿Qué tipo de tabla buscas?" action={{ href: "/buscar", label: "Ver todas las tablas" }} />
        <div data-rail="1" className={styles.types}>
          {cats.map((c) => (
            // Sin anuncios, la tarjeta lleva igualmente a su página (allí se puede crear la alerta):
            // nada de «crear alerta» repetido en cada tarjeta.
            <Link key={c.form} href={landingPath(null, c.form)} className={`${styles.type} ${c.n || inventoryEmpty ? "" : styles.typeEmpty}`}>
              <span className={styles.typeShape}>
                <BoardShape shape={c.shape} size={96} tone={c.soft || (!c.n && !inventoryEmpty) ? "soft" : "light"} />
              </span>
              <span className={styles.typeName}>{c.label}</span>
              <span className={styles.typeHint}>{c.hint}</span>
              {c.n > 0 ? (
                <span className={styles.typeCount}>
                  {c.n} {c.n === 1 ? "tabla" : "tablas"}
                </span>
              ) : (
                !inventoryEmpty && <span className={styles.typeCount}>Sin anuncios todavía</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── Recién publicadas cerca ───────── */}
      <Suspense fallback={<NearSkeleton />}>
        <NearSection />
      </Suspense>

      {/* ───────── Cómo funciona ───────── */}
      <section className={styles.how} aria-labelledby="como-title">
        <div className={`container ${styles.howInner}`}>
          <div className={styles.howPhoto}>
            <Photo slug="surfista-a-coruna" sizes="(max-width: 759px) 100vw, 40vw" position="40% 50%" />
          </div>
          <div>
            <SectionHeader
              id="como-title"
              eyebrow="Cómo funciona"
              title="Compra como entre surfistas"
              lead="Reboard te ayuda a encontrar la tabla; el trato es directo entre tú y quien la vende."
            />
            <ol className={styles.steps}>
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className={styles.stepN}>{s.n}</span>
                  <div>
                    <h3 className={styles.stepT}>{s.t}</h3>
                    <p className={styles.stepD}>{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────── Asistente y vender ───────── */}
      <section className={`container ${styles.section} ${styles.promos}`}>
        <Link href="/calculadora-litros" className={styles.promo}>
          <Photo slug="aprendiendo-espuma" sizes="(max-width: 759px) 100vw, 50vw" position="50% 40%" decorative />
          <span className={styles.promoBody}>
            <span className={styles.promoEyebrow}>¿Qué tabla necesito?</span>
            <span className={styles.promoTitle}>No compres a ciegas</span>
            <span className={styles.promoText}>
              Peso, nivel, olas y lo que quieres conseguir. Te damos un rango orientativo de litros y las tablas publicadas que entran en él.
            </span>
            <span className={styles.promoCta}>Calcular mis litros →</span>
          </span>
        </Link>
        <Link href="/vender/publicar" className={`${styles.promo} ${styles.promoSell}`}>
          <Photo slug="tablas-cobertizo" sizes="(max-width: 759px) 100vw, 50vw" position="50% 35%" decorative />
          <span className={styles.promoBody}>
            <span className={styles.promoEyebrow}>Vender</span>
            <span className={styles.promoTitle}>¿Tienes una tabla parada?</span>
            <span className={styles.promoText}>
              Publícala gratis en 5 pasos desde el móvil. Quien busca esas medidas te escribe o te llama directamente.
            </span>
            <span className={styles.promoCtaSell}>Publicar mi tabla</span>
          </span>
        </Link>
      </section>

      {/* ───────── Explorar ───────── */}
      <section className={`container ${styles.section}`} aria-labelledby="guias-title">
        <SectionHeader id="guias-title" eyebrow="Antes de comprar" title="Para elegir bien" action={{ href: "/guias", label: "Guías y herramientas" }} />
        <div className={styles.guides}>
          {GUIDES.map((g) => (
            <Link key={g.href} href={g.href} className={styles.guide}>
              <span className={styles.guidePhoto}>
                <Photo slug={g.photo} sizes="(max-width: 759px) 100vw, 33vw" decorative />
              </span>
              <span className={styles.guideT}>{g.t}</span>
              <span className={styles.guideD}>{g.d}</span>
            </Link>
          ))}
        </div>
      </section>

      {(zones.length > 0 || brands.length > 0) && (
        <section className={`container ${styles.section} ${styles.explore}`} aria-label="Explorar por zona y marca">
          {zones.length > 0 && (
            <div>
              <h2 className={styles.h3}>Por zona</h2>
              <div className={styles.zones}>
                {zones.map((z) => (
                  <Link key={z.slug} href={landingPath(z.slug, null)} className={styles.zone}>
                    {z.name}
                    <span>{z.n}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {brands.length > 0 && (
            <div>
              <h2 className={styles.h3}>Por marca</h2>
              <div className={styles.brands}>
                {brands.map((b) => (
                  <Link
                    key={b.slug}
                    href={b.slug === NO_BRAND.slug ? `/buscar?marca=${NO_BRAND.slug}` : `/marcas/${slugify(b.name)}`}
                    className={styles.brand}
                  >
                    {b.name}
                    <span>{b.n}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <ClosingBand />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "@id": absoluteUrl("/#web"), name: SITE_NAME, url: absoluteUrl("/"), inLanguage: "es-ES" },
            {
              "@type": "Organization",
              "@id": absoluteUrl("/#org"),
              name: SITE_NAME,
              url: absoluteUrl("/"),
              logo: absoluteUrl("/brand/reboard-app-icon.svg"),
              description: DESCRIPTION,
            },
          ],
        }}
      />
    </main>
  );
}
