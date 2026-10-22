"use client";

// Resultado del asistente: rango orientativo, tipos de tabla y anuncios compatibles.

import Link from "next/link";
import { useEffect, useState } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import { ListingCard } from "@/components/listing/ListingCard";
import { useUserState } from "@/components/user/UserStateProvider";
import { SHAPE_INFO } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import {
  baseFilters,
  budgetOf,
  compatible,
  countFor,
  finderZone,
  finderZoneName,
  resultFilters,
  typeFilter,
} from "@/lib/finder/listings";
import { TYPE_INFO, WAVES, levelOf, type FinderState, type Recommendation } from "@/lib/finder/recommend";
import { alertText } from "@/lib/search/describe";
import { searchHref, toQuery, withFilters, type Filters } from "@/lib/search/filters";
import type { SummaryItem } from "./FinderWizard";
import styles from "./Finder.module.css";

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
  const { profile, setProfile, addAlert, toast } = useUserState();
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
  const alert = (f: Filters) => addAlert(alertText(f, NO_NAMES), toQuery(f));
  const saved = !!profile && profile.lo === r.lo && profile.hi === r.hi;

  const widen: { label: string; href?: string; onClick?: () => void }[] = [];
  if (pool) {
    if (zone) widen.push({ label: `Ampliar a toda España (${compatible(listings, r, "", budget).length})`, onClick: () => set({ zone: "" }) });
    if (budget != null) {
      const nb = budget + 100;
      widen.push({ label: `Subir presupuesto a ${nb} € (${compatible(listings, r, zone, nb).length})`, onClick: () => set({ budget: String(nb) }) });
    }
    const alt = baseFilters(r, zone, budget);
    widen.push({ label: `Ver alternativas con tu volumen (${countFor(listings, alt)})`, href: searchHref(alt) });
    widen.push({ label: "Crear alerta", onClick: () => alert(all) });
  }

  return (
    <>
      <section className={styles.res} aria-labelledby="finder-result-title">
        <div className={styles.resKicker}>Tu recomendación · orientativa</div>
        <h2 id="finder-result-title" tabIndex={-1} className={styles.resTitle}>
          Estas son las tablas que mejor
          <br />
          <span className={styles.resAccent}>podrían encajarte</span>
        </h2>
        <p className={styles.resSub}>
          Con {r.weight} kg y el nivel «{lvName.toLowerCase()}»{waves ? `, en olas ${waves}` : ""}, estas son las opciones con
          más sentido. Tómalas como orientación, no como una medida exacta.
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
          Por qué: el volumen sale de tu peso y nivel, ajustado por frecuencia, tipo de ola y objetivo.{r.note}
        </p>
      </section>

      <section className={styles.resSection} aria-labelledby="finder-types">
        <h2 id="finder-types" className={styles.h2}>
          Tipos de tabla para ti
        </h2>
        <div className={styles.types}>
          {r.types.map((t, i) => {
            const info = TYPE_INFO[t];
            const f = { ...baseFilters(r, zone, null), ...typeFilter(t) };
            const n = pool ? countFor(listings, f) : null;
            return (
              <article key={t} className={styles.type} data-first={i === 0 || undefined}>
                <div className={styles.typePhoto}>
                  <BoardShape shape={info.shape} size={140} tone={t === "softboard" ? "soft" : "light"} className={styles.typeImg} />
                  <span className={styles.typeTag}>{i === 0 ? "La que más encaja" : "También encaja"}</span>
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
                    <button type="button" className={styles.typeCta} onClick={() => alert(f)}>
                      Sin anuncios · crear alerta
                    </button>
                  ) : (
                    <Link href={searchHref(f)} className={styles.typeCta}>
                      Ver {n ?? ""} {info.plural}
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
                ? `${comp.length} anuncio${comp.length === 1 ? "" : "s"} entre ${r.lo} y ${r.hi} L · ${r.types.map((t) => TYPE_INFO[t].label).join(", ")} · ${zoneName}${budget != null ? ` · hasta ${budget} €` : ""}`
                : failed
                  ? "No hemos podido cargar los anuncios."
                  : "Buscando anuncios compatibles…"}
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
                  Encaja: {l.volume.value} L dentro de {r.lo}–{r.hi} L · {SHAPE_INFO[l.shape].label}
                  {l.construction === "softboard" ? " · Softboard" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {failed && (
          <div className={styles.none}>
            <div className={styles.noneTitle}>No hemos podido cargar los anuncios.</div>
            <Link href={searchHref(all)} className={styles.widen}>
              Buscar tablas de {r.lo}–{r.hi} L
            </Link>
          </div>
        )}

        {pool && comp.length === 0 && (
          <div className={styles.none}>
            <div className={styles.noneTitle}>No hay tablas disponibles ahora mismo con estas características.</div>
            <div className={styles.noneText}>Tu próxima tabla ya existe; puede que aún no esté publicada. Prueba a ampliar la búsqueda:</div>
            <div className={styles.widenRow}>
              {widen.map((w) =>
                w.href ? (
                  <Link key={w.label} href={w.href} className={styles.widen}>
                    {w.label}
                  </Link>
                ) : (
                  <button key={w.label} type="button" className={styles.widen} onClick={w.onClick}>
                    {w.label}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        <div className={styles.twoCols}>
          <div className={styles.alertBox}>
            <strong className={styles.boxTitle}>Crea una alerta con este perfil</strong>
            <span className={styles.boxText}>«{alertText(all, NO_NAMES)}»</span>
            <span className={styles.boxText}>Se guarda en este dispositivo. Los avisos por email aún no están activos.</span>
            <div>
              <button type="button" className={styles.alertBtn} onClick={() => alert(all)}>
                Crear alerta
              </button>
            </div>
          </div>
          <div className={styles.saveBox}>
            <strong className={styles.boxTitle}>{saved ? "Tu perfil de surfista está guardado" : "Guarda tu perfil de surfista"}</strong>
            <span className={styles.saveText}>
              Verás «Te encaja» en tarjetas y fichas, y podrás usar «Solo tablas para mí» en el buscador. Lo guardamos en este
              dispositivo, sin registro.
            </span>
            <div className={styles.saveActions}>
              <button
                type="button"
                className={styles.saveBtn}
                aria-pressed={saved}
                onClick={() => {
                  setProfile({ lo: r.lo, hi: r.hi, level: r.levelName, weight: r.weight });
                  toast("Perfil guardado: verás «Te encaja» en las tablas de tu rango");
                }}
              >
                {saved ? "Perfil guardado ✓" : "Guardar mi perfil de surfista"}
              </button>
              <button type="button" className={styles.repeatBtn} onClick={onRestart}>
                Repetir cuestionario
              </button>
            </div>
          </div>
        </div>
        <p className={styles.disclaimer}>
          Recomendación generada con una lógica simplificada de demostración. No es un motor validado técnicamente.
        </p>
      </section>
    </>
  );
}
