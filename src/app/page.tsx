import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { NearSection, NearSkeleton, getHere } from "@/components/home/NearSection";
import { SearchBar } from "@/components/search/SearchBar";
import { AlertButton } from "@/components/user/islands";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { NO_BRAND, ZONES, slugify } from "@/lib/domain/taxonomy";
import { alertText } from "@/lib/search/describe";
import { toQuery, withFilters } from "@/lib/search/filters";
import { brandSlugOf, countMatches } from "@/lib/search/match";
import { formFilters, landingPath, type LandingForm } from "@/lib/search/landings";
import { unsplash } from "@/lib/images";
import styles from "@/components/home/Home.module.css";

const CATEGORIES: [string, LandingForm][] = [
  ["Evolutivas", "evolutiva"],
  ["Softboards", "softboard"],
  ["Midlength", "midlength"],
  ["Longboards", "longboard"],
  ["Shortboards", "shortboard"],
  ["Fish", "fish"],
  ["Para principiantes", "principiantes"],
];

// Guías de «Antes de comprar». Solo existe la plantilla; el contenido está pendiente (docs/ROADMAP.md).
const GUIDES = [
  { t: "Qué revisar al comprar una tabla usada", href: "/guias/que-revisar-al-comprar-una-tabla-usada", img: "1632334738554-95c79fb27eb7" },
  { t: "Cuántos litros necesita mi tabla", href: "/calculadora-litros", img: "1455729552865-3658a5d39692" },
  { t: "Qué tabla comprar después de una softboard", href: "/guias/que-tabla-comprar-despues-de-una-softboard", img: "1537519646099-335112f03225" },
];

async function HeroSearch() {
  const here = await getHere();
  const active = await getRepository().active();
  return <SearchBar here={here} initialCount={countMatches(active, withFilters({ zone: here }))} />;
}

export default async function Home() {
  const repo = getRepository();
  const [active, names] = await Promise.all([repo.active(), getCatalogNames(repo)]);

  const cats = CATEGORIES.map(([label, form]) => {
    const f = withFilters(formFilters(form));
    return { label, form, f, n: countMatches(active, f) };
  }).sort((a, b) => Number(b.n > 0) - Number(a.n > 0));

  const zones = ZONES.map((z) => ({ ...z, n: active.filter((l) => l.zone === z.slug).length })).sort((a, b) => b.n - a.n);
  const brands = [...names.brands, { slug: NO_BRAND.slug, name: NO_BRAND.short }].map((b) => ({
    ...b,
    n: active.filter((l) => brandSlugOf(l) === b.slug).length,
  }));

  return (
    <main>
      <div className={styles.heroWrap}>
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroTop}>
            <div>
              <div className={styles.kicker}>Tu próxima tabla ya existe</div>
              <h1 className={styles.h1}>
                Tablas de surf
                <br />
                <span>de segunda mano</span>
              </h1>
              <p className={styles.lead}>
                Encuentra tu próxima tabla. Busca por medidas, litros, tipo y ubicación entre anuncios de surfistas y tiendas.
              </p>
            </div>
            <div className={styles.heroLinks}>
              <Link href="/calculadora-litros">
                ¿Cuántos litros necesitas? <span>Descúbrelo en 30 s</span>
              </Link>
              <Link href="/vender/publicar">
                ¿Vendes una tabla? <span>Publícala gratis</span>
              </Link>
            </div>
          </div>

          <Suspense fallback={<div className={styles.searchSkeleton} />}>
            <HeroSearch />
          </Suspense>

          <div data-rail="1" className={styles.cats}>
            <Link href="/buscar?avanzados=1" className={`${styles.cat} ${styles.mOnly}`}>
              Filtros
            </Link>
            {cats.map((c) =>
              c.n ? (
                <Link key={c.form} href={landingPath(null, c.form)} className={styles.cat}>
                  {c.label}
                  <span>{c.n}</span>
                </Link>
              ) : (
                <AlertButton key={c.form} text={alertText(c.f, names)} query={toQuery(c.f)} className={`${styles.cat} ${styles.catEmpty}`}>
                  {c.label}
                  <span>0</span>
                </AlertButton>
              ),
            )}
          </div>
        </section>
      </div>

      <Suspense fallback={<NearSkeleton />}>
        <NearSection />
      </Suspense>

      <section className={`container ${styles.promos}`}>
        <Link href="/calculadora-litros" className={styles.promo}>
          <span>
            <span className={styles.promoTitle}>¿Qué tabla necesitas?</span>
            <span className={styles.promoText}>Dinos tu peso y nivel y te enseñamos las que pueden encajarte.</span>
          </span>
          <span className={styles.promoIcon} aria-hidden="true">
            →
          </span>
        </Link>
        <Link href="/vender/publicar" className={`${styles.promo} ${styles.promoSell}`}>
          <span>
            <span className={styles.promoTitle}>¿Tienes una tabla parada?</span>
            <span className={styles.promoText}>Su próximo surfista ya la está buscando. Publícala gratis desde el móvil, sin comisión.</span>
          </span>
          <span className={styles.promoIcon} aria-hidden="true">
            +
          </span>
        </Link>
      </section>

      <section className={`container ${styles.explore}`}>
        <div>
          <h2 className={styles.h3}>Tablas de segunda mano por zona</h2>
          <div className={styles.zones}>
            {zones.map((z) => {
              const f = withFilters({ zone: z.slug });
              return z.n ? (
                <Link key={z.slug} href={landingPath(z.slug, null)} className={styles.zone}>
                  {z.name}
                  <span>{z.n}</span>
                </Link>
              ) : (
                <AlertButton key={z.slug} text={alertText(f, names)} query={toQuery(f)} className={styles.zone}>
                  {z.name}
                  <span className={styles.zoneAlert}>Avísame</span>
                </AlertButton>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className={styles.h3}>Busca por marca</h2>
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
        <div>
          <h2 className={styles.h3}>Antes de comprar</h2>
          <div className={styles.guides}>
            {GUIDES.map((g) => (
              <Link key={g.href} href={g.href} className={styles.guide}>
                <Image src={unsplash(g.img, 200)} alt="" width={56} height={44} className={styles.guideImg} />
                {g.t}
              </Link>
            ))}
          </div>
          <p className={styles.note}>
            Busca, contacta directamente con el vendedor y revisa la tabla en persona. No gestionamos pagos ni envíos.
          </p>
        </div>
      </section>
    </main>
  );
}
