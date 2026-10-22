"use client";

// Carga en el cliente los anuncios cuyos ids viven en localStorage (guardadas y comparador).
// Solo pide al servidor los ids que aún no tiene: quitar uno no vuelve a mostrar el estado de carga.

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Listing } from "@/lib/domain/types";
import { zoneBySlug } from "@/lib/domain/taxonomy";
import { DEFAULT_HERE, HERE_COOKIE } from "@/lib/here";

interface Cache {
  byId: Record<string, Listing>;
  /** Ids pedidos que el servidor no devolvió (anuncio eliminado). */
  gone: string[];
  now: string | null;
}

const EMPTY: Cache = { byId: {}, gone: [], now: null };

export function useListings(ids: string[], ready: boolean) {
  const [cache, setCache] = useState<Cache>(EMPTY);
  const [error, setError] = useState<{ key: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const missing = ids.filter((id) => !cache.byId[id] && !cache.gone.includes(id));
  const key = missing.join(",");
  const failed = !!error && error.key === key;

  useEffect(() => {
    if (!ready || !key) return;
    const ctrl = new AbortController();
    fetch(`/api/anuncios?ids=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ listings: Listing[]; now: string }>;
      })
      .then((data) => {
        setCache((c) => {
          const byId = { ...c.byId };
          for (const l of data.listings) byId[l.id] = l;
          const gone = [...c.gone, ...key.split(",").filter((id) => !byId[id])];
          return { byId, gone, now: data.now };
        });
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) {
          console.error(e);
          setError({ key });
        }
      });
    return () => ctrl.abort();
  }, [ready, key, attempt]);

  return {
    listings: ids.map((id) => cache.byId[id]).filter((l): l is Listing => !!l),
    /** Ids guardados que ya no existen en Reboard. */
    gone: ids.filter((id) => cache.gone.includes(id)),
    now: cache.now ? new Date(cache.now) : null,
    loading: !ready || (missing.length > 0 && !failed),
    failed,
    retry: () => {
      setError(null);
      setAttempt((n) => n + 1);
    },
  };
}

// Zona de referencia («cerca de ti») desde la cookie que guarda el buscador.
const noop = () => () => {};
function readHere() {
  const v = document.cookie.match(new RegExp(`(?:^|; )${HERE_COOKIE}=([^;]*)`))?.[1] ?? "";
  return zoneBySlug(v) ? v : DEFAULT_HERE;
}

export function useHereZone() {
  return useSyncExternalStore(noop, readHere, () => DEFAULT_HERE);
}
