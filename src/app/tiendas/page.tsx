import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/brand/EmptyState";
import { Photo } from "@/components/brand/Photo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ShopDirectory } from "@/components/shops/ShopIslands";
import { SHOP_TYPE_LABEL, shopPath, shopPlace, usedBoards } from "@/components/shops/shops";
import { getRepository } from "@/lib/data";
import { unsplash } from "@/lib/images";
import ui from "@/styles/ui.module.css";
import styles from "@/components/shops/Shops.module.css";

const TITLE = "Tiendas y escuelas";
const DESCRIPTION =
  "Tiendas de surf y escuelas con tablas de segunda mano: sus tablas usadas, su dirección y su horario. Sus tablas aparecen también en todas las búsquedas.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tiendas", languages: { "es-ES": "/tiendas" } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tiendas" },
};

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
              Sus tablas usadas aparecen junto a las de particulares en todas las búsquedas. Aquí ves sus tablas usadas, su
              dirección y su horario.
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
            Cuando se den de alta, verás aquí sus tablas usadas, su dirección y su horario. Mientras tanto, las tablas de
            particulares están en la búsqueda.
          </EmptyState>
        )}
      </div>
    </main>
  );
}
