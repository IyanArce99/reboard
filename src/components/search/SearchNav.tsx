"use client";

// Navegación de la búsqueda: cada cambio de filtro actualiza la URL de /buscar y el servidor
// vuelve a renderizar los resultados. Mientras tanto, los resultados se atenúan.

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { SORTS, searchHref, type Filters, type Sort, type ViewState } from "@/lib/search/filters";
import styles from "./Search.module.css";

interface Nav {
  /** Hay km por anuncio (solo DEMO). Sin ellos, «Más cerca» = «Primero mi zona». */
  supportsDistance: boolean;
  filters: Filters;
  view: ViewState;
  pending: boolean;
  navigate: (f: Filters, v?: Partial<ViewState>) => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}

const Ctx = createContext<Nav | null>(null);

export const useSearchNav = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSearchNav debe usarse dentro de SearchNavProvider");
  return v;
};

export function SearchNavProvider({
  filters,
  view,
  isSearchPage,
  supportsDistance = true,
  initialSheetOpen = false,
  children,
}: {
  filters: Filters;
  view: ViewState;
  /** En /buscar se reemplaza la URL; desde una landing se navega a /buscar. */
  isSearchPage: boolean;
  supportsDistance?: boolean;
  /** Llega con ?avanzados=1 («Más filtros» de la home): la hoja móvil sale ya abierta, sin parpadeo. */
  initialSheetOpen?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(initialSheetOpen);

  const navigate = useCallback(
    (f: Filters, v?: Partial<ViewState>) => {
      // Al cambiar filtros se vuelve a la primera página; orden y vista se conservan.
      const href = searchHref(f, { sort: view.sort, view: view.view, ...v });
      start(() => {
        if (isSearchPage) router.replace(href, { scroll: false });
        else router.push(href);
      });
    },
    [router, isSearchPage, view.sort, view.view],
  );

  const value = useMemo(
    () => ({ filters, view, pending, navigate, sheetOpen, setSheetOpen, supportsDistance }),
    [filters, view, pending, navigate, sheetOpen, supportsDistance],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function PendingArea({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useSearchNav();
  return (
    <section className={className} aria-busy={pending} data-pending={pending || undefined}>
      {children}
    </section>
  );
}

export function SortSelect({ className }: { className: string }) {
  const { filters, view, navigate, supportsDistance } = useSearchNav();
  return (
    <select
      aria-label="Ordenar"
      className={className}
      value={view.sort}
      onChange={(e) => navigate(filters, { sort: e.target.value as Sort, limit: view.limit })}
    >
      {SORTS.map(([v, l]) => (
        <option key={v} value={v}>
          {v === "distancia" && !supportsDistance ? "Primero mi isla" : l}
        </option>
      ))}
    </select>
  );
}

export function ViewToggle() {
  const { filters, view, navigate } = useSearchNav();
  return (
    <div className={styles.viewToggle} role="group" aria-label="Vista">
      {(
        [
          ["grid", "Cuadrícula"],
          ["list", "Lista"],
        ] as const
      ).map(([v, l]) => (
        <button key={v} type="button" aria-pressed={view.view === v} onClick={() => navigate(filters, { view: v, limit: view.limit })}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function OpenFiltersButton({ count }: { count: number }) {
  const { sheetOpen, setSheetOpen } = useSearchNav();
  return (
    <button type="button" className={styles.mFilters} aria-expanded={sheetOpen} aria-controls="filtros" onClick={() => setSheetOpen(true)}>
      Filtros{count ? ` · ${count}` : ""}
    </button>
  );
}
