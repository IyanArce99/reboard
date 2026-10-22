"use client";

// Vista previa en vivo del anuncio mientras se publica. Usa las fotos y los datos del vendedor;
// sin fotos, una silueta neutra de la tabla (nunca una foto de stock). No es un anuncio real:
// no enlaza a ningún sitio ni aparece en búsquedas.

import Image from "next/image";
import { BoardShape } from "@/components/brand/BoardShape";
import { CONDITION_LABEL, CONSTRUCTION_INFO, SHAPE_INFO, zoneBySlug } from "@/lib/domain/taxonomy";
import type { CatalogModel } from "@/lib/domain/types";
import { eur } from "@/lib/domain/format";
import { listingTitle } from "@/lib/listing/present";
import { previewListing, type PublishDraft } from "@/lib/publish/draft";
import styles from "./Publish.module.css";

/** Textos de la vista previa: solo lo que el vendedor ha indicado (nada inventado). */
export function previewTexts(d: PublishDraft, catalog: CatalogModel[], now: Date) {
  const l = previewListing(d, catalog, now);
  const hasLen = !!d.len.trim();
  const title = l.brand || d.shape ? listingTitle(l).replace(/ —$/, "") : hasLen ? `Tabla ${l.sizeLabel}` : "Tu tabla";
  const spec = [
    l.volume.value != null ? `${l.volume.value} L` : "Litros sin indicar",
    d.shape ? SHAPE_INFO[d.shape].short : null,
    d.construction ? CONSTRUCTION_INFO[d.construction].short : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const zone = zoneBySlug(d.zone)?.name ?? "";
  const place = d.town.trim() ? `${d.town.trim()}, ${zone}` : zone;
  const meta = [place, d.condition ? CONDITION_LABEL[d.condition] : null].filter(Boolean).join(" · ");
  const price = Number(d.price) > 0 ? eur(Number(d.price)) : null;
  return { title, spec, meta, price, hasVolume: l.volume.value != null };
}

export function CoverPhoto({ d, sizes }: { d: PublishDraft; sizes: string }) {
  const cover = d.photos[0];
  if (cover) return <Image src={cover.url} alt="" fill sizes={sizes} className={styles.coverImg} unoptimized={cover.local} />;
  return (
    <span className={styles.coverEmpty}>
      <BoardShape shape={d.shape || "evolutiva"} size={150} tone="soft" />
      <span>Aquí irá tu foto de portada</span>
    </span>
  );
}

export function LivePreview({ d, catalog, now }: { d: PublishDraft; catalog: CatalogModel[]; now: Date }) {
  const t = previewTexts(d, catalog, now);
  return (
    <article className={styles.pv} aria-label="Vista previa del anuncio">
      <div className={styles.pvPhoto}>
        <CoverPhoto d={d} sizes="(max-width: 1023px) 92vw, 320px" />
        {d.photos.length > 0 && (
          <span className={styles.pvCount}>
            {d.photos.length} {d.photos.length === 1 ? "foto" : "fotos"}
          </span>
        )}
      </div>
      <div className={styles.pvBody}>
        <span className={styles.pvPrice} data-empty={!t.price || undefined}>
          {t.price ?? "Precio"}
        </span>
        <span className={styles.pvTitle}>{t.title}</span>
        <span className={styles.pvSpec} data-missing={!t.hasVolume || undefined}>
          {t.spec}
        </span>
        <span className={styles.pvMeta}>{t.meta}</span>
      </div>
    </article>
  );
}
