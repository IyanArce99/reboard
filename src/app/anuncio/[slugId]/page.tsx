import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AvailabilityDot } from "@/components/listing/AvailabilityDot";
import {
  BackLink,
  ContactBar,
  ContactButton,
  ContactProvider,
  FitNotice,
  ReportButton,
  ShareButton,
} from "@/components/listing/Contact";
import { Gallery } from "@/components/listing/Gallery";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlertButton, CompareButton, SaveTextButton } from "@/components/user/islands";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { CONDITION_LABEL, CONSTRUCTION_INFO, SELLER_LABEL, SHAPE_INFO, slugify } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { eur, fmtIn, inToCm } from "@/lib/domain/format";
import {
  availability,
  idFromSlugId,
  isOff,
  listingPath,
  listingShortLabel,
  listingTitle,
  sourceBadge,
  zoneName,
} from "@/lib/listing/present";
import { alertText } from "@/lib/search/describe";
import { toQuery, withFilters } from "@/lib/search/filters";
import { landingPath } from "@/lib/search/landings";
import { absoluteUrl } from "@/lib/site";
import ui from "@/styles/ui.module.css";
import styles from "@/components/listing/Ficha.module.css";

const UNAVAILABLE: Partial<Record<Listing["status"], [string, string]>> = {
  vendida: ["Esta tabla ya se ha vendido", "El vendedor la marcó como vendida. Te mostramos alternativas con medidas parecidas."],
  caducada: ["Este anuncio ha caducado", "El vendedor no confirmó la disponibilidad en 30 días. Puede que ya no esté a la venta."],
  retirada: ["Anuncio retirado", "El vendedor retiró este anuncio."],
};

export async function generateStaticParams() {
  const params = await getRepository().listingParams();
  // Cache Components exige al menos un parámetro: con la base vacía, un marcador que da 404.
  return params.length ? params.map((l) => ({ slugId: `${l.slug}-${l.id}` })) : [{ slugId: "sin-anuncios-a0" }];
}

async function load(slugId: string) {
  const id = idFromSlugId(slugId);
  const l = id ? await getRepository().byId(id) : null;
  if (!l) notFound();
  if (`${l.slug}-${l.id}` !== slugId) permanentRedirect(listingPath(l));
  return l;
}

export async function generateMetadata({ params }: PageProps<"/anuncio/[slugId]">): Promise<Metadata> {
  const l = await load((await params).slugId);
  const vol = l.volume.value != null ? ` · ${l.volume.value} L` : "";
  const title = `${listingTitle(l)}${vol} · ${eur(l.price)} en ${zoneName(l)}`;
  const description = `${SHAPE_INFO[l.shape].label} ${CONSTRUCTION_INFO[l.construction].short}, ${CONDITION_LABEL[l.condition].toLowerCase()}, en ${l.town}. Contacto directo con el vendedor, sin comisiones.`;
  return {
    title,
    description,
    alternates: { canonical: listingPath(l), languages: { "es-ES": listingPath(l) } },
    openGraph: { title, description, url: listingPath(l), images: l.photos[0] ? [{ url: l.photos[0].url }] : undefined },
  };
}

export default async function FichaPage({ params }: PageProps<"/anuncio/[slugId]">) {
  const l = await load((await params).slugId);
  const repo = getRepository();
  const [names, similar, sameSeller] = await Promise.all([getCatalogNames(repo), repo.similar(l, 4), repo.countBySeller(l)]);
  const now = await repo.now();

  const title = listingTitle(l);
  const off = isOff(l);
  const av = availability(l, now, true);
  const unavailable = UNAVAILABLE[l.status];
  const vol = l.volume.value;
  const len = l.length.value;
  const width = l.width.value;
  const thick = l.thickness.value;
  const isModel = Boolean(l.brand && l.modelSlug);


  const similarFilters = withFilters({
    shapes: [l.shape],
    volMin: vol != null ? Math.round(vol - 5) : null,
    volMax: vol != null ? Math.round(vol + 5) : null,
    zone: l.zone,
  });

  const keySpecs = [
    { k: "Longitud", v: l.sizeLabel, s: len != null ? `${inToCm(len)} cm` : "" },
    { k: "Volumen", v: vol != null ? `${vol} L` : "—", s: vol != null ? (l.volume.source === "manufacturer" ? "según fabricante" : "del vendedor") : "sin indicar", unknown: vol == null },
    { k: "Ancho", v: width != null ? fmtIn(width) : "—", s: thick != null ? `grosor ${fmtIn(thick)}` : "" },
  ];

  const rows: { k: string; v: string | null; src: Listing["volume"]["source"] }[] = [
    { k: "Longitud", v: len != null ? `${l.sizeLabel} · ${inToCm(len)} cm` : null, src: l.length.source },
    { k: "Anchura", v: width != null ? `${fmtIn(width)} · ${(width * 2.54).toFixed(1)} cm` : null, src: l.width.source },
    { k: "Grosor", v: thick != null ? `${fmtIn(thick)} · ${(thick * 2.54).toFixed(1)} cm` : null, src: l.thickness.source },
    { k: "Volumen", v: vol != null ? `${vol} L` : null, src: l.volume.source },
    { k: "Forma", v: SHAPE_INFO[l.shape].label, src: l.shapeSource },
    { k: "Construcción", v: CONSTRUCTION_INFO[l.construction].label, src: l.constructionSource },
    { k: "Quillas", v: l.fins.value, src: l.fins.source },
    { k: "Accesorios", v: l.accessories.value, src: l.accessories.source },
  ];

  const nearText = `${l.town}, ${zoneName(l)}${l.distanceKm != null ? ` · a ${l.distanceKm} km` : ""}`;
  const message = `Hola ${l.seller.name}, he visto tu ${title} en Reboard por ${eur(l.price)}. ¿Sigue disponible? ¿Cuándo podría verla?`;
  const url = absoluteUrl(listingPath(l));

  return (
    <ContactProvider data={{ sellerName: l.seller.name, message, phone: l.contact.phone, unavailable: off }}>
      <main className={`container ${styles.page}`}>
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: SHAPE_INFO[l.shape].plural, href: landingPath(null, l.shape) },
          ]}
          current={{ label: zoneName(l), href: landingPath(l.zone, l.shape) }}
        />
        <div className={styles.backRow}>
          <BackLink fallback={landingPath(null, l.shape)} className={styles.back} />
        </div>

        {unavailable && (
          <div className={styles.unavail} role="status">
            <div>
              <div className={styles.unavailTitle}>{unavailable[0]}</div>
              <div className={styles.unavailText}>{unavailable[1]}</div>
            </div>
            <div className={styles.unavailActions}>
              <a href="#similares" className={ui.btnStrong}>
                Ver {similar.length} alternativas
              </a>
              <AlertButton text={alertText(similarFilters, names)} query={toQuery(similarFilters)} className={styles.unavailAlert}>
                Avísame de una similar
              </AlertButton>
            </div>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.gallery}>
            <Gallery photos={l.photos} title={title} off={off} isDemo={l.isDemo} />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTop}>
              <div>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{eur(l.price)}</span>
                  {l.previousPrice && <s className={styles.oldPrice}>{eur(l.previousPrice)}</s>}
                </div>
                <h1 className={styles.title}>{title}</h1>
              </div>
              {l.seller.type !== "particular" && <span className={ui.proBadge}>{SELLER_LABEL[l.seller.type]}</span>}
            </div>
            <div className={styles.keySpecs}>
              {keySpecs.map((k) => (
                <div key={k.k}>
                  <div className={styles.keyK}>{k.k}</div>
                  <div className={styles.keyV} data-unknown={k.unknown || undefined}>
                    {k.v}
                  </div>
                  <div className={styles.keyS}>{k.s}</div>
                </div>
              ))}
            </div>
            <div className={styles.summary}>
              {SHAPE_INFO[l.shape].label} · {CONSTRUCTION_INFO[l.construction].label} · {CONDITION_LABEL[l.condition]}
              <br />
              <span>{nearText}</span>
            </div>
            <div className={styles.avail}>
              <AvailabilityDot tone={av.tone} size={9} />
              {av.text}
            </div>
            <FitNotice volume={vol} />
            <ContactButton className={styles.contact} />
            <div className={styles.actions}>
              <SaveTextButton id={l.id} className={styles.action} />
              <ShareButton url={url} className={styles.action} />
              <CompareButton id={l.id} label={listingShortLabel(l)} className={styles.action} />
            </div>
            <div className={styles.safety}>
              No pagues señales ni por adelantado. Ve a ver la tabla en persona antes de pagar. <ReportButton className={styles.report} />
            </div>
          </div>

          <div className={styles.details}>
            <section>
              <h2 className={styles.h2}>Datos técnicos</h2>
              <p className={styles.sub}>Cada dato indica de dónde sale. Nunca mostramos medidas estimadas como verificadas.</p>
              <dl className={styles.specTable}>
                {rows.map((r) => {
                  const badge = sourceBadge(r.v, r.src);
                  return (
                    <div key={r.k} className={styles.specRow}>
                      <dt>{r.k}</dt>
                      <dd className={styles.specV} data-unknown={r.v == null || undefined}>
                        {r.v ?? "Sin indicar"}
                      </dd>
                      <dd className={styles.badge} data-tone={badge.tone}>
                        {badge.text}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
            <section>
              <h2 className={styles.h2}>Reparaciones y desperfectos</h2>
              <div className={styles.repairs} data-has={l.repairs ? true : undefined}>
                {l.repairs ?? "El vendedor indica que la tabla no tiene reparaciones ni entradas de agua."}
              </div>
            </section>
            <section>
              <h2 className={styles.h2}>Descripción del vendedor</h2>
              <p className={styles.desc}>{l.description}</p>
            </section>
            <section className={styles.twoCards}>
              <div className={styles.card}>
                <div className={ui.label}>Vendedor</div>
                <div className={styles.seller}>
                  <span className={styles.avatar} aria-hidden="true">
                    {l.seller.name[0]}
                  </span>
                  <div>
                    <div className={styles.sellerName}>{l.seller.name}</div>
                    <div className={styles.sellerMeta}>
                      {SELLER_LABEL[l.seller.type]}
                      {sameSeller > 1 ? ` · ${sameSeller} anuncios activos` : ""}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.card}>
                <div className={ui.label}>Ficha técnica del modelo</div>
                <div className={styles.modelText}>
                  {isModel
                    ? `${l.brand} ${l.model} — variante ${l.sizeLabel} confirmada por el vendedor.`
                    : "Tabla artesanal sin modelo de catálogo. Las medidas son las que indica el vendedor."}
                </div>
                {isModel && (
                  <Link href={`/marcas/${slugify(l.brand!)}/${l.modelSlug}`} className={styles.modelLink}>
                    Ver todas las medidas del modelo →
                  </Link>
                )}
              </div>
            </section>
            <section className={styles.before}>
              <strong>Antes de comprar.</strong> Reboard no gestiona pagos ni envíos. Queda en un sitio público, revisa cantos, fondo y cajas de quillas, y paga al recoger. Desconfía de quien pida señal, envío por mensajería o pagos por adelantado.
            </section>
          </div>
        </div>

        <section id="similares" className={styles.similar} aria-labelledby="similar-title">
          <h2 id="similar-title" className={styles.similarTitle}>
            Tablas similares
          </h2>
          <div className={styles.similarGrid}>
            {similar.map((x) => (
              <ListingCard key={x.id} listing={x} now={now} hereZone={l.zone} layout="responsive" />
            ))}
          </div>
        </section>
      </main>

      <ContactBar price={eur(l.price)} specs={`${l.sizeLabel} · ${vol != null ? `${vol} L` : "litros s/i"}`} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: title,
          url,
          image: l.photos.map((p) => p.url),
          description: l.description,
          ...(l.brand ? { brand: { "@type": "Brand", name: l.brand } } : {}),
          ...(l.model ? { model: l.model } : {}),
          offers: {
            "@type": "Offer",
            price: l.price,
            priceCurrency: "EUR",
            itemCondition: "https://schema.org/UsedCondition",
            availability: off ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
            url,
            seller: { "@type": l.seller.type === "particular" ? "Person" : "Organization", name: l.seller.name },
          },
          additionalProperty: [
            { "@type": "PropertyValue", name: "Longitud", value: l.sizeLabel },
            ...(vol != null ? [{ "@type": "PropertyValue", name: "Volumen", value: vol, unitText: "L" }] : []),
            { "@type": "PropertyValue", name: "Construcción", value: CONSTRUCTION_INFO[l.construction].label },
          ],
        }}
      />
    </ContactProvider>
  );
}
