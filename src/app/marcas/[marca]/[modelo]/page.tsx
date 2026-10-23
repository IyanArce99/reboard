import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardShape } from "@/components/brand/BoardShape";
import { brandPath, modelPath, sizeIndexOf } from "@/components/catalog/catalog";
import { ModelSizes, type ModelSizeView } from "@/components/catalog/ModelSizes";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { getRepository } from "@/lib/data";
import { CONSTRUCTION_INFO, SHAPE_INFO, slugify } from "@/lib/domain/taxonomy";
import { fmtIn, inToCm } from "@/lib/domain/format";
import { listingPath, listingTitle } from "@/lib/listing/present";
import { searchHref, toQuery, withFilters } from "@/lib/search/filters";
import { absoluteUrl, OG_BASE } from "@/lib/site";
import styles from "@/components/catalog/Catalog.module.css";

/** Foto de stock del prototipo: aquí irá la foto autorizada de la marca. */

export async function generateStaticParams() {
  const catalog = await getRepository().catalog();
  // Cache Components exige al menos un parámetro: con el catálogo vacío, un marcador que da 404.
  return catalog.length ? catalog.map((m) => ({ marca: slugify(m.brand), modelo: m.slug })) : [{ marca: "sin-marcas", modelo: "sin-modelos" }];
}

async function model(marca: string, modelo: string) {
  const m = (await getRepository().catalog()).find((x) => slugify(x.brand) === marca && x.slug === modelo);
  if (!m) notFound();
  return m;
}

const vol = (v: number | null) => (v == null ? "litros sin publicar" : `${v.toLocaleString("es-ES")} L`);

export async function generateMetadata({ params }: PageProps<"/marcas/[marca]/[modelo]">): Promise<Metadata> {
  const { marca, modelo } = await params;
  const m = await model(marca, modelo);
  const title = `${m.brand} ${m.model}: medidas, litros y segunda mano`;
  const sizes = m.sizes.map((s) => `${s.label} (${vol(s.volume)})`).join(", ");
  const description = `${SHAPE_INFO[m.shape].label} ${CONSTRUCTION_INFO[m.construction].short} de ${m.brand}. Medidas del catálogo: ${sizes}. Tablas de segunda mano en venta en cada medida.`;
  const path = modelPath(m);
  return {
    title,
    description,
    alternates: { canonical: path, languages: { "es-ES": path } },
    openGraph: { ...OG_BASE, title, description, url: path },
  };
}

export default async function ModelPage({ params }: PageProps<"/marcas/[marca]/[modelo]">) {
  const { marca, modelo } = await params;
  const m = await model(marca, modelo);
  const repo = getRepository();
  const brandSlug = slugify(m.brand);
  const used = (await repo.search(withFilters({ brand: brandSlug, model: m.slug }), { sort: "recientes", limit: 1000 })).items;
  const now = await repo.now();
  const desc = m.description ?? `${SHAPE_INFO[m.shape].label} de ${m.brand} en construcción ${CONSTRUCTION_INFO[m.construction].short}.`;

  const sizes: ModelSizeView[] = m.sizes.map((s, i) => {
    const units = used.filter((l) => sizeIndexOf(l, m) === i);
    const f = withFilters({ brand: brandSlug, model: m.slug, lenMin: s.lengthIn, lenMax: s.lengthIn });
    return {
      label: s.label,
      lengthCm: inToCm(s.lengthIn),
      width: fmtIn(s.widthIn),
      thick: fmtIn(s.thickIn),
      volume: s.volume,
      volumeText: vol(s.volume),
      count: units.length,
      cards: units.map((l) => <ListingCard key={l.id} listing={l} now={now} hereZone="" layout="responsive" />),
      alert: { text: `${m.brand} ${m.model} ${s.label} de segunda mano, en toda España`, query: toQuery(f) },
    };
  });

  const sourceNote = repo.isDemo
    ? "Fuente: tabla de medidas del fabricante (datos de demostración)."
    : "Fuente: tabla de medidas del fabricante.";

  return (
    <main className={`container ${styles.page}`}>
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: m.brand, href: brandPath(brandSlug) },
        ]}
        current={{ label: m.model, href: modelPath(m) }}
      />
      <ModelSizes
        brand={m.brand}
        model={m.model}
        sizes={sizes}
        sourceNote={sourceNote}
        total={used.length}
        allHref={searchHref(withFilters({ brand: brandSlug, model: m.slug }))}
        photo={
          <div className={styles.photo}>
            <BoardShape shape={m.shape} size={300} title={`Silueta orientativa (${SHAPE_INFO[m.shape].short.toLowerCase()})`} />
            <span className={styles.stockTag}>Silueta orientativa ({SHAPE_INFO[m.shape].short.toLowerCase()})</span>
          </div>
        }
        intro={
          <>
            <h1 className={styles.title}>
              {m.brand} {m.model}
            </h1>
            <div className={styles.tags}>
              <span className={styles.tagShape}>{SHAPE_INFO[m.shape].label}</span>
              <span className={styles.tagCons}>{CONSTRUCTION_INFO[m.construction].label}</span>
            </div>
            <p className={styles.desc}>{desc}</p>
          </>
        }
      />
      {used.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${m.brand} ${m.model} de segunda mano`,
            itemListElement: used.map((l, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(listingPath(l)),
              name: listingTitle(l),
            })),
          }}
        />
      )}
    </main>
  );
}
