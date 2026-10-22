"use client";

import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/lib/domain/types";
import styles from "./Ficha.module.css";

export function Gallery({ photos, title, off, isDemo }: { photos: Photo[]; title: string; off: boolean; isDemo: boolean }) {
  const [ix, setIx] = useState(0);
  const n = photos.length;
  if (!n) return <div className={styles.galMain} />;
  const p = photos[ix % n];
  const go = (d: number) => setIx((i) => (i + d + n) % n);

  return (
    <div>
      <div className={styles.galMain} data-off={off || undefined}>
        <Image
          key={p.url}
          src={p.url}
          alt={`${title} · ${p.label}`}
          fill
          sizes="(max-width: 759px) 100vw, 60vw"
          className={styles.galImg}
          preload={ix === 0}
        />
        <span className={styles.galLabel}>
          {p.label}
          {isDemo ? " · foto de stock (demo)" : ""}
        </span>
        {n > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" className={`${styles.galArrow} ${styles.galPrev}`} onClick={() => go(-1)}>
              ‹
            </button>
            <button type="button" aria-label="Foto siguiente" className={`${styles.galArrow} ${styles.galNext}`} onClick={() => go(1)}>
              ›
            </button>
          </>
        )}
        <span className={styles.galIx}>
          {ix + 1} / {n}
        </span>
      </div>
      <div className={styles.thumbs}>
        {photos.map((t, i) => (
          <button
            key={t.url + i}
            type="button"
            aria-label={`Ver foto: ${t.label}`}
            aria-current={i === ix || undefined}
            className={styles.thumb}
            onClick={() => setIx(i)}
          >
            <Image src={t.url} alt="" fill sizes="120px" className={styles.galImg} data-off={off || undefined} />
          </button>
        ))}
      </div>
    </div>
  );
}
