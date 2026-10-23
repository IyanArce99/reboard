"use client";

// Resultado del asistente: rango orientativo, tipos de tabla y tablas publicadas en ese rango.

import Link from "next/link";
import { useEffect, useState } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import { ListingCard } from "@/components/listing/ListingCard";
import { AlertButton } from "@/components/user/islands";
import { useUserState } from "@/components/user/UserStateProvider";
import { SHAPE_INFO } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import {
  budgetOf,
  compatible,
  countFor,
  finderZone,
  finderZoneName,
  resultFilters,
  typeFilters,
  widenOptions,
} from "@/lib/finder/listings";
import { TYPE_INFO, WAVES, levelOf, type FinderState, type Recommendation } from "@/lib/finder/recommend";
import { alertText } from "@/lib/search/describe";
import { searchHref, toQuery, withFilters, type Filters } from "@/lib/search/filters";
import type { SummaryItem } from "@/lib/finder/summary";
import styles from "./Finder.module.css";

/** Aviso único por pantalla (asistente o resultado): el cálculo no está validado. */
export const FINDER_DISCLAIMER = "Cálculo orientativo y simplificado. Todavía no lo han validado surfistas ni shapers.";

interface Props {
  state: FinderState;
  rec: Recommendation;
  summary: SummaryItem[];
  onEdit: (step: number) => void;
  onRestart: () => void;
  set: (patch: Partial<FinderState>) => void;
}

interface Pool {
  key: string;
  listings: Listing[];
  now: Date;
  here: string;
}

const NO_NAMES = { brands: [], models: [] };

/** Anuncios activos del rango de litros. El cruce con tipo, zona y presupuesto se hace aquí. */
function usePool(lo: number, hi: number) {
  const key = `${lo}-${hi}`;
  const [pool, setPool] = useState<Pool | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/tablas?${toQuery(withFilters({ volMin: lo, volMax: hi }))}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((d: { listings: Listing[]; now: string; here: string }) => {
        if (alive) setPool({ key, listings: d.listings, now: new Date(d.now), here: d.here });
      })
      .catch(() => {
        if (alive) setFailed(key);
      });
    return () => {
      alive = false;
    };
  }, [key, lo, hi]);
  return { pool: pool?.key === key ? pool : null, failed: failed === key };
}

export function FinderResult({ state: W, rec: r, summary, onEdit, onRestart, set }: Props) {
  const { profile, setProfile } = useUserState();
  const { pool, failed } = usePool(r.lo, r.hi);
  const listings = pool?.listings ?? [];
  const zone = finderZone(W);
  const budget = budgetOf(W);
  const zoneName = finderZoneName(W);
  const lvName = levelOf(r.level)[1];
  const waves = W.waves ? WAVES.find((x) => x[0] === W.waves)![1].toLowerCase() : "";

  const comp = compatible(listings, r, zone, budget);
  const all = resultFilters(r, zone, budget);
  const allCount = countFor(listings, all);
  const alertProps = (f: Filters) => ({ text: alertText(f, NO_NAMES), query: toQuery(f) });
  const saved = !!profile && profile.lo === r.lo && profile.hi === r.hi;
  // Sin tablas compatibles: estado vacío honesto (sin contadores a cero), con alerta y enlace a publicar.
  const empty = !!pool && comp.length === 0;
  // Ninguna tabla publicada en todo el rango de litros (lo normal mientras la beta no tenga anuncios).
  const noneInRange = !!pool && listings.length === 0;
  const widen = pool && !noneInRange ? widenOptions(listings, r, zone, budget) : [];

  return (
    <>
      <section className={styles.res} aria-labelledby="finder-result-title">
        <div className={styles.resKicker}>Tu recomendación · orientativa</div>
        <h2 id="finder-result-title" tabIndex={-1} className={styles.resTitle}>
          Tu rango orientativo:{" "}
          <span className={styles.resAccent}>
            {r.lo}–{r.hi} L
          </span>
        </h2>
        <p className={styles.resSub}>
          Con {r.weight} kg y el nivel «{lvName.toLowerCase()}»{waves ? `, en olas ${waves}` : ""}, estas son las opciones que
          suelen tener más sentido. Tómalas como orientación, no como una medida exacta: también dependen de tu forma
          física, del modelo y de cómo reparte el volumen.
        </p>
        <div className={styles.resChips}>
          {summary.map((s) => (
            <button key={s.step} type="button" className={styles.resChip} onClick={() => onEdit(s.step)} aria-label={`${s.label}: ${s.value}. Editar`}>
              {s.value} <span className={styles.pencil} aria-hidden="true">✎</span>
            </button>
          ))}
        </div>
        <div className={styles.resCards}>
          <div className={styles.volCard}>
            <span className={styles.volLabel}>Volumen</span>
            <span className={styles.volNum}>
              {r.lo}–{r.hi} L
            </span>
            <span className={styles.volLens}>
              Longitud orientativa: <strong>{r.lens}</strong>
            </span>
          </div>
          <div className={styles.tipCard}>
            <span className={styles.tipLabel}>Qué buscar</span>
            <ul className={styles.tipList}>
              {r.look.map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
          </div>
          <div className={styles.tipCard}>
            <span className={`${styles.tipLabel} ${styles.tipAvoid}`}>Qué evitar</span>
            <ul className={styles.tipList}>
              {r.avoid.map((t) => (
                <li key={t}>✕ {t}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className={styles.why}>
          Por qué: el volumen sale de tu peso y nivel, ajustado por frecuencia, tipo de ola y objetivo, con factores
          orientativos habituales.{r.note}
        </p>
      </section>

      <section className={styles.resSection} aria-labelledby="finder-types">
        <h2 id="finder-types" className={styles.h2}>
          Tipos de tabla para ti
        </h2>
        <div className={styles.types}>
          {r.types.map((t, i) => {
            const info = TYPE_INFO[t];
            const f = typeFilters(r, zone, budget, t);
            const n = pool ? countFor(listings, f) : null;
            return (
              <article key={t} className={styles.type} data-first={i === 0 || undefined}>
                <div className={styles.typePhoto}>
                  <BoardShape shape={info.shape} size={140} tone={t === "softboard" ? "soft" : "light"} className={styles.typeImg} />
                  <span className={styles.typeTag}>{i === 0 ? "Primera opción" : "También puede encajar"}</span>
                </div>
                <div className={styles.typeBody}>
                  <div className={styles.typeHead}>
                    <h3 className={styles.typeName}>{info.label}</h3>
                    <span className={styles.typeLens}>{info.lens}</span>
                  </div>
                  <p className={styles.typeWhy}>{info.why}</p>
                  <p className={styles.typeCons}>
                    <strong>A tener en cuenta:</strong> {info.cons}
                  </p>
                  <div className={styles.grow} />
                  {n === 0 ? (
                    <AlertButton {...alertProps(f)} className={styles.typeCta}>
                      Sin anuncios · crear alerta
                    </AlertButton>
                  ) : (
                    <Link href={searchHref(f)} className={styles.typeCta}>
                      {n == null ? `Ver ${info.plural}` : `Ver ${n} ${n === 1 ? info.singular : info.plural}`}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.resSection} aria-labelledby="finder-listings">
        <div className={styles.listHead}>
          <div>
            <h2 id="finder-listings" className={styles.h2}>
              Tablas de segunda mano para ti
            </h2>
            <div className={styles.listSub} aria-live="polite">
              {pool
                ? `${comp.length ? `${comp.length} tabla${comp.length === 1 ? "" : "s"}` : "Ninguna tabla por ahora"} entre ${r.lo} y ${r.hi} L · ${r.types.map((t) => TYPE_INFO[t].label).join(", ")} · ${zoneName}${budget != null ? ` · hasta ${budget} €` : ""}`
                : failed
                  ? "No hemos podido cargar las tablas."
                  : "Buscando tablas en tu rango…"}
            </div>
          </div>
          {allCount > 0 && (
            <Link href={searchHref(all)} className={styles.seeAll}>
              Ver {allCount} tabla{allCount === 1 ? "" : "s"}
            </Link>
          )}
        </div>

        {pool && comp.length > 0 && (
          <div className={styles.grid}>
            {comp.slice(0, 8).map((l) => (
              <div key={l.id} className={styles.cardWrap}>
                <ListingCard listing={l} now={pool.now} hereZone={pool.here} layout="responsive" />
                <span className={styles.reason}>
                  En tu rango: {l.volume.value} L dentro de {r.lo}–{r.hi} L · {SHAPE_INFO[l.shape].label}
                  {l.construction === "softboard" ? " · Softboard" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {failed && (
          <div className={styles.none}>
            <div className={styles.noneTitle}>No hemos podido cargar las tablas.</div>
            <Link href={searchHref(all)} className={styles.widen}>
              Buscar tablas de {r.lo}–{r.hi} L
            </Link>
          </div>
        )}

        {empty && (
          <div className={styles.none}>
            <div className={styles.noneTitle}>
              {noneInRange
                ? `Todavía no hay tablas publicadas entre ${r.lo} y ${r.hi} L.`
                : "No hay tablas disponibles ahora mismo con estas características."}
            </div>
            <div className={styles.noneText}>
              {noneInRange
                ? "Reboard acaba de empezar y aún hay pocos anuncios. Crea una alerta con este perfil: se guarda en este dispositivo (los avisos por email aún no están activos)."
                : "Prueba a ampliar la búsqueda o crea una alerta con este perfil (se guarda en este dispositivo)."}
            </div>
            {widen.length > 0 && (
              <div className={styles.widenRow}>
                {widen.map((w) =>
                  w.href ? (
                    <Link key={w.key} href={w.href} className={styles.widen}>
                      {w.label}
                    </Link>
                  ) : (
                    <button
                      key={w.key}
                      type="button"
                      className={styles.widen}
                      onClick={() => set(w.key === "zone" ? { zone: "" } : { budget: String(w.budget) })}
                    >
                      {w.label}
                    </button>
                  ),
                )}
              </div>
            )}
            <span className={styles.boxText}>«{alertText(all, NO_NAMES)}»</span>
            <div className={styles.noneActions}>
              <AlertButton {...alertProps(all)} className={styles.alertBtn} />
              <Link href="/vender/publicar" className={styles.widen}>
                ¿Tienes una tabla que no usas? Publícala gratis
              </Link>
            </div>
          </div>
        )}

        <div className={styles.twoCols} data-single={empty || undefined}>
          {!empty && (
            <div className={styles.alertBox}>
              <strong className={styles.boxTitle}>Crea una alerta con este perfil</strong>
              <span className={styles.boxText}>«{alertText(all, NO_NAMES)}»</span>
              <span className={styles.boxText}>Se guarda en este dispositivo. Los avisos por email aún no están activos.</span>
              <div>
                <AlertButton {...alertProps(all)} className={styles.alertBtn} />
              </div>
            </div>
          )}
          <div className={styles.saveBox}>
            {/* El perfil se guarda solo al llegar al resultado (FinderWizard): aquí se avisa y se puede borrar. */}
            <strong className={styles.boxTitle}>{saved ? "Tu perfil está guardado" : "No hay ningún perfil guardado"}</strong>
            <span className={styles.saveText} role="status">
              {saved
                ? "Hemos guardado tu rango en este dispositivo: verás «Te encaja» en las tablas que entran en él."
                : "Sin perfil no verás «Te encaja» en las tablas. Puedes guardar este rango en este dispositivo cuando quieras."}
            </span>
            <div className={styles.saveActions}>
              {saved ? (
                <button type="button" className={styles.repeatBtn} onClick={() => setProfile(null)}>
                  Borrar mi perfil
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={() => setProfile({ lo: r.lo, hi: r.hi, level: r.levelName, weight: r.weight })}
                >
                  Guardar mi rango
                </button>
              )}
              <button type="button" className={styles.repeatBtn} onClick={onRestart}>
                Empezar de nuevo
              </button>
            </div>
          </div>
        </div>
        <p className={styles.disclaimer}>
          {FINDER_DISCLAIMER}
        </p>
      </section>
    </>
  );
}
