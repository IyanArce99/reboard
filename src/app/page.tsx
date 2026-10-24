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
import { absoluteUrl, SITE_NAME, OG_BASE } from "@/lib/site";
import styles from "@/components/home/Home.module.css";

const DESCRIPTION =
  "Compra y vende tablas de surf de segunda mano en Canarias, en todas las islas. Busca por litros, medidas, tipo e isla y habla directamente con quien vende, sin comisiones.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/", languages: { "es-ES": "/" } },
  openGraph: { ...OG_BASE, url: "/", description: DESCRIPTION },
};

// Tipos de tabla con su silueta. Softboard es una construcción y «principiantes» una necesidad:
// se dibujan con la forma más habitual y en tono suave para distinguirlos.
const CATEGORIES: { label: string; form: LandingForm; shape: Shape; soft?: boolean; hint: string }[] = [
  { label: "Evolutivas", form: "evolutiva", shape: "evolutiva", hint: "Para salir de la softboard" },
  { label: "Softboards", form: "softboard", shape: "evolutiva", soft: true, hint: "De espuma, para aprender" },
  { label: "Para principiantes", form: "principiantes", shape: "longboard", soft: true, hint: "55 L o más" },
  { label: "Longboards", form: "longboard", shape: "longboard", hint: "Olas pequeñas y estilo" },
  { label: "Midlengths", form: "midlength", shape: "midlength", hint: "Remada fácil, surf fluido" },
  { label: "Fish", form: "fish", shape: "fish", hint: "Rápidas en olas pequeñas" },
  { label: "Híbridas", form: "hibrida", shape: "hibrida", hint: "Para progresar en maniobras" },
  { label: "Shortboards", form: "shortboard", shape: "shortboard", hint: "Para olas con fuerza" },
];

const STEPS = [
  { n: "01", t: "Filtra por lo que importa", d: "Litros, longitud, tipo, precio e isla. En cada medida ves de dónde sale: del vendedor, del fabricante o «sin indicar»." },
  { n: "02", t: "Escribe o llama a quien vende", d: "Por WhatsApp o por teléfono, sin intermediarios. Reboard no se lleva comisión." },
  { n: "03", t: "Mírala bien antes de pagar", d: "Quedad en un sitio público, revisa cantos, fondo y quillas, y paga en mano al llevártela. Nunca por adelantado." },
];

const GUIDES: { t: string; d: string; href: string; photo: PhotoSlug }[] = [
  {
    t: "Qué revisar al comprar una tabla usada",
    d: "Golpes, reparaciones, zonas blandas y quillas: qué puedes pasar por alto y qué no.",
    href: "/guias/que-revisar-al-comprar-una-tabla-usada",
    photo: "tablas-usadas-quillas",
  },
  {
    t: "Cuántos litros necesitas",
    d: "Siete preguntas sobre tu peso, tu nivel y tus olas, y un rango orientativo de litros.",
    href: "/calculadora-litros",
    photo: "clase-surf",
  },
  {
    t: "Compara antes de decidir",
    d: "Pon hasta cuatro tablas una al lado de otra: litros, medidas, estado, precio e isla.",
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
  // cada tarjeta y da más peso a publicar. Las islas y marcas solo se listan si tienen tablas.
  const inventoryEmpty = facets.anyZone === 0;
  const cats = catFilters.map((c, i) => ({ ...c, n: catCounts[i] })).sort((a, b) => Number(b.n > 0) - Number(a.n > 0));
  const zones = ZONES.map((z) => ({ ...z, n: facets.zones[z.slug] ?? 0 }))
    .filter((z) => z.n > 0)
    .sort((a, b) => b.n - a.n);
  const brands = [...names.brands, { slug: NO_BRAND.slug, name: NO_BRAND.short }]
    .map((b) => ({ ...b, n: facets.brands[b.slug] ?? 0 }))
    .filter((b) => b.n > 0);
  const shortcut = (href: string, icon: React.ReactNode, title: string, text: string) => (
    <Link key={href} href={href} className={styles.shortcut}>
      <span className={styles.shortcutIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.shortcutText}>
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <span className={styles.shortcutArrow} aria-hidden="true">
        →
      </span>
    </Link>
  );
  const sellLink = shortcut(
    "/vender/publicar",
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>,
    "Vende tu tabla",
    "Gratis y sin comisiones",
  );
  const calcLink = shortcut(
    "/calculadora-litros",
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M12 15l4-5" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </svg>,
    "¿Cuántos litros?",
    "Calcúlalo en 7 preguntas",
  );

  return (
    <main>
      {/* ───────── Hero ───────── */}
      <div className={styles.heroWrap}>
        <div className={styles.heroPhoto}>
          <Photo slug="hero-surfistas-orilla" sizes="100vw" preload position="62% 55%" decorative />
        </div>
        <section className={`container ${styles.hero}`}>
          <p className={styles.kicker}>Compra y vende en todas las islas</p>
          <h1 className={styles.h1}>
            Tablas de surf{" "}
            <br />
            <span>de segunda mano</span> en&nbsp;Canarias
          </h1>
          <p className={styles.lead}>
            Tablas de surfistas, tiendas y escuelas. Filtra por litros, medidas e isla y habla directamente con quien vende. Sin comisiones.
          </p>

          <Suspense fallback={<div className={styles.searchSkeleton} />}>
            <HeroSearch />
          </Suspense>

          <nav className={styles.shortcuts} aria-label="Accesos rápidos">
            {/* Mientras no hay tablas publicadas, vender va primero. */}
            {inventoryEmpty ? [sellLink, calcLink] : [calcLink, sellLink]}
          </nav>
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
              title="De surfista a surfista"
              lead="Reboard te ayuda a encontrar la tabla. El trato lo cerráis tú y quien la vende."
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
            <span className={styles.promoTitle}>Acierta con los litros</span>
            <span className={styles.promoText}>
              Cuéntanos tu peso, tu nivel, qué olas surfeas y qué quieres mejorar. Te damos un rango orientativo de litros y las tablas publicadas que entran en ese rango.
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
              Publícala gratis desde el móvil en 5 pasos. Quien busque esas medidas te escribirá o te llamará directamente.
            </span>
            <span className={styles.promoCtaSell}>Publicar mi tabla</span>
          </span>
        </Link>
      </section>

      {/* ───────── Explorar ───────── */}
      <section className={`container ${styles.section}`} aria-labelledby="guias-title">
        <SectionHeader id="guias-title" eyebrow="Antes de comprar" title="Elige bien tu tabla" action={{ href: "/guias", label: "Guías y herramientas" }} />
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
        <section className={`container ${styles.section} ${styles.explore}`} aria-label="Explorar por isla y marca">
          {zones.length > 0 && (
            <div>
              <h2 className={styles.h3}>Por isla</h2>
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
              logo: absoluteUrl("/brand/reboard-icon-512.png"),
              description: DESCRIPTION,
              // Lanzamiento solo en Canarias (LAUNCH en src/lib/domain/taxonomy.ts).
              areaServed: { "@type": "AdministrativeArea", name: "Islas Canarias" },
            },
          ],
        }}
      />
    </main>
  );
}
