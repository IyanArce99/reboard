"use client";

// Comparador de 2 a 4 anuncios (/comparar). La selección vive en este dispositivo (UserStateProvider).

import Image from "next/image";
import Link from "next/link";
import { useHereZone, useListings } from "@/components/saved/useListings";
import { useUserState } from "@/components/user/UserStateProvider";
import { listingPath, listingTitle } from "@/lib/listing/present";
import { compareRows } from "./rows";
import styles from "./Compare.module.css";

const LABEL_W = 140;
const COL_MIN = 170;

export function Comparator() {
  const { compare, profile, ready, removeCompare } = useUserState();
  const ids = compare.map((c) => c.id);
  const { listings, gone, now, loading, failed, retry } = useListings(ids, ready);
  const here = useHereZone();

  if (failed) {
    return (
      <div className={styles.few} role="alert">
        <span>No hemos podido cargar las tablas.</span>
        <button type="button" className={styles.pick} onClick={retry}>
          Reintentar
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <div className={styles.skeleton} aria-hidden="true" />
        <span className={styles.srOnly} role="status">
          Cargando la comparación…
        </span>
      </>
    );
  }

  const goneNote = gone.length > 0 && (
    <p className={styles.gone}>
      {gone.length === 1 ? "1 tabla de tu comparación ya no existe en Reboard." : `${gone.length} tablas de tu comparación ya no existen en Reboard.`}{" "}
      <button type="button" className={styles.linkBtn} onClick={() => gone.forEach((id) => removeCompare(id))}>
        Quitarlas
      </button>
    </p>
  );

  if (listings.length < 2 || !now) {
    return (
      <>
        {goneNote}
        <div className={styles.few}>
          <span>
            {listings.length === 1
              ? "Tienes 1 tabla seleccionada. Añade al menos otra desde los resultados."
              : "Pulsa «Comparar» en 2 a 4 tarjetas o fichas."}
          </span>
          <Link href="/buscar" className={styles.pick}>
            Elegir tablas
          </Link>
        </div>
      </>
    );
  }

  const rows = compareRows(listings, { here, now, profile });
  const minWidth = LABEL_W + listings.length * COL_MIN;

  return (
    <>
      {goneNote}
      <div className={styles.rail} tabIndex={0} role="region" aria-label="Tabla de comparación (desplázate en horizontal)">
        <div className={styles.frame} style={{ minWidth }}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Comparación de {listings.length} tablas. Las filas resaltadas tienen valores distintos.</caption>
            <colgroup>
              <col style={{ width: LABEL_W }} />
              {listings.map((l) => (
                <col key={l.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <td className={styles.corner} />
                {listings.map((l) => {
                  const title = listingTitle(l);
                  const href = listingPath(l);
                  const photo = l.photos[0];
                  return (
                    <th key={l.id} scope="col" className={styles.head}>
                      <div className={styles.headIn}>
                        <Link href={href} className={styles.photo} tabIndex={-1} aria-hidden="true">
                          {photo && <Image src={photo.url} alt="" fill sizes="(max-width: 759px) 170px, 280px" className={styles.img} />}
                        </Link>
                        <Link href={href} className={styles.headTitle}>
                          {title}
                        </Link>
                        <div className={styles.headActions}>
                          <Link href={href} className={styles.open}>
                            Abrir ficha
                          </Link>
                          <button
                            type="button"
                            className={styles.remove}
                            aria-label={`Quitar ${title} de la comparación`}
                            onClick={() => removeCompare(l.id)}
                          >
                            <span aria-hidden="true">✕</span>
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} data-diff={r.diff || undefined}>
                  <th scope="row" className={styles.label}>
                    {r.label}
                    {r.diff && <span className={styles.srOnly}> (valores distintos)</span>}
                  </th>
                  {r.cells.map((c, i) => (
                    <td
                      key={listings[i].id}
                      className={styles.cell}
                      data-tone={c.tone}
                      data-mono={r.mono || undefined}
                      data-strong={r.strong || undefined}
                    >
                      {c.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
