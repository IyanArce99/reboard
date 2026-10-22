import Link from "next/link";
import { BoardsIllustration } from "@/components/brand/EmptyState";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumbs, type Crumb } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlertButton } from "@/components/user/islands";
import { getRepository } from "@/lib/data";
import { brandOptions, getCatalogNames } from "@/lib/data/names";
import { num } from "@/lib/domain/format";
import { listingPath, listingTitle } from "@/lib/listing/present";
import { absoluteUrl } from "@/lib/site";
import { alertText, appliedChips, emptySuggestions } from "@/lib/search/describe";
import {
  PAGE_SIZE,
  hasVolumeFilter,
  searchHref,
  toQuery,
  withFilters,
  type Filters,
  type ViewState,
} from "@/lib/search/filters";
import { FilterPanel } from "./FilterPanel";
import { OpenFiltersButton, PendingArea, SearchNavProvider, SortSelect, ViewToggle } from "./SearchNav";
import ui from "@/styles/ui.module.css";
import styles from "./Search.module.css";

/** Escenarios de prueba del prototipo. Solo con datos DEMO. */
const PRESETS: [string, Partial<Filters>][] = [
  ["Evolutiva 7'0–7'6 · 45–60 L · <200 € · Gran Canaria", { shapes: ["evolutiva"], lenMin: 84, lenMax: 90, volMin: 45, volMax: 60, priceMax: 200, zone: "gran-canaria" }],
  ["Torq en Tenerife", { brand: "torq", zone: "tenerife" }],
  ["Shortboard 28–32 L cerca de Gijón", { shapes: ["shortboard"], volMin: 28, volMax: 32, zone: "asturias", dist: 25 }],
  ["Búsqueda sin resultados", { shapes: ["longboard"], zone: "lanzarote", priceMax: 150 }],
];

interface Props {
  filters: Filters;
  view: ViewState;
  here: string;
  title: string;
  intro: string;
  crumbs: Crumb[];
  current: Crumb;
  isSearchPage: boolean;
  /** Bloque de enlaces a landings relacionadas (solo en landings). */
  related?: React.ReactNode;
  openAdvanced?: boolean;
}

export async function SearchResults({ filters: f, view, here, title, intro, crumbs, current, isSearchPage, openAdvanced = false, related }: Props) {
  const repo = getRepository();
  const suggestions = emptySuggestions(f);
  const [names, res, unknown, facets] = await Promise.all([
    getCatalogNames(repo),
    repo.search(f, { sort: view.sort, limit: view.limit, here }),
    hasVolumeFilter(f) ? repo.unknownVolume(f, 12) : Promise.resolve({ items: [], total: 0 }),
    repo.facets(f),
  ]);
  // Recuentos de las sugerencias: solo hacen falta en el estado vacío.
  const suggestionCounts = res.total === 0 ? await Promise.all(suggestions.map((s) => repo.count(s.filters))) : [];
  const now = await repo.now();
  const shown = res.items;
  const counts = { total: facets.anyZone, zones: facets.zones, shapes: facets.shapes, brands: facets.brands };
  const applied = appliedChips(f, names);
  const alert = { text: alertText(f, names), query: toQuery(f) };
  const viewKeep = { sort: view.sort, view: view.view };
  const cardLayout = view.view === "list" ? "horizontal" : "responsive";
  const gridClass = view.view === "list" ? styles.listGrid : styles.grid;

  return (
    <main className={`container ${styles.page}`}>
      <Breadcrumbs items={crumbs} current={current} />
      <h1 className={ui.h1}>{title}</h1>
      {intro && <p className={styles.intro}>{intro}</p>}

      {repo.isDemo && (
        <div className={styles.presets}>
          <span className={ui.demoTag}>DEMO</span>
          <span className={styles.presetsLabel}>Prueba un ejemplo:</span>
          {PRESETS.map(([label, p]) => (
            <Link key={label} href={searchHref(withFilters(p))} className={styles.preset}>
              {label}
            </Link>
          ))}
        </div>
      )}

      <SearchNavProvider filters={f} view={view} isSearchPage={isSearchPage} supportsDistance={repo.capabilities.distance}>
        {/* Móvil: el botón de alerta va en esta barra; en escritorio, en la cabecera de resultados (.dControls). */}
        <div className={styles.mBar}>
          <OpenFiltersButton count={applied.length} />
          <SortSelect className={styles.mSort} />
          <AlertButton text={alert.text} query={alert.query} className={styles.mAlert} />
        </div>

        <div className={styles.layout}>
          <FilterPanel
            counts={counts}
            resultCount={res.total}
            brands={brandOptions(names)}
            models={names.models}
            openAdvanced={openAdvanced}
          />

          <PendingArea className={styles.results}>
            <h2 className="visually-hidden">Resultados</h2>
            <div className={styles.resultsHead}>
              <div className={styles.count} aria-live="polite">
                <strong>{num(res.total)}</strong> {res.total === 1 ? "tabla coincide" : "tablas coinciden"}
              </div>
              <div className={styles.dControls}>
                <SortSelect className={styles.dSort} />
                <ViewToggle />
                <AlertButton text={alert.text} query={alert.query} className={`${ui.btnStrong} ${styles.dAlert}`} />
              </div>
            </div>

            {applied.length > 0 && (
              <div className={styles.applied}>
                {applied.map((a) => (
                  <Link key={a.key} href={searchHref(a.without, viewKeep)} scroll={false} className={ui.chipApplied} aria-label={`Quitar filtro ${a.label}`}>
                    {a.label} <span aria-hidden="true">✕</span>
                  </Link>
                ))}
              </div>
            )}

            {unknown.total > 0 && (
              <div className={styles.unknown}>
                <span>
                  Hay {unknown.total} {unknown.total === 1 ? "tabla más" : "tablas más"} con estas medidas pero sin litros indicados.
                </span>
                <Link href={searchHref(f, { ...view, showUnknown: !view.showUnknown })} scroll={false}>
                  {unknown.total === 1 ? (view.showUnknown ? "Ocultarla" : "Verla") : view.showUnknown ? "Ocultarlas" : "Verlas"}
                </Link>
              </div>
            )}

            {res.total > 0 ? (
              <>
                <div className={gridClass}>
                  {shown.map((l, i) => (
                    <ListingCard key={l.id} listing={l} now={now} hereZone={here} layout={cardLayout} preload={i === 0} eager={i === 1} />
                  ))}
                </div>
                {view.showUnknown && unknown.total > 0 && (
                  <>
                    <div className={styles.unknownHead}>
                      <span>Mismas medidas · litros sin indicar</span>
                      <span className={styles.rule} />
                    </div>
                    <div className={gridClass}>
                      {unknown.items.map((l) => (
                        <ListingCard key={l.id} listing={l} now={now} hereZone={here} layout={cardLayout} />
                      ))}
                    </div>
                  </>
                )}
                <div className={styles.more}>
                  <span>
                    Mostrando {Math.min(view.limit, res.total)} de {num(res.total)}
                  </span>
                  {res.total > view.limit && (
                    <Link href={searchHref(f, { ...view, limit: view.limit + PAGE_SIZE })} scroll={false} className={ui.btnOutline}>
                      Ver más tablas
                    </Link>
                  )}
                </div>
                <div className={styles.alertBox}>
                  <div>
                    <div className={styles.alertTitle}>¿No es lo que buscas?</div>
                    <div className={styles.alertText}>Guarda esta búsqueda como alerta y vuelve a ver cuántas tablas coinciden: «{alert.text}»</div>
                  </div>
                  <AlertButton text={alert.text} query={alert.query} className={ui.btnStrong} />
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <BoardsIllustration />
                <h2 className={styles.emptyTitle}>No encontramos tablas con estos filtros</h2>
                <p className={styles.emptyText}>Amplía la búsqueda (entre paréntesis, las tablas que verías):</p>
                <div className={styles.suggestions}>
                  {suggestions.map((s, i) => (
                    <Link key={s.label} href={searchHref(s.filters, viewKeep)} scroll={false} className={ui.btnNeutral}>
                      {s.label} ({suggestionCounts[i]})
                    </Link>
                  ))}
                </div>
                <div className={styles.emptyAlert}>
                  <div>
                    <strong>O guarda la búsqueda como alerta.</strong> «{alert.text}»
                  </div>
                  <AlertButton text={alert.text} query={alert.query} className={`${ui.btnStrong} ${styles.emptyAlertBtn}`} />
                </div>
              </div>
            )}
          </PendingArea>
        </div>
      </SearchNavProvider>

      {related}

      {shown.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: title,
            numberOfItems: res.total,
            itemListElement: shown.map((l, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(listingPath(l)),
              name: listingTitle(l),
            })),
          }}
        />
      )}
    </main>
  );
}
