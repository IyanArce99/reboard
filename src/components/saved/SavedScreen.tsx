"use client";

// Guardado y alertas (/guardado y /alertas). El estado vive en este dispositivo (UserStateProvider).
// El envío real de avisos (email/push) está pendiente (docs/ROADMAP.md): la interfaz no lo promete.

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/brand/EmptyState";
import { ListingCard } from "@/components/listing/ListingCard";
import { useUserState, type SavedAlert } from "@/components/user/UserStateProvider";
import { eur } from "@/lib/domain/format";
import type { Listing } from "@/lib/domain/types";
import { isReserved } from "@/lib/listing/present";
import { searchHref, withFilters } from "@/lib/search/filters";
import { useHereZone, useListings } from "./useListings";
import ui from "@/styles/ui.module.css";
import styles from "./Saved.module.css";

type Tab = "saved" | "alerts";

export function SavedScreen({ tab }: { tab: Tab }) {
  const { saved, alerts, ready } = useUserState();
  const tabs: [Tab, string, string][] = [
    ["saved", "/guardado", ready ? `Tablas guardadas · ${saved.length}` : "Tablas guardadas"],
    ["alerts", "/alertas", ready ? `Búsquedas guardadas · ${alerts.length}` : "Búsquedas guardadas"],
  ];
  return (
    <>
      <nav className={styles.tabs} aria-label="Guardadas y búsquedas">
        {tabs.map(([v, href, label]) => (
          <Link key={v} href={href} className={styles.tab} aria-current={tab === v ? "page" : undefined} scroll={false}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === "saved" ? <SavedList /> : <AlertList />}
    </>
  );
}

/** Tablas parecidas a una guardada que ya no está: mismo tipo y ±5 L si los indica. */
function similarHref(l: Listing) {
  const v = l.volume.value;
  return searchHref(withFilters({ shapes: [l.shape], ...(v != null ? { volMin: Math.max(0, Math.round(v - 5)), volMax: Math.round(v + 5) } : {}) }));
}

function savedNote(l: Listing, now: Date): { text: string; tone: "sold" | "drop" | "reserved" } | null {
  if (l.status === "vendida") return { text: "Vendida", tone: "sold" };
  if (l.status === "caducada" || l.status === "retirada") return { text: "Ya no está a la venta", tone: "sold" };
  if (isReserved(l, now)) return { text: "Reservada por otra persona · puede quedar libre", tone: "reserved" };
  if (l.previousPrice != null && l.previousPrice > l.price)
    return { text: `Ha bajado de ${eur(l.previousPrice)} a ${eur(l.price)}`, tone: "drop" };
  return null;
}

function SavedList() {
  const { saved, ready, toggleSaved } = useUserState();
  const { listings, gone, now, loading, failed, retry } = useListings(saved, ready);
  const here = useHereZone();

  if (ready && !saved.length) {
    return (
      <EmptyState
        title="Aún no has guardado tablas"
        actions={
          <Link href="/buscar" className={ui.btnPrimary}>
            Buscar tablas
          </Link>
        }
      >
        Pulsa el corazón en cualquier anuncio y aquí verás si baja de precio o se vende. Se guardan en este dispositivo.
      </EmptyState>
    );
  }
  if (failed) return <LoadError retry={retry} />;

  // Huecos con la forma de la tarjeta mientras carga, para que la cuadrícula no salte.
  const skeletons = !loading ? 0 : !ready ? 2 : Math.min(Math.max(saved.length - listings.length - gone.length, 1), 8);

  return (
    <div aria-busy={loading || undefined}>
      {gone.length > 0 && (
        <p className={styles.gone}>
          {gone.length === 1 ? "1 tabla que guardaste ya no está en Reboard." : `${gone.length} tablas que guardaste ya no están en Reboard.`}{" "}
          <button type="button" className={styles.linkBtn} onClick={() => gone.forEach((id) => toggleSaved(id))}>
            {gone.length === 1 ? "Quitarla de la lista" : "Quitarlas de la lista"}
          </button>
        </p>
      )}
      <h2 className="visually-hidden">Tablas guardadas</h2>
      <div className={styles.grid}>
        {now &&
          listings.map((l) => {
            const note = savedNote(l, now);
            return (
              <div key={l.id} className={styles.item}>
                {note && (
                  <div className={styles.note} data-tone={note.tone}>
                    {note.text}
                    {/* Vendida o retirada: salida directa a tablas parecidas (mismo tipo, litros cercanos). */}
                    {note.tone === "sold" && (
                      <>
                        {" · "}
                        <Link href={similarHref(l)} className={styles.noteLink}>
                          Ver parecidas
                        </Link>
                      </>
                    )}
                  </div>
                )}
                <ListingCard listing={l} now={now} hereZone={here} layout="responsive" />
              </div>
            );
          })}
        {Array.from({ length: skeletons }, (_, i) => (
          <div key={`s${i}`} className={styles.skeleton} aria-hidden="true" />
        ))}
      </div>
      {loading && <span className={styles.srOnly} role="status">Cargando tus tablas guardadas…</span>}
    </div>
  );
}

function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className={styles.empty} role="alert">
      No hemos podido cargar las tablas.{" "}
      <button type="button" className={styles.linkBtn} onClick={retry}>
        Reintentar
      </button>
    </div>
  );
}

function AlertList() {
  const { alerts, ready } = useUserState();
  return (
    <div className={styles.alerts}>
      <p className={styles.alertInfo}>
        Tus búsquedas se guardan solo en este dispositivo y no envían avisos. Vuelve aquí cuando quieras para ver cuántas tablas coinciden con cada una.
      </p>
      {!ready ? (
        <div className={styles.alertSkeleton} aria-hidden="true" />
      ) : alerts.length ? (
        alerts.map((a) => <AlertRow key={a.id} alert={a} />)
      ) : (
        <EmptyState
          title="No tienes búsquedas guardadas"
          actions={
            <>
              <Link href="/buscar" className={ui.btnPrimary}>
                Buscar tablas
              </Link>
              <Link href="/calculadora-litros" className={ui.btnNeutral}>
                ¿Qué tabla necesito?
              </Link>
            </>
          }
        >
          Busca con tus medidas y pulsa «Guardar búsqueda». Se queda aquí, en este dispositivo, y cada vez que entres verás cuántas tablas coinciden.
        </EmptyState>
      )}
    </div>
  );
}

function useCount(query: string) {
  const [res, setRes] = useState<{ query: string; count: number | null } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/tablas/recuento?${query}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ count: number }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => setRes({ query, count: d.count }))
      .catch(() => {
        if (!ctrl.signal.aborted) setRes({ query, count: null });
      });
    return () => ctrl.abort();
  }, [query]);
  return res && res.query === query ? res : undefined;
}

function AlertRow({ alert: a }: { alert: SavedAlert }) {
  const { removeAlert } = useUserState();
  const res = useCount(a.query);
  const textId = `alerta-${a.id}`;
  const count =
    res === undefined
      ? "contando tablas…"
      : res.count == null
        ? "no hemos podido contar las tablas"
        : res.count === 1
          ? "1 tabla coincide ahora"
          : `${res.count} tablas coinciden ahora`;
  return (
    <div className={styles.alert}>
      <div className={styles.alertBody}>
        <div id={textId} className={styles.alertText}>
          {a.text}
        </div>
        <div className={styles.alertMeta}>{count}</div>
      </div>
      <Link href={a.query ? `/buscar?${a.query}` : "/buscar"} className={styles.view}>
        Ver resultados
      </Link>
      <button type="button" className={styles.del} aria-label={`Eliminar búsqueda: ${a.text}`} onClick={() => removeAlert(a.id)}>
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
