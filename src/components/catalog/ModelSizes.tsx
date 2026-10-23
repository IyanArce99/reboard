"use client";

// Selector de medida del modelo (/marcas/[marca]/[modelo]). Las variantes de medida viven DENTRO
// de la página (docs/SEO.md): no hay URL por medida. El servidor prerenderiza la primera medida y
// las tarjetas de todas; esta isla solo cambia cuál se muestra y añade «Te encaja» según el perfil
// del usuario, que vive en este dispositivo.

import Link from "next/link";
import { useState } from "react";
import { AlertButton } from "@/components/user/islands";
import { useUserState } from "@/components/user/UserStateProvider";
import ui from "@/styles/ui.module.css";
import styles from "./Catalog.module.css";

export interface ModelSizeView {
  label: string;
  lengthCm: number;
  width: string;
  thick: string;
  volume: number | null;
  volumeText: string;
  /** Unidades usadas en venta de esta medida. */
  count: number;
  /** Tarjetas de esas unidades, renderizadas en el servidor. */
  cards: React.ReactNode;
  alert: { text: string; query: string };
}

interface Props {
  brand: string;
  model: string;
  /** Cabecera (h1, etiquetas y descripción), renderizada en el servidor. */
  intro: React.ReactNode;
  photo: React.ReactNode;
  sizes: ModelSizeView[];
  sourceNote: string;
  total: number;
  allHref: string;
}

export function ModelSizes({ brand, model, intro, photo, sizes, sourceNote, total, allHref }: Props) {
  const [i, setI] = useState(0);
  const { profile } = useUserState();
  const sz = sizes[i];
  const inRange = (v: number | null) => profile != null && v != null && v >= profile.lo && v <= profile.hi;
  const anyFits = sizes.some((s) => inRange(s.volume));
  const range = profile ? `${profile.lo}–${profile.hi} L` : "";

  return (
    <>
      <div className={styles.modelTop}>
        {photo}
        <div className={styles.info}>
          {intro}
          <div>
            <span className={`${ui.label} ${styles.pickLabel}`} id="medida-label">
              Elige medida
            </span>
            <div className={styles.sizes} role="group" aria-labelledby="medida-label">
              {sizes.map((s, k) => (
                <button
                  key={s.label}
                  type="button"
                  className={styles.sizeChip}
                  aria-pressed={k === i}
                  onClick={() => setI(k)}
                >
                  {s.label}
                  {inRange(s.volume) ? " · te encaja" : ""}
                </button>
              ))}
            </div>
          </div>
          <dl className={styles.specs}>
            {[
              ["Longitud", sz.label],
              ["Anchura", sz.width],
              ["Grosor", sz.thick],
              ["Litros", sz.volumeText],
            ].map(([k, v]) => (
              <div key={k} className={styles.spec}>
                <dt className={styles.specK}>{k}</dt>
                <dd className={styles.specV}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.sourceRow}>
            <span className={styles.sourceBadge}>Según el fabricante</span>
            <span>Medidas del catálogo del fabricante. En cada anuncio, el vendedor indica cuál es la suya.</span>
          </div>
          {profile && (
            <div className={styles.fit} data-in={inRange(sz.volume) || undefined} role="status">
              {inRange(sz.volume)
                ? `La ${sz.label} está dentro de tu rango orientativo (${range}).`
                : `La ${sz.label} queda fuera de tu rango orientativo (${range}).${anyFits ? " Mira las medidas marcadas «te encaja»." : ""}`}
            </div>
          )}
        </div>
      </div>

      <section className={styles.tableSection} aria-labelledby="medidas-title">
        <h2 id="medidas-title" className={styles.tableTitle}>
          Tabla de medidas
        </h2>
        <p className={styles.tableNote}>{sourceNote}</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {["Medida", "Longitud", "Anchura", "Grosor", "Litros", "En venta"].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((s, k) => {
                const fits = inRange(s.volume);
                return (
                  <tr key={s.label} data-on={k === i || undefined} onClick={() => setI(k)}>
                    <td>
                      <button type="button" className={styles.rowBtn} aria-pressed={k === i} onClick={() => setI(k)}>
                        {s.label}
                      </button>
                    </td>
                    <td>{s.lengthCm} cm</td>
                    <td>{s.width}</td>
                    <td>{s.thick}</td>
                    <td className={fits ? styles.cellFit : undefined}>
                      {s.volumeText}
                      {fits && <span aria-label=", te encaja"> ✓</span>}
                    </td>
                    <td className={s.count ? undefined : styles.cellNone}>
                      {s.count ? `${s.count} usada${s.count > 1 ? "s" : ""}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.usedSection} aria-labelledby="usadas-title">
        <h2 id="usadas-title" className={styles.h2}>
          {model} {sz.label} de segunda mano ({sz.count})
        </h2>
        {sz.count > 0 ? (
          <div className={styles.grid}>{sz.cards}</div>
        ) : (
          <div className={styles.noneBox}>
            <div className={styles.noneText}>
              Ahora mismo no hay ninguna {brand} {model} {sz.label} usada a la venta. Crea una alerta y, desde Alertas, verás si aparece alguna.
            </div>
            <AlertButton text={sz.alert.text} query={sz.alert.query} className={`${ui.btnStrong} ${styles.noneBtn}`}>
              Crear alerta de esta medida
            </AlertButton>
          </div>
        )}
        {total > sz.count && (
          <Link href={allHref} className={styles.more}>
            {total === 1 ? `Ver la única ${model} usada →` : `Ver las ${total} ${model} usadas de todas las medidas →`}
          </Link>
        )}
      </section>
    </>
  );
}
