import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { authEnabled } from "@/lib/auth/config";
import { noindexRobots } from "@/lib/seo";
import { TrackOnMount } from "@/components/analytics/TrackOnMount";
import { priceBand } from "@/lib/analytics/events";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlertButton, CompareButton, CompareLink, SaveTextButton } from "@/components/user/islands";
import { compareItemOf } from "@/lib/compare/compare";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { CONDITION_HELP, CONDITION_LABEL, CONSTRUCTION_INFO, SELLER_LABEL, SHAPE_INFO, slugify } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { eur, fmtIn, inToCm, litres } from "@/lib/domain/format";
import {
  availability,
  idFromSlugId,
  isOff,
  isReserved,
  PUBLIC_SAVES_MIN,
  listingPath,
  listingTitle,
  postedText,
  sellerName,
  soldBy,
  zoneName,
} from "@/lib/listing/present";
import { alertText } from "@/lib/search/describe";
import { toQuery, withFilters } from "@/lib/search/filters";
import { landingPath } from "@/lib/search/landings";
import { absoluteUrl, OG_BASE } from "@/lib/site";
import ui from "@/styles/ui.module.css";
import styles from "@/components/listing/Ficha.module.css";
import { PageFlag } from "@/components/layout/PageFlag";

function HeartSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ verticalAlign: "-2px" }}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

const UNAVAILABLE: Partial<Record<Listing["status"], [string, string]>> = {
  vendida: ["Esta tabla ya se ha vendido", "El vendedor la ha marcado como vendida. Abajo tienes tablas con medidas parecidas."],
  caducada: ["Este anuncio ha caducado", "El vendedor no confirmó en 30 días que seguía a la venta. Puede que ya no la tenga."],
  retirada: ["Anuncio retirado", "El vendedor ha quitado este anuncio."],
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
  // Redirección TEMPORAL a la URL actual: si al editar cambia el slug y durante unos segundos alguna
  // caché aún tiene el anterior, una 308 quedaba guardada en el navegador y el viejo y el nuevo se
  // redirigían el uno al otro en bucle (QA-2, auditoría 24-10-2026). El canonical ya da la URL buena.
  if (`${l.slug}-${l.id}` !== slugId) redirect(listingPath(l));
  return l;
}

export async function generateMetadata({ params }: PageProps<"/anuncio/[slugId]">): Promise<Metadata> {
  const l = await load((await params).slugId);
  const vol = l.volume.value != null ? ` · ${litres(l.volume.value)}` : "";
  const title = `${listingTitle(l)}${vol} · ${eur(l.price)} en ${zoneName(l)}`;
  // Sin doble punto cuando la localidad acaba en abreviatura («Las Palmas de G.C.»).
  const description = `${SHAPE_INFO[l.shape].label} ${CONSTRUCTION_INFO[l.construction].short}, ${CONDITION_LABEL[l.condition].toLowerCase()}, en ${l.town.replace(/\.$/, "")}. Contacto directo con el vendedor, sin comisiones.`;
  return {
    title,
    description,
    alternates: { canonical: listingPath(l), languages: { "es-ES": listingPath(l) } },
    openGraph: { ...OG_BASE, title, description, url: listingPath(l), ...(l.photos[0] ? { images: [{ url: l.photos[0].url }] } : {}) },
    // Vendida, caducada o retirada: la URL sigue (con alternativas parecidas), pero noindex para
    // que no aparezca en Google una tabla que ya no se puede comprar. Sale también del sitemap.
    ...(isOff(l) ? { robots: noindexRobots() } : {}),
  };
}

export default async function FichaPage({ params }: PageProps<"/anuncio/[slugId]">) {
  const l = await load((await params).slugId);
  const repo = getRepository();
  const [names, similar, sameSeller, saves] = await Promise.all([
    getCatalogNames(repo),
    repo.similar(l, 4),
    repo.countBySeller(l),
    repo.saveCount(l.id),
  ]);
  const now = await repo.now();

  const title = listingTitle(l);
  const off = isOff(l);
  const av = availability(l, now);
  const reserved = isReserved(l, now);
  // Guardados: solo desde 3 y en anuncios a la venta (sin presión falsa ni «1 persona»).
  const showSaves = !off && saves >= PUBLIC_SAVES_MIN;
  const unavailable = UNAVAILABLE[l.status];
  const vol = l.volume.value;
  const len = l.length.value;
  const width = l.width.value;
  const thick = l.thickness.value;
  const isModel = Boolean(l.brand && l.modelSlug);
  const hasDescription = l.description.trim().length > 0;

  const similarFilters = withFilters({
    shapes: [l.shape],
    volMin: vol != null ? Math.round(vol - 5) : null,
    volMax: vol != null ? Math.round(vol + 5) : null,
    zone: l.zone,
  });

  const keySpecs = [
    { k: "Longitud", v: l.sizeLabel, s: len != null ? `${inToCm(len)} cm` : "" },
    { k: "Litros", v: vol != null ? litres(vol) : "—", s: vol != null ? (l.volume.source === "manufacturer" ? "según el fabricante" : "según el vendedor") : "sin indicar", unknown: vol == null },
    { k: "Anchura", v: width != null ? fmtIn(width) : "—", s: thick != null ? `grosor ${fmtIn(thick)}` : "" },
  ];

  // Medidas (tarjetas) y características (lista). Cada dato conserva su origen: se marca «Fabricante»
  // cuando la medida es del catálogo; lo demás lo indica el vendedor (nota al pie de la sección).
  const cmText = (inches: number) => `${(inches * 2.54).toFixed(1).replace(".", ",")} cm`;
  const measures: { k: string; v: string | null; sub: string; src: Listing["volume"]["source"] }[] = [
    { k: "Longitud", v: len != null ? l.sizeLabel : null, sub: len != null ? `${inToCm(len)} cm` : "", src: l.length.source },
    { k: "Anchura", v: width != null ? fmtIn(width) : null, sub: width != null ? cmText(width) : "", src: l.width.source },
    { k: "Grosor", v: thick != null ? fmtIn(thick) : null, sub: thick != null ? cmText(thick) : "", src: l.thickness.source },
    { k: "Volumen", v: vol != null ? litres(vol) : null, sub: "", src: l.volume.source },
  ];
  const features: { k: string; v: string | null; src: Listing["volume"]["source"] }[] = [
    { k: "Tipo", v: SHAPE_INFO[l.shape].label, src: l.shapeSource },
    { k: "Construcción", v: CONSTRUCTION_INFO[l.construction].label, src: l.constructionSource },
    { k: "Quillas", v: l.fins.value, src: l.fins.source },
    { k: "Accesorios", v: l.accessories.value, src: l.accessories.source },
  ];
  // Origen: si todo viene del mismo sitio basta con una nota; la etiqueta «Fabricante» solo distingue
  // los datos de catálogo cuando se mezclan con los del vendedor.
  const known = [...measures, ...features].filter((x) => x.v != null);
  const fromMaker = known.filter((x) => x.src === "manufacturer").length;
  const mixed = fromMaker > 0 && fromMaker < known.length;
  const makerTag = (x: { v: string | null; src: Listing["volume"]["source"] }) => mixed && x.v != null && x.src === "manufacturer";

  const nearText = `${l.town}, ${zoneName(l)}${l.distanceKm != null ? ` · a ${l.distanceKm} km` : ""}`;
  // «tu evolutiva sin marca…»: sin mayúscula a mitad de frase cuando el título empieza por el tipo.
  const inSentence = l.brand ? title : title.charAt(0).toLowerCase() + title.slice(1);
  const seller = sellerName(l);
  const by = soldBy(l);
  const message = `Hola${seller ? ` ${seller}` : ""}, he visto tu ${inSentence} en Reboard por ${eur(l.price)}. ¿Sigue disponible? ¿Cuándo podría verla?`;
  const url = absoluteUrl(listingPath(l));

  const similarSection = (
    <section id="similares" className={styles.similar} data-top={off || undefined} aria-labelledby="similar-title">
      <h2 id="similar-title" className={styles.similarTitle}>
        {off ? "Tablas parecidas a la venta" : "Tablas parecidas"}
      </h2>
      <div className={styles.similarGrid}>
        {similar.map((x) => (
          <ListingCard key={x.id} listing={x} now={now} hereZone={l.zone} layout="responsive" />
        ))}
      </div>
    </section>
  );

  return (
    <ContactProvider
      data={{
        sellerName: seller ?? "",
        message,
        phone: l.contact.phone,
        method: l.contact.method === "phone" ? "phone" : "whatsapp",
        channels: l.contact.channels,
        title: listingTitle(l),
        // «Vendida», «Caducada» o «Retirada» en el botón desactivado.
        unavailable: off ? av.text : null,
        reserved,
        listingId: l.id,
        live: authEnabled(),
        analytics: { shape: l.shape, island: l.zone, price_band: priceBand(l.price) },
      }}
    >
      <main className={`container ${styles.page}`}>
        {/* Su acción principal es contactar: el «Vender» de la cabecera va en contorno (globals.css). */}
        <PageFlag flag="cta-other" />
        {/* Analítica: ficha vista (categorías; sin id, vendedor ni localidad). */}
        <TrackOnMount
          id={l.id}
          event="listing_viewed"
          props={{
            shape: l.shape,
            construction: l.construction,
            island: l.zone,
            price_band: priceBand(l.price),
            seller_type: l.seller.type,
            photos: l.photos.length,
            available: !off,
          }}
        />
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: SHAPE_INFO[l.shape].plural, href: landingPath(null, l.shape) },
            { label: zoneName(l), href: landingPath(l.zone, l.shape) },
          ]}
          current={{ label: title, href: listingPath(l) }}
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
              <AlertButton text={alertText(similarFilters, names)} query={toQuery(similarFilters)} className={styles.unavailAlert}>
                Guardar búsqueda de tablas parecidas
              </AlertButton>
            </div>
          </div>
        )}

        {/* No disponible: lo útil son las alternativas, justo aquí (antes estaban al final de la página). */}
        {off && similar.length > 0 && similarSection}

        <div className={styles.grid}>
          <div className={styles.gallery}>
            <Gallery photos={l.photos} title={title} off={off} isDemo={l.isDemo} shape={l.shape} />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTop}>
              <div>
                <div className={styles.priceRow}>
                  <span className={styles.price} data-off={off || undefined}>{off ? `Pedía ${eur(l.price)}` : eur(l.price)}</span>
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
            {showSaves && (
              <div className={styles.saves}>
                <HeartSmall /> {saves} personas la tienen guardada
              </div>
            )}
            <div className={styles.soldBy}>
              {off ? "La vendía" : "Lo vende"} {by.name ? <strong>{by.name}</strong> : by.rest}
              {by.name && by.rest} · {postedText(l, now).toLowerCase()}
            </div>
            {!off && <FitNotice volume={vol} />}
            {!off && <ContactButton className={styles.contact} />}
            {!off && (
              <div className={styles.actions}>
                <SaveTextButton id={l.id} className={styles.action} />
                <ShareButton url={url} title={listingTitle(l)} text={`${listingTitle(l)} · ${eur(l.price)} en ${zoneName(l)}, en Reboard`} className={styles.action} />
                <CompareButton item={compareItemOf(l)} name={listingTitle(l)} className={styles.action} />
              </div>
            )}
            {/* En móvil la barra de comparación no se muestra en la ficha (ya está la de contacto). */}
            {!off && <CompareLink className={styles.compareLink} />}
            {!off && (
              <div className={styles.safety}>
                No pagues nada por adelantado, ni siquiera una señal. Ve a ver la tabla antes de pagar. <ReportButton className={styles.report} />
              </div>
            )}
          </div>

          <div className={styles.details}>
            <section aria-labelledby="tabla-title">
              <h2 id="tabla-title" className={styles.h2}>
                La tabla
              </h2>
              <dl className={styles.measures}>
                {measures.map((m) => (
                  <div key={m.k} className={styles.measure} data-unknown={m.v == null || undefined}>
                    <dt>{m.k}</dt>
                    <dd className={styles.measureV}>{m.v ?? "Sin indicar"}</dd>
                    {m.sub && <dd className={styles.measureSub}>{m.sub}</dd>}
                    {makerTag(m) && <dd className={styles.maker}>Fabricante</dd>}
                  </div>
                ))}
              </dl>
              <dl className={styles.features}>
                {features.map((f) => (
                  <div key={f.k} className={styles.feature}>
                    <dt>{f.k}</dt>
                    <dd data-unknown={f.v == null || undefined}>
                      {f.v ?? "Sin indicar"}
                      {makerTag(f) && <span className={styles.maker}>Fabricante</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className={styles.sourceNote}>
                {mixed
                  ? "«Fabricante»: dato de la ficha técnica oficial del modelo. El resto lo indica el vendedor; si algo no cuadra, pregúntale."
                  : fromMaker > 0
                    ? "Medidas de la ficha técnica del fabricante para este modelo."
                    : "Datos que indica el vendedor. Si algo no cuadra, pregúntale antes de ir a verla."}
              </p>
            </section>

            <section aria-labelledby="estado-title">
              <h2 id="estado-title" className={styles.h2}>
                Estado
              </h2>
              <div className={styles.condition}>
                <div className={styles.conditionHead}>
                  <span className={styles.conditionName}>{CONDITION_LABEL[l.condition]}</span>
                  <span className={styles.conditionHelp}>{CONDITION_HELP[l.condition]}</span>
                </div>
                {l.repairs ? (
                  <div className={styles.repairs}>
                    <strong>Reparaciones que indica el vendedor</strong>
                    <p>{l.repairs}</p>
                  </div>
                ) : (
                  <p className={styles.noRepairs}>El vendedor no indica reparaciones. Revísala igualmente cuando la veas.</p>
                )}
              </div>
            </section>

            {hasDescription && (
              <section aria-labelledby="desc-title">
                <h2 id="desc-title" className={styles.h2}>
                  {seller ? `Lo que cuenta ${seller}` : "Lo que cuenta el vendedor"}
                </h2>
                <blockquote className={styles.desc}>{l.description}</blockquote>
              </section>
            )}
            <section className={styles.twoCards}>
              <div className={styles.card}>
                <div className={ui.label}>Vendedor</div>
                <div className={styles.seller}>
                  <span className={styles.avatar} aria-hidden="true">
                    {(seller ?? SELLER_LABEL[l.seller.type])[0]}
                  </span>
                  <div>
                    <div className={styles.sellerName}>{seller ?? SELLER_LABEL[l.seller.type]}</div>
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
                    ? `${l.brand} ${l.model} en ${l.sizeLabel}. El vendedor ha elegido esta medida del catálogo del fabricante.`
                    : l.brand
                      ? `${l.brand}, un modelo que no está en nuestro catálogo. Las medidas las indica el vendedor.`
                      : "Tabla sin marca o de un shaper local. Las medidas las indica el vendedor."}
                </div>
                {isModel && (
                  <Link href={`/marcas/${slugify(l.brand!)}/${l.modelSlug}`} className={styles.modelLink}>
                    Ver todas las medidas del modelo →
                  </Link>
                )}
              </div>
            </section>
            {!off && (
            <section className={styles.before} aria-labelledby="antes-title">
              <h2 id="antes-title" className={styles.beforeTitle}>
                Antes de comprar
              </h2>
              <ul>
                <li>Queda en un sitio público y mira la tabla con calma.</li>
                <li>Revisa cantos, fondo y cajas de quillas. Presiona la cubierta: no debe ceder.</li>
                <li>Paga cuando te la lleves. Desconfía si te piden una señal, que pagues por adelantado o que te la envíen por mensajería.</li>
              </ul>
              <p>
                Reboard no gestiona pagos ni envíos.{" "}
                <Link href="/guias/que-revisar-al-comprar-una-tabla-usada">Qué revisar en una tabla usada →</Link>
              </p>
            </section>
            )}
          </div>
        </div>

        {!off && similarSection}
      </main>

      <ContactBar
        price={off ? `Pedía ${eur(l.price)}` : eur(l.price)}
        specs={`${l.sizeLabel} · ${vol != null ? litres(vol) : "sin litros"}`}
        offLink={off && similar.length ? { href: "#similares", label: "Ver parecidas" } : undefined}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: title,
          url,
          ...(l.photos.length ? { image: l.photos.map((p) => p.url) } : {}),
          ...(hasDescription ? { description: l.description } : {}),
          ...(l.brand ? { brand: { "@type": "Brand", name: l.brand } } : {}),
          ...(l.model ? { model: l.model } : {}),
          offers: {
            "@type": "Offer",
            price: l.price,
            priceCurrency: "EUR",
            itemCondition: "https://schema.org/UsedCondition",
            availability: off ? "https://schema.org/SoldOut" : reserved ? "https://schema.org/Reserved" : "https://schema.org/InStock",
            url,
            seller: { "@type": l.seller.type === "particular" ? "Person" : "Organization", name: seller ?? SELLER_LABEL[l.seller.type] },
          },
          additionalProperty: [
            { "@type": "PropertyValue", name: "Longitud", value: l.sizeLabel },
            ...(vol != null ? [{ "@type": "PropertyValue", name: "Litros", value: vol, unitText: "L" }] : []),
            { "@type": "PropertyValue", name: "Construcción", value: CONSTRUCTION_INFO[l.construction].label },
          ],
        }}
      />
    </ContactProvider>
  );
}
