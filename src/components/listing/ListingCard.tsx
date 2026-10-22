import Image from "next/image";
import Link from "next/link";
import { CONDITION_LABEL, SELLER_LABEL } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { eur } from "@/lib/domain/format";
import {
  availability,
  consShort,
  isOff,
  listingPath,
  listingShortLabel,
  listingTitle,
  postedText,
  typeShort,
  volumeShort,
  zoneName,
} from "@/lib/listing/present";
import { CompareButton, FitBadge, SaveButton } from "@/components/user/islands";
import { AvailabilityDot } from "./AvailabilityDot";
import ui from "@/styles/ui.module.css";
import styles from "./ListingCard.module.css";

interface Props {
  listing: Listing;
  now: Date;
  /** Zona de referencia del usuario: dentro de ella se muestra la distancia. */
  hereZone: string;
  /** responsive = vertical en escritorio y horizontal en móvil (< 760 px). */
  layout?: "vertical" | "horizontal" | "responsive";
  /** Solo para la imagen LCP (primera tarjeta). */
  preload?: boolean;
}

export function ListingCard(props: Props) {
  if (props.layout === "responsive") {
    return (
      <>
        <div className={styles.onlyD}>
          <ListingCard {...props} layout="vertical" />
        </div>
        <div className={styles.onlyM}>
          <ListingCard {...props} layout="horizontal" preload={false} />
        </div>
      </>
    );
  }
  return <Card {...props} />;
}

function Card({ listing: l, now, hereZone, layout = "vertical", preload = false }: Props) {
  const title = listingTitle(l);
  const href = listingPath(l);
  const off = isOff(l);
  const pro = l.seller.type !== "particular";
  const near = l.zone === hereZone && l.distanceKm != null;
  const av = availability(l, now);
  const photo = l.photos[0];

  if (layout === "horizontal") {
    return (
      <article className={styles.h}>
        <Link href={href} className={styles.hPhoto} tabIndex={-1} aria-hidden="true">
          {photo && (
            <Image src={photo.url} alt="" fill sizes="116px" className={styles.img} data-off={off || undefined} />
          )}
          {pro && <span className={`${ui.proBadge} ${styles.hPro}`}>{SELLER_LABEL[l.seller.type]}</span>}
          {off && <span className={`${ui.offBadge} ${styles.hOff}`}>{av.text}</span>}
        </Link>
        <div className={styles.hBody}>
          <div className={styles.hTop}>
            <div className={styles.priceRow}>
              <span className={styles.hPrice}>{eur(l.price)}</span>
              {l.previousPrice && <s className={styles.hOld}>{eur(l.previousPrice)}</s>}
            </div>
            <SaveButton id={l.id} className={styles.hSave} />
          </div>
          <Link href={href} className={styles.hTitle}>
            {title}
          </Link>
          <div className={styles.hSpec}>
            <strong>{volumeShort(l)}</strong>
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
            <CompareButton id={l.id} label={listingShortLabel(l)} className={styles.hCmp} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.v}>
      <Link href={href} className={styles.vPhoto} tabIndex={-1} aria-hidden="true">
        {photo && (
          <Image
            src={photo.url}
            alt=""
            fill
            sizes="(max-width: 759px) 262px, 292px"
            className={styles.img}
            data-off={off || undefined}
            preload={preload}
          />
        )}
        <span className={styles.vBadges}>
          {pro && <span className={ui.proBadge}>{SELLER_LABEL[l.seller.type]}</span>}
          {off && <span className={ui.offBadge}>{av.text}</span>}
        </span>
        <span className={styles.vBottom}>
          <span className={styles.km}>
            <span className={styles.kmDot} />
            {near ? `A ${l.distanceKm} km` : zoneName(l)}
          </span>
          <span className={styles.count}>{l.photos.length} fotos</span>
        </span>
      </Link>
      <SaveButton id={l.id} className={styles.vSave} />
      <div className={styles.vBody}>
        <div className={styles.priceRow}>
          <span className={styles.vPrice}>{eur(l.price)}</span>
          {l.previousPrice && <s className={styles.vOld}>{eur(l.previousPrice)}</s>}
        </div>
        <Link href={href} className={styles.vTitle}>
          {title}
        </Link>
        <div className={styles.vSpec}>
          <strong>{volumeShort(l)}</strong>
          <span>
            {" "}
            · {typeShort(l)} · {consShort(l)}
          </span>
        </div>
        <div className={styles.vMeta}>
          {zoneName(l)} · {CONDITION_LABEL[l.condition]}
        </div>
        <div className={styles.avail}>
          <AvailabilityDot tone={av.tone} />
          {av.text}
        </div>
        <FitBadge volume={l.volume.value} className={`${ui.fitBadge} ${styles.vFit}`} />
        <div className={styles.vFoot}>
          <CompareButton id={l.id} label={listingShortLabel(l)} className={styles.vCmp} />
          <span>{postedText(l, now)}</span>
        </div>
      </div>
    </article>
  );
}
