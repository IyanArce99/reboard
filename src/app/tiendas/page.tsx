import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/brand/EmptyState";
import { Photo } from "@/components/brand/Photo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ShopDirectory } from "@/components/shops/ShopIslands";
import { SHOP_TYPE_LABEL, shopPath, shopPlace, usedBoards } from "@/components/shops/shops";
import { getRepository } from "@/lib/data";
import { noindexRobots } from "@/lib/seo";
import { unsplash } from "@/lib/images";
import ui from "@/styles/ui.module.css";
import styles from "@/components/shops/Shops.module.css";
import { OG_BASE } from "@/lib/site";

const TITLE = "Tiendas y escuelas de surf";
const DESCRIPTION =
  "Tiendas de surf y escuelas de Canarias que venden tablas de segunda mano: sus tablas usadas, su dirección y su horario. Sus anuncios también salen en la búsqueda.";

export async function generateMetadata(): Promise<Metadata> {
  // Sin tiendas, la página es un estado vacío: noindex (y fuera del sitemap) hasta que haya alguna.
  const empty = (await getRepository().shops()).length === 0;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/tiendas", languages: { "es-ES": "/tiendas" } },
    openGraph: { ...OG_BASE, title: TITLE, description: DESCRIPTION, url: "/tiendas" },
    ...(empty ? { robots: noindexRobots() } : {}),
  };
}

export default async function ShopsPage() {
  const repo = getRepository();
  const shops = await repo.shops();
  const shopCounts = await Promise.all(shops.map(async (s) => (await repo.shopListings(s.slug)).length));

  const cards = shops.map((s, i) => ({
    key: s.slug,
    type: s.type,
    node: (
      <Link href={shopPath(s)} className={styles.card}>
        <div className={styles.cardImg}>
          <Image src={unsplash(s.image, 600)} alt="" fill sizes="(max-width: 759px) 100vw, 320px" />
          <span className={`${ui.proBadge} ${styles.typeBadge}`}>{SHOP_TYPE_LABEL[s.type]}</span>
        </div>
        <div className={styles.cardBody}>
          <h2 className={styles.cardName}>{s.name}</h2>
          <span className={styles.cardMeta}>{shopPlace(s)}</span>
          <span className={styles.cardMeta}>{s.hours}</span>
          <span className={styles.cardCount}>{usedBoards(shopCounts[i])}</span>
        </div>
      </Link>
    ),
  }));

  return (
    <main>
      <div className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} current={{ label: TITLE, href: "/tiendas" }} />
            <p className={styles.eyebrow}>Profesionales</p>
            <h1 className={styles.title}>{TITLE}</h1>
            <p className={styles.intro}>
              Tiendas de surf y escuelas de Canarias que venden tablas usadas: sus tablas, su dirección y su horario. Sus anuncios también salen en la búsqueda, junto a
              los de particulares.
            </p>
            <p className={styles.joinNote}>El alta de tiendas y escuelas aún no está abierta.</p>
          </div>
          <div className={styles.heroPhoto}>
            <Photo slug="tablas-alquiler" sizes="(max-width: 759px) 100vw, 40vw" preload />
          </div>
        </div>
      </div>
      <div className={`container ${styles.page}`}>
        {cards.length ? (
          <ShopDirectory cards={cards} />
        ) : (
          // Sin establecimientos todavía: ni filtros vacíos ni huecos, un estado honesto con lo que sí se puede hacer.
          <EmptyState
            title="Todavía no hay tiendas ni escuelas"
            actions={
              <Link href="/buscar" className={ui.btnPrimary}>
                Ver tablas
              </Link>
            }
          >
            Cuando se den de alta, verás aquí sus tablas usadas, su dirección y su horario. Mientras tanto, puedes ver las
            tablas de particulares en la búsqueda.
          </EmptyState>
        )}
      </div>
    </main>
  );
}
