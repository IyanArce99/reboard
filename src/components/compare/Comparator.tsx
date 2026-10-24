"use client";

// Comparador de 2 a 4 tablas (/comparar). La selección vive en este dispositivo (UserStateProvider);
// los datos llegan de /api/anuncios en una sola petición (useListings). Lógica pura en src/lib/compare.
// Escritorio: tabla con todas las tablas. Móvil (< 760 px): dos tablas a la vez y un selector para
// cambiarlas, sin scroll horizontal. Docs: docs/COMPARATOR.md.

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import { useListings } from "@/components/saved/useListings";
import { ShareButton } from "@/components/user/islands";
import { MAX_COMPARE, useUserState, type SurferProfile } from "@/components/user/UserStateProvider";
import {
  LETTERS,
  compareGroups,
  compareItemOf,
  compareSharePath,
  compareSummary,
  fitOf,
  fitText,
  parseIdsParam,
  sameIds,
  sanitizeCompare,
  type CompareGroup,
} from "@/lib/compare/compare";
import { eur } from "@/lib/domain/format";
import type { Listing } from "@/lib/domain/types";
import { availability, listingPath, listingTitle, zoneName } from "@/lib/listing/present";
import { searchHref, withFilters } from "@/lib/search/filters";
import ui from "@/styles/ui.module.css";
import styles from "./Compare.module.css";
import { track, trackOnce } from "@/lib/analytics/track";

const MOBILE = "(max-width: 759px)";

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function Comparator() {
  const { compare, profile, ready, removeCompare, clearCompare, replaceCompare } = useUserState();
  const router = useRouter();
  const params = useSearchParams();
  const localIds = compare.map((c) => c.id);
  // Enlace compartido (/comparar?ids=…): si no tienes selección, pasa a ser la tuya; si tienes otra
  // distinta, se muestra la compartida sin tocar la tuya, y eliges.
  const sharedIds = parseIdsParam(params.get("ids"));
  const shared = ready && sharedIds.length > 0 && localIds.length > 0 && !sameIds(sharedIds, localIds);
  const ids = ready && sharedIds.length > 0 && !localIds.length ? sharedIds : shared ? sharedIds : localIds;
  const { listings, gone, now, loading, failed, retry } = useListings(ids, ready);
  const sharedKey = sharedIds.join(",");
  const localKey = localIds.join(",");

  useEffect(() => {
    if (!ready || !sharedKey) return;
    const s = sharedKey.split(",");
    const local = localKey ? localKey.split(",") : [];
    if (!local.length) replaceCompare(s.map((id) => ({ id, label: "Tabla" })));
    if (!local.length || sameIds(s, local)) router.replace("/comparar", { scroll: false });
  }, [ready, sharedKey, localKey, replaceCompare, router]);

  // Analítica: comparación vista (cuántas tablas y si viene de un enlace compartido).
  const viewKey = ids.join(",");
  useEffect(() => {
    if (!ready || !viewKey) return;
    trackOnce(`${viewKey}|${shared}`, "compare_viewed", { count: viewKey.split(",").length, shared });
  }, [ready, viewKey, shared]);

  // Las etiquetas y miniaturas de la barra se refrescan con los datos reales (enlaces compartidos,
  // selecciones antiguas sin foto).
  useEffect(() => {
    if (shared || !listings.length || listings.length !== compare.length) return;
    // Se compara ya saneado (lo mismo que se guarda): si el saneado descartaba algo (p. ej. una foto con
    // http://), lo guardado y lo fresco nunca coincidían y esto se reescribía en bucle, cortando la
    // navegación de /comparar?ids=… a /comparar (cierre de auditoría, 24-10-2026).
    const fresh = sanitizeCompare(listings.map(compareItemOf));
    if (JSON.stringify(fresh) !== JSON.stringify(compare)) replaceCompare(fresh);
  }, [shared, listings, compare, replaceCompare]);

  const removeOne = (id: string) => {
    if (!shared) return removeCompare(id);
    const rest = sharedIds.filter((x) => x !== id);
    router.replace(rest.length ? compareSharePath(rest) : "/comparar", { scroll: false });
  };
  const clearAll = () => (shared ? router.replace("/comparar", { scroll: false }) : clearCompare());
  const mobile = useMedia(MOBILE);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [pair, setPair] = useState<[number, number]>([0, 1]);
  const [removed, setRemoved] = useState(0);

  // Anuncios retirados o eliminados (la API ya no los devuelve): se quitan solos y se avisa una vez.
  const goneKey = gone.join(",");
  useEffect(() => {
    if (!goneKey) return;
    const list = goneKey.split(",");
    if (shared) router.replace(compareSharePath(sharedIds.filter((x) => !list.includes(x))), { scroll: false });
    else list.forEach((id) => removeCompare(id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemoved((n) => n + list.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goneKey, removeCompare]);

  const n = listings.length;
  const groups = useMemo(() => (now && n >= 2 ? compareGroups(listings, { now, profile }) : []), [listings, now, n, profile]);
  const summary = useMemo(() => (now && n >= 2 ? compareSummary(listings, now) : []), [listings, now, n]);

  // Pareja visible en móvil (índices válidos aunque se quiten tablas).
  const visible = n <= 2 ? listings.map((_, i) => i) : [...new Set(pair.map((i) => Math.min(i, n - 1)))].sort((a, b) => a - b);
  if (n > 2 && visible.length < 2) visible.push(visible[0] === 0 ? 1 : 0);

  const toolbar = ready && !loading && !failed && (
    <div className={styles.toolbar}>
      <span className={styles.count}>
        <strong>{n}</strong> de {MAX_COMPARE} tablas
      </span>
      {shared ? null : n < MAX_COMPARE ? (
        <Link href="/buscar" className={styles.toolLink}>
          + Añadir otra tabla
        </Link>
      ) : (
        <span className={styles.toolNote}>Máximo {MAX_COMPARE}: quita una para añadir otra</span>
      )}
      {n >= 2 && (
        <ShareButton
          url={compareSharePath(listings.map((l) => l.id))}
          title="Comparación de tablas en Reboard"
          text={`Mira estas ${n} tablas una al lado de otra: ${listings.map((l) => listingTitle(l)).join(", ")}.`}
          label="Compartir comparación"
          className={styles.toolLink}
          onShare={() => track("compare_shared", { count: n })}
        />
      )}
      {n > 0 && !shared && (
        <button type="button" className={styles.toolBtn} onClick={clearAll}>
          Vaciar comparación
        </button>
      )}
    </div>
  );

  const sharedNote = shared && (
    <div className={styles.sharedNote} role="status">
      <p>
        Estás viendo una comparación que te han compartido. La tuya ({localIds.length} {localIds.length === 1 ? "tabla" : "tablas"}) sigue guardada.
      </p>
      <div className={styles.sharedActions}>
        <button
          type="button"
          className={ui.btnStrong}
          onClick={() => {
            replaceCompare(listings.map(compareItemOf));
            router.replace("/comparar", { scroll: false });
          }}
        >
          Usar esta comparación
        </button>
        <button type="button" className={ui.btnNeutral} onClick={() => router.replace("/comparar", { scroll: false })}>
          Volver a la mía
        </button>
      </div>
    </div>
  );

  const removedNote = removed > 0 && (
    <p className={styles.notice} role="status">
      {removed === 1
        ? "Hemos quitado 1 tabla que ya no está en Reboard (retirada o eliminada por su vendedor)."
        : `Hemos quitado ${removed} tablas que ya no están en Reboard (retiradas o eliminadas por sus vendedores).`}
    </p>
  );

  if (failed) {
    return (
      <div className={styles.empty} role="alert">
        <p className={styles.emptyTitle}>No hemos podido cargar las tablas.</p>
        <button type="button" className={ui.btnStrong} onClick={retry}>
          Reintentar
        </button>
      </div>
    );
  }

  if (loading || !now) {
    if (ready && !ids.length) return <EmptyState toolbar={toolbar} note={removedNote} />;
    return (
      <>
        <div className={styles.skeleton} aria-hidden="true" />
        <span className="visually-hidden" role="status">
          Cargando la comparación…
        </span>
      </>
    );
  }

  if (n === 0) return <EmptyState toolbar={toolbar} note={removedNote} />;

  if (n === 1) {
    const l = listings[0];
    return (
      <>
        {toolbar}
        {sharedNote}
        {removedNote}
        <div className={styles.single}>
          <BoardCard l={l} i={0} now={now} onRemove={() => removeOne(l.id)} />
          <div className={styles.singleText}>
            <h2 className={styles.h2}>Añade otra tabla para compararla</h2>
            <p>Pulsa «Comparar» en cualquier tabla del buscador o de su ficha. Puedes comparar hasta {MAX_COMPARE}.</p>
            <div className={styles.singleActions}>
              <Link href={searchHref(withFilters({ shapes: [l.shape] }))} className={ui.btnStrong}>
                Buscar tablas parecidas
              </Link>
              <Link href="/buscar" className={ui.btnNeutral}>
                Ver todas las tablas
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const shownGroups = groups.map((g) => ({ ...g, rows: onlyDiff ? g.rows.filter((r) => r.diff) : g.rows })).filter((g) => g.rows.length);
  const cols = mobile ? visible : listings.map((_, i) => i);

  return (
    <>
      {toolbar}
      {sharedNote}
      {removedNote}

      {/* Tarjetas de las tablas: en móvil, una tira con desplazamiento propio (nunca la página). */}
      <ol className={styles.cards} aria-label="Tablas en comparación" data-n={n}>
        {listings.map((l, i) => (
          <li key={l.id}>
            <BoardCard l={l} i={i} now={now} onRemove={() => removeOne(l.id)} />
          </li>
        ))}
      </ol>

      <div className={styles.insights}>
        <section className={styles.summary} aria-labelledby="cmp-summary">
          <h2 id="cmp-summary" className={styles.h2}>
            Diferencias principales
          </h2>
          <ul className={styles.summaryList}>
            {summary.map((s) => (
              <li key={s.key}>{s.text}</li>
            ))}
          </ul>
        </section>
        <FitPanel listings={listings} profile={profile} />
      </div>

      <div className={styles.tableHead}>
        <h2 className={styles.h2}>Ficha técnica, una al lado de otra</h2>
        <label className={styles.toggle}>
          <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
          Solo lo que cambia
        </label>
      </div>

      {mobile ? (
        <MobileSpecs
          groups={shownGroups}
          listings={listings}
          cols={cols}
          selector={
            n > 2 && (
              <div className={styles.pairBar} role="group" aria-label="Tablas que ves en la comparación">
                <span className={styles.pairLabel}>Ver 2 de {n}:</span>
                {listings.map((l, i) => (
                  <button
                    key={l.id}
                    type="button"
                    className={styles.pairChip}
                    aria-pressed={visible.includes(i)}
                    aria-label={`Tabla ${LETTERS[i]}: ${listingTitle(l)}`}
                    onClick={() => setPair(([x, y]) => (i === x || i === y ? [x, y] : [y, i]))}
                  >
                    {LETTERS[i]}
                  </button>
                ))}
              </div>
            )
          }
        />
      ) : (
        <DesktopSpecs groups={shownGroups} listings={listings} />
      )}
      {onlyDiff && !shownGroups.length && <p className={styles.notice}>Estas tablas coinciden en todos los datos indicados.</p>}

      <p className={styles.footnote}>
        Los datos los indica cada vendedor (o el fabricante, si la medida es de catálogo). «Sin indicar» significa que el anuncio no lo
        dice: no lo suponemos.
      </p>
    </>
  );
}

/** Tarjeta de una tabla: letra, foto, nombre, precio, isla, estado, «Ver tabla» y quitar. */
function BoardCard({ l, i, now, onRemove }: { l: Listing; i: number; now: Date; onRemove: () => void }) {
  const title = listingTitle(l);
  const href = listingPath(l);
  const photo = l.photos[0];
  const av = availability(l, now);
  return (
    <article className={styles.card} aria-label={`Tabla ${LETTERS[i]}: ${title}`}>
      <span className={styles.letter} aria-hidden="true">
        {LETTERS[i]}
      </span>
      <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Quitar ${title} de la comparación`}>
        <span aria-hidden="true">✕</span>
      </button>
      <Link href={href} className={styles.photo} tabIndex={-1} aria-hidden="true">
        {photo ? <Image src={photo.url} alt="" fill sizes="(max-width: 759px) 70vw, 300px" className={styles.img} /> : <BoardShape shape={l.shape} size={84} />}
      </Link>
      <div className={styles.cardBody}>
        <Link href={href} className={styles.cardTitle}>
          {title}
        </Link>
        <div className={styles.price}>{eur(l.price)}</div>
        <div className={styles.place}>{l.town ? `${l.town}, ${zoneName(l)}` : zoneName(l)}</div>
        <div className={styles.status} data-tone={av.tone}>
          <span className={styles.dot} aria-hidden="true" />
          {av.text}
        </div>
        <Link href={href} className={`${ui.btnStrong} ${styles.view}`}>
          Ver tabla
          <span className="visually-hidden">: {title}</span>
        </Link>
      </div>
    </article>
  );
}

/** Rango orientativo de TablaFinder frente a los litros de cada tabla. Sin porcentajes ni «tabla perfecta». */
function FitPanel({ listings, profile }: { listings: Listing[]; profile: SurferProfile | null }) {
  if (!profile) {
    return (
      <aside className={styles.fit} data-empty aria-labelledby="cmp-fit">
        <h2 id="cmp-fit" className={styles.h3}>
          ¿Cuántos litros te van bien?
        </h2>
        <p>Responde 7 preguntas en TablaFinder y aquí verás qué tablas entran en tu rango orientativo de litros.</p>
        <Link href="/calculadora-litros" className={styles.fitLink}>
          Calcular mis litros
        </Link>
      </aside>
    );
  }
  return (
    <aside className={styles.fit} aria-labelledby="cmp-fit">
      <h2 id="cmp-fit" className={styles.h3}>
        Tu rango orientativo: {profile.lo}–{profile.hi} L
      </h2>
      <ul className={styles.fitList}>
        {listings.map((l, i) => {
          const f = fitOf(l.volume.value, profile);
          return (
            <li key={l.id} data-state={f.state}>
              <span className={styles.fitLetter}>{LETTERS[i]}</span>
              <span className={styles.fitVol}>{l.volume.value != null ? `${String(l.volume.value).replace(".", ",")} L` : "—"}</span>
              <span>{fitText(l.volume.value, profile)}</span>
            </li>
          );
        })}
      </ul>
      <p className={styles.fitNote}>
        Es una orientación según tu peso ({profile.weight} kg) y tu nivel ({profile.level.toLowerCase()}): el tipo de ola, la forma de la tabla y tu
        forma física también cuentan.{" "}
        <Link href="/calculadora-litros" className={styles.inlineLink}>
          Cambiar mis respuestas
        </Link>
      </p>
    </aside>
  );
}

function DesktopSpecs({ groups, listings }: { groups: CompareGroup[]; listings: Listing[] }) {
  return (
    <div className={styles.rail} role="region" aria-label="Ficha técnica comparada" tabIndex={0}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          Comparación de {listings.length} tablas ({listings.map((l, i) => `${LETTERS[i]}: ${listingTitle(l)}`).join("; ")}). Las filas marcadas tienen valores distintos.
        </caption>
        <colgroup>
          <col className={styles.labelCol} />
          {listings.map((l) => (
            <col key={l.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <td />
            {listings.map((l, i) => (
              <th key={l.id} scope="col" className={styles.colHead}>
                <span className={styles.letterSm}>{LETTERS[i]}</span> {l.brand ?? "Sin marca"} {l.sizeLabel}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.title}>
            <tr className={styles.groupRow}>
              <th scope="colgroup" colSpan={listings.length + 1}>
                {g.title}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.key} data-diff={r.diff || undefined}>
                <th scope="row" className={styles.label}>
                  {r.label}
                  {/* Con 3 o 4 tablas casi todo cambia: se señala lo que es igual, que es lo raro. */}
                  {r.diff ? <span className="visually-hidden"> (cambia entre las tablas)</span> : <span className={styles.sameTag}>Igual en todas</span>}
                </th>
                {r.cells.map((c, i) => (
                  <td key={listings[i].id} className={styles.cell} data-tone={c.tone} data-num={r.numeric || undefined}>
                    {c.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** Móvil: cada dato con su etiqueta encima y los valores de las dos tablas visibles en columnas. */
function MobileSpecs({ groups, listings, cols, selector }: { groups: CompareGroup[]; listings: Listing[]; cols: number[]; selector: React.ReactNode }) {
  return (
    <div className={styles.mSpecs}>
      {/* Fijo arriba al desplazarse: qué dos tablas estás viendo y cómo cambiarlas. */}
      <div className={styles.mSticky}>
        {selector}
        <div className={styles.mHead} aria-hidden="true">
        {cols.map((i) => (
          <div key={listings[i].id} className={styles.mHeadCell}>
            <span className={styles.letterSm}>{LETTERS[i]}</span>
            <span className={styles.mHeadName}>
              {listings[i].brand ?? "Sin marca"} {listings[i].sizeLabel}
            </span>
          </div>
        ))}
        </div>
      </div>
      {groups.map((g) => (
        <section key={g.title} className={styles.mGroup} aria-label={g.title}>
          <h3 className={styles.mGroupTitle}>{g.title}</h3>
          <dl className={styles.mList}>
            {g.rows.map((r) => (
              <div key={r.key} className={styles.mRow} data-diff={r.diff || undefined}>
                <dt className={styles.mLabel}>
                  {r.label}
                  {!r.diff && <span className={styles.sameTag}>Igual</span>}
                </dt>
                {cols.map((i) => (
                  <dd key={listings[i].id} className={styles.mCell} data-tone={r.cells[i].tone} data-num={r.numeric || undefined}>
                    <span className="visually-hidden">Tabla {LETTERS[i]}: </span>
                    {r.cells[i].text}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function EmptyState({ toolbar, note }: { toolbar: React.ReactNode; note: React.ReactNode }) {
  return (
    <>
      {toolbar}
      {note}
      <div className={styles.empty}>
        <div className={styles.emptyArt} aria-hidden="true">
          <BoardShape shape="evolutiva" size={70} />
          <BoardShape shape="fish" size={70} />
        </div>
        <h2 className={styles.emptyTitle}>Todavía no has elegido tablas</h2>
        <ol className={styles.steps}>
          <li>Busca tablas por litros, medidas o isla.</li>
          <li>Pulsa «Comparar» en las que te interesen (hasta {MAX_COMPARE}).</li>
          <li>Vuelve aquí y míralas una al lado de otra.</li>
        </ol>
        <div className={styles.singleActions}>
          <Link href="/buscar" className={ui.btnStrong}>
            Buscar tablas
          </Link>
          <Link href="/calculadora-litros" className={ui.btnNeutral}>
            ¿Cuántos litros necesito?
          </Link>
        </div>
      </div>
    </>
  );
}
