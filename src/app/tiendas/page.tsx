import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ShopDirectory, ToastButton } from "@/components/shops/ShopIslands";
import { SHOP_TYPE_LABEL, isOfShop, shopPath, shopPlace, usedBoards } from "@/components/shops/shops";
import { getRepository } from "@/lib/data";
import { unsplash } from "@/mocks/demo-inventory";
import ui from "@/styles/ui.module.css";
import styles from "@/components/shops/Shops.module.css";

const TITLE = "Tiendas y escuelas";
const DESCRIPTION =
  "Tiendas de surf y escuelas con tablas de segunda mano: su inventario completo, horarios y contacto. Sus tablas aparecen también en todas las búsquedas.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tiendas", languages: { "es-ES": "/tiendas" } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tiendas" },
};

export default async function ShopsPage() {
  const repo = getRepository();
  const [shops, active] = await Promise.all([repo.shops(), repo.active()]);

  const cards = shops.map((s) => ({
    key: s.slug,
    type: s.type,
    node: (
      <Link href={shopPath(s)} className={styles.card}>
        <div className={styles.cardImg}>
          <Image src={unsplash(s.image, 600)} alt="" fill sizes="(max-width: 759px) 100vw, 320px" />
          <span className={`${ui.proBadge} ${styles.typeBadge}`}>{SHOP_TYPE_LABEL[s.type]}</span>
        </div>
        <div className={styles.cardBody}>
          <span className={styles.cardName}>{s.name}</span>
          <span className={styles.cardMeta}>{shopPlace(s)}</span>
          <span className={styles.cardMeta}>{s.hours}</span>
          <span className={styles.cardCount}>{usedBoards(active.filter((l) => isOfShop(l, s)).length)}</span>
        </div>
      </Link>
    ),
  }));

  return (
    <main className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} current={{ label: TITLE, href: "/tiendas" }} />
      <div className={styles.head}>
        <div>
          <h1 className={ui.h1}>{TITLE}</h1>
          <p className={styles.intro}>
            Sus tablas usadas aparecen junto a las de particulares en todas las búsquedas. Aquí puedes ver su inventario
            completo, horarios y contacto.
          </p>
        </div>
        <ToastButton
          className={`${ui.btnOutline} ${styles.joinBtn}`}
          text="Alta profesional: subida por CSV, feed autorizado o carga asistida por nuestro equipo. El alta aún no está abierta."
        >
          Añadir mi tienda o escuela
        </ToastButton>
      </div>
      <ShopDirectory cards={cards} />
    </main>
  );
}
