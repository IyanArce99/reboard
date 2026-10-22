import Link from "next/link";
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
  openAdvanced?: boolean;
}

export async function SearchResults({ filters: f, view, here, title, intro, crumbs, current, isSearchPage, openAdvanced = false }: Props) {
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
  const counts = { total: facets.anyZone, zones: facets.zones, shapes: facets.shapes };
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
          <span className={styles.presetsLabel}>Prueba un caso real:</span>
          {PRESETS.map(([label, p]) => (
            <Link key={label} href={searchHref(withFilters(p))} className={styles.preset}>
              {label}
            </Link>
          ))}
        </div>
      )}

      <SearchNavProvider filters={f} view={view} isSearchPage={isSearchPage} supportsDistance={repo.capabilities.distance}>
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
            <div className={styles.resultsHead}>
              <div className={styles.count} aria-live="polite">
                <strong>{num(res.total)}</strong> {res.total === 1 ? "tabla coincide" : "tablas coinciden"}
              </div>
              <div className={styles.dControls}>
                <SortSelect className={styles.dSort} />
                <ViewToggle />
                <AlertButton text={alert.text} query={alert.query} className={styles.saveSearch}>
                  Guardar búsqueda
                </AlertButton>
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
                  También hay {unknown.total} tabla{unknown.total > 1 ? "s" : ""} con estas medidas cuyos litros no están indicados.
                </span>
                <Link href={searchHref(f, { ...view, showUnknown: !view.showUnknown })} scroll={false}>
                  {view.showUnknown ? "Ocultarlas" : "Verlas"}
                </Link>
              </div>
            )}

            {res.total > 0 ? (
              <>
                <div className={gridClass}>
                  {shown.map((l, i) => (
                    <ListingCard key={l.id} listing={l} now={now} hereZone={here} layout={cardLayout} preload={i === 0} />
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
                    <div className={styles.alertText}>Te avisamos cuando se publique: «{alert.text}»</div>
                  </div>
                  <AlertButton text={alert.text} query={alert.query} className={ui.btnStrong} />
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <h2 className={styles.emptyTitle}>No encontramos tablas con estos filtros</h2>
                <div className={styles.emptyTag}>Tu próxima tabla ya existe; puede que aún no esté publicada.</div>
                <p className={styles.emptyText}>Prueba a ampliar la búsqueda. Entre paréntesis, cuántas tablas aparecerían.</p>
                <div className={styles.suggestions}>
                  {suggestions.map((s, i) => (
                    <Link key={s.label} href={searchHref(s.filters, viewKeep)} scroll={false} className={ui.btnNeutral}>
                      {s.label} ({suggestionCounts[i]})
                    </Link>
                  ))}
                </div>
                <div className={styles.emptyAlert}>
                  <div>
                    <strong>O espera a que aparezca.</strong> «{alert.text}»
                  </div>
                  <AlertButton text={alert.text} query={alert.query} className={`${ui.btnStrong} ${styles.emptyAlertBtn}`}>
                    Crear alerta con estos filtros
                  </AlertButton>
                </div>
              </div>
            )}
          </PendingArea>
        </div>
      </SearchNavProvider>

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
