import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToastButton } from "@/components/shops/ShopIslands";
import { SHOP_TYPE_LABEL, shopPath, shopPlace } from "@/components/shops/shops";
import { AlertButton } from "@/components/user/islands";
import { getRepository } from "@/lib/data";
import { ago, daysBetween } from "@/lib/domain/format";
import { zoneLabel } from "@/lib/domain/taxonomy";
import { toQuery, withFilters } from "@/lib/search/filters";
import { absoluteUrl, OG_BASE } from "@/lib/site";
import { unsplash } from "@/lib/images";
import ui from "@/styles/ui.module.css";
import styles from "@/components/shops/Shops.module.css";

export async function generateStaticParams() {
  const shops = await getRepository().shops();
  // Cache Components exige al menos un parámetro: sin tiendas, un marcador que da 404.
  return shops.length ? shops.map((s) => ({ slug: s.slug })) : [{ slug: "sin-tiendas" }];
}

async function shop(slug: string) {
  const s = (await getRepository().shops()).find((x) => x.slug === slug);
  if (!s) notFound();
  return s;
}

export async function generateMetadata({ params }: PageProps<"/tiendas/[slug]">): Promise<Metadata> {
  const s = await shop((await params).slug);
  const kind = s.type === "escuela" ? "Escuela de surf" : "Tienda de surf";
  const title = `${s.name} (${s.town}): tablas de surf de segunda mano`;
  const description = `${kind} en ${shopPlace(s)}. Tablas usadas disponibles, dirección y horario.`;
  const path = shopPath(s);
  return {
    title,
    description,
    alternates: { canonical: path, languages: { "es-ES": path } },
    openGraph: { ...OG_BASE, title, description, url: path, images: [{ url: unsplash(s.image, 1200) }] },
  };
}

export default async function ShopPage({ params }: PageProps<"/tiendas/[slug]">) {
  const s = await shop((await params).slug);
  const repo = getRepository();
  const listings = await repo.shopListings(s.slug);
  const now = await repo.now();
  const lastConfirmed = listings.length ? Math.min(...listings.map((l) => daysBetween(l.confirmedAt, now))) : null;
  const zone = zoneLabel(s.zone);
  const label = SHOP_TYPE_LABEL[s.type];

  // No hay filtro por tienda en /buscar: la alerta cubre las tablas de tiendas (o escuelas) de su zona.
  // Ver el informe: se recomienda añadir un filtro por vendedor profesional.
  const alertFilters = withFilters({ zone: s.zone, sellers: [s.type] });
  const shopsIn = `${s.type === "escuela" ? "escuelas" : "tiendas"} en ${zone}`;
  const alertLabel = `Tablas de ${shopsIn}`;

  return (
    <main className={`container ${styles.page}`}>
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Tiendas y escuelas", href: "/tiendas" },
        ]}
        current={{ label: s.name, href: shopPath(s) }}
      />
      <div className={styles.profile}>
        <div className={styles.hero}>
          <Image src={unsplash(s.image, 1200)} alt="" fill sizes="(max-width: 759px) 100vw, 50vw" preload />
          {/* Las tiendas aún no tienen foto propia (rowToShop usa una de stock): la etiqueta es cierta en demo y en real. */}
          <span className={styles.stockTag}>foto ilustrativa</span>
        </div>
        <div className={styles.panel}>
          <div className={styles.badgeRow}>
            <span className={ui.proBadge}>{label}</span>
            {repo.isDemo ? (
              <span className={ui.demoTag}>perfil ficticio · demo</span>
            ) : (
              <span className={styles.badgeNote}>Perfil profesional</span>
            )}
          </div>
          <h1 className={ui.h1}>{s.name}</h1>
          <div className={styles.facts}>
            <div>
              <span className={styles.factK}>Dirección · </span>
              {s.address}
            </div>
            <div>
              <span className={styles.factK}>Horario · </span>
              {s.hours}
            </div>
            <div>
              <span className={styles.factK}>Tablas en venta · </span>
              {s.inventorySource}
              {lastConfirmed != null ? ` · disponibilidad confirmada ${ago(lastConfirmed)}` : ""}
            </div>
          </div>
          <div className={styles.actions}>
            {/* Las tiendas aún no tienen teléfono en el modelo: sin dato, no hay botón de contacto (solo en demo, explicado). */}
            {repo.isDemo && (
              <ToastButton
                className={`${ui.btnStrong} ${styles.contactBtn}`}
                text={`Demo: ${s.name} es un perfil ficticio y no tiene teléfono. Con datos reales, «Contactar» solo aparece si la tienda tiene teléfono.`}
              >
                Contactar
              </ToastButton>
            )}
            {repo.isDemo ? (
              <>
                <ToastButton className={`${ui.btnNeutral} ${styles.secondaryBtn}`} text="Demo: aquí iría el enlace a la web de la tienda.">
                  Web
                </ToastButton>
                <ToastButton className={`${ui.btnNeutral} ${styles.secondaryBtn}`} text="Demo: la dirección es ficticia, así que no abrimos el mapa.">
                  Cómo llegar
                </ToastButton>
              </>
            ) : (
              <a
                className={`${ui.btnNeutral} ${styles.secondaryBtn}`}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.address}, ${s.town}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cómo llegar
              </a>
            )}
          </div>
        </div>
      </div>

      <section className={styles.inventory} aria-labelledby="inventario-title">
        <div className={styles.invHead}>
          <h2 id="inventario-title" className={styles.h2}>
            Tablas usadas disponibles ({listings.length})
          </h2>
          <AlertButton text={alertLabel} query={toQuery(alertFilters)} className={styles.textBtn}>
            Crear alerta: tablas de {shopsIn}
          </AlertButton>
        </div>
        {listings.length > 0 ? (
          <div className={styles.grid}>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} now={now} hereZone="" layout="responsive" />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            Esta {s.type} no tiene tablas usadas publicadas ahora mismo.
          </div>
        )}
      </section>

      {/* Con datos DEMO las tiendas son ficticias: no se publican como negocios reales. */}
      {!repo.isDemo && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": s.type === "tienda" ? "SportingGoodsStore" : "LocalBusiness",
            name: s.name,
            url: absoluteUrl(shopPath(s)),
            image: unsplash(s.image, 1200),
            address: {
              "@type": "PostalAddress",
              streetAddress: s.address,
              addressLocality: s.town,
              addressRegion: zone,
              addressCountry: "ES",
            },
          }}
        />
      )}
    </main>
  );
}
