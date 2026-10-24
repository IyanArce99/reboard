import Image from "next/image";
import Link from "next/link";
import { BoardShape } from "@/components/brand/BoardShape";
import { CONDITION_LABEL, SELLER_LABEL } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { eur } from "@/lib/domain/format";
import {
  availability,
  isReserved,
  consShort,
  isOff,
  listingPath,
  listingTitle,
  postedText,
  typeShort,
  volumeShort,
  zoneName,
} from "@/lib/listing/present";
import { CompareButton, FitBadge, SaveButton } from "@/components/user/islands";
import { compareItemOf } from "@/lib/compare/compare";
import { AvailabilityDot } from "./AvailabilityDot";
import ui from "@/styles/ui.module.css";
import styles from "./ListingCard.module.css";

interface Props {
  listing: Listing;
  now: Date;
  /** Zona de referencia del usuario: dentro de ella se muestra la distancia. */
  hereZone: string;
  /**
   * responsive = vertical en escritorio y horizontal en móvil (< 760 px), con UNA sola tarjeta que el
   * CSS recoloca (antes se pintaban las dos y se ocultaba una: el doble de HTML, PERF-2).
   */
  layout?: "vertical" | "horizontal" | "responsive";
  /** Solo para la imagen LCP (primera tarjeta): inserta un preload en <head>. */
  preload?: boolean;
  /** Primeras 1–2 tarjetas de una lista: foto con fetchPriority="high". */
  eager?: boolean;
  /** Vista previa al publicar: el anuncio aún no existe y sus enlaces no se precargan. */
  preview?: boolean;
}

export function ListingCard(props: Props) {
  return <Card {...props} />;
}

function Card({ listing: l, now, hereZone, layout = "vertical", preload = false, eager = false, preview = false }: Props) {
  const title = listingTitle(l);
  const href = listingPath(l);
  const prefetch = preview ? false : undefined;
  const off = isOff(l);
  const pro = l.seller.type !== "particular";
  const near = l.zone === hereZone && l.distanceKm != null;
  const av = availability(l, now);
  const reserved = isReserved(l, now);
  const photo = l.photos[0];

  if (layout === "horizontal") {
    return (
      <article className={styles.h}>
        <Link href={href} prefetch={prefetch} className={styles.hPhoto} tabIndex={-1} aria-hidden="true">
          {photo ? (
            <Image
              src={photo.url}
              alt=""
              fill
              sizes="116px"
              className={styles.img}
              data-off={off || undefined}
              fetchPriority={eager ? "high" : undefined}
            />
          ) : (
            <span className={styles.noPhoto}>
              <BoardShape shape={l.shape} size={64} />
            </span>
          )}
          {pro && <span className={`${ui.proBadge} ${styles.hPro}`}>{SELLER_LABEL[l.seller.type]}</span>}
          {off && <span className={`${ui.offBadge} ${styles.hOff}`}>{av.text}</span>}
          {!off && reserved && <span className={`${ui.reservedBadge} ${styles.hOff}`}>Reservada</span>}
        </Link>
        <div className={styles.hBody}>
          <div className={styles.hTop}>
            <div className={styles.priceRow}>
              <span className={styles.hPrice}>{eur(l.price)}</span>
              {l.previousPrice && <s className={styles.hOld}>{eur(l.previousPrice)}</s>}
            </div>
            <SaveButton id={l.id} name={title} className={styles.hSave} />
          </div>
          <h3 className={styles.hTitle}>
            <Link href={href} prefetch={prefetch} className={styles.titleLink}>
              {title}
            </Link>
          </h3>
          <div className={styles.hSpec}>
            {l.volume.value != null ? <strong>{volumeShort(l)}</strong> : <span className={styles.noVol}>{volumeShort(l)}</span>}
            <span>
              {" "}
              · {typeShort(l)} · {consShort(l)}
            </span>
          </div>
          <div className={styles.hMeta}>
            {near ? `${l.town} · ${l.distanceKm} km` : `${l.town}, ${zoneName(l)}`} · {CONDITION_LABEL[l.condition]}
          </div>
          <div className={styles.avail}>
            <AvailabilityDot tone={av.tone} />
            {av.text}
          </div>
          <div className={styles.hFoot}>
            <FitBadge volume={l.volume.value} text="Te encaja" className={styles.hFit} />
            <CompareButton item={compareItemOf(l)} name={title} className={styles.hCmp} />
          </div>
        </div>
      </article>
    );
  }

  // Vertical o responsive (la misma tarjeta; en móvil, el CSS de `.r` la pone en horizontal).
  const responsive = layout === "responsive";
  return (
    <article className={responsive ? `${styles.v} ${styles.r}` : styles.v}>
      <Link href={href} prefetch={prefetch} className={styles.vPhoto} tabIndex={-1} aria-hidden="true">
        {photo ? (
          <Image
            src={photo.url}
            alt=""
            fill
            sizes={responsive ? "(max-width: 759px) 116px, 292px" : "(max-width: 759px) 262px, 292px"}
            className={styles.img}
            data-off={off || undefined}
            preload={preload}
            fetchPriority={eager && !preload ? "high" : undefined}
          />
        ) : (
          // Sin fotos (raro: publicar exige al menos una): la silueta de su tipo, como en la ficha.
          <span className={styles.noPhoto}>
            <BoardShape shape={l.shape} size={120} />
          </span>
        )}
        <span className={styles.vBadges}>
          {pro && <span className={ui.proBadge}>{SELLER_LABEL[l.seller.type]}</span>}
          {off && <span className={ui.offBadge}>{av.text}</span>}
          {!off && reserved && <span className={ui.reservedBadge}>Reservada</span>}
        </span>
        <span className={styles.vBottom}>
          <span className={styles.km}>
            <span className={styles.kmDot} />
            {near ? `A ${l.distanceKm} km` : zoneName(l)}
          </span>
          {l.photos.length > 0 && (
            <span className={styles.count}>{l.photos.length === 1 ? "1 foto" : `${l.photos.length} fotos`}</span>
          )}
        </span>
      </Link>
      <SaveButton id={l.id} name={title} className={styles.vSave} />
      <div className={styles.vBody}>
        <div className={styles.priceRow}>
          <span className={styles.vPrice}>{eur(l.price)}</span>
          {l.previousPrice && <s className={styles.vOld}>{eur(l.previousPrice)}</s>}
        </div>
        <h3 className={styles.vTitle}>
          <Link href={href} prefetch={prefetch} className={styles.titleLink}>
            {title}
          </Link>
        </h3>
        <div className={styles.vSpec}>
          {l.volume.value != null ? <strong>{volumeShort(l)}</strong> : <span className={styles.noVol}>{volumeShort(l)}</span>}
          <span>
            {" "}
            · {typeShort(l)} · {consShort(l)}
          </span>
        </div>
        <div className={styles.vMeta}>
          {/* La isla ya va en la píldora de la foto: aquí, la localidad (y en móvil, donde no hay píldora, la isla). */}
          {l.town}
          {responsive && <span className={styles.rTown}>, {zoneName(l)}</span>} · {CONDITION_LABEL[l.condition]}
        </div>
        <div className={styles.avail}>
          <AvailabilityDot tone={av.tone} />
          {av.text}
        </div>
        <FitBadge volume={l.volume.value} className={`${ui.fitBadge} ${styles.vFit}`} />
        <div className={styles.vFoot}>
          <CompareButton item={compareItemOf(l)} name={title} className={styles.vCmp} />
          <span className={styles.vPosted}>{postedText(l, now)}</span>
        </div>
      </div>
    </article>
  );
}
