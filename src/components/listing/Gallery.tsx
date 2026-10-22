"use client";

import Image from "next/image";
import { useState } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import type { Shape } from "@/lib/domain/taxonomy";
import type { Photo } from "@/lib/domain/types";
import styles from "./Ficha.module.css";

export function Gallery({
  photos,
  title,
  off,
  isDemo,
  shape,
}: {
  photos: Photo[];
  title: string;
  off: boolean;
  isDemo: boolean;
  shape?: Shape;
}) {
  const [ix, setIx] = useState(0);
  const n = photos.length;
  if (!n)
    return (
      <div className={`${styles.galMain} ${styles.galEmpty}`}>
        {shape && <BoardShape shape={shape} size={180} />}
        <span>Sin fotos</span>
      </div>
    );
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
          // LCP de la ficha: la primera foto se pide enseguida y con prioridad alta.
          {...(ix === 0 ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
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
