"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import {
  CONDITIONS,
  CONDITION_LABEL,
  CONSTRUCTIONS,
  CONSTRUCTION_INFO,
  LENGTH_STEPS,
  REGIONS,
  SELLER_LABEL,
  SELLER_TYPES,
  NO_BRAND,
  SHAPES,
  SHAPE_INFO,
  ZONES,
  LAUNCH,
  regionBySlug,
} from "@/lib/domain/taxonomy";
import { ftLabel, inToCm, num } from "@/lib/domain/format";
import { FIN_OPTIONS, emptyFilters, toQuery, type Filters } from "@/lib/search/filters";
import { CloseIcon } from "@/components/icons";
import { fieldToInches } from "@/lib/publish/parse";
import { VOLUME_CHIPS } from "./SearchBar";
import { useUserState } from "@/components/user/UserStateProvider";
import { useSearchNav } from "./SearchNav";
import ui from "@/styles/ui.module.css";
import styles from "./Search.module.css";

export interface PanelCounts {
  total: number;
  zones: Record<string, number>;
  shapes: Record<string, number>;
  brands: Record<string, number>;
}

interface Props {
  counts: PanelCounts;
  /** false si no hay ninguna tabla publicada: sin recuentos («0» en todo) ni opciones atenuadas. */
  showCounts?: boolean;
  resultCount: number;
  brands: { slug: string; name: string }[];
  models: { slug: string; name: string; brandSlug: string }[];
  openAdvanced: boolean;
}

const DISTANCES: [string, string][] = [
  ["", "Cualquier distancia"],
  ["10", "Menos de 10 km"],
  ["25", "Menos de 25 km"],
  ["50", "Menos de 50 km"],
];

const MOBILE = "(max-width: 759px)";
/** Marcas visibles antes de «Ver todas»: las que más tablas tienen con los filtros actuales. */
const TOP_BRANDS = 8;
const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const parseNum = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : null;
};

/** Anchura o grosor como lo escriba la gente («21 1/2"», «21½», «21,5», «52 cm») → pulgadas. */
const readInches = (k: "width" | "thick") => (s: string) => {
  const n = fieldToInches(k, s, "ft");
  return n == null ? null : Math.round(n * 1000) / 1000;
};

/** Campo numérico controlado: conserva lo que se escribe («4,») y se sincroniza si el valor cambia fuera. */
function NumField({
  value,
  onValue,
  parse = parseNum,
  ...rest
}: {
  value: number | null;
  onValue: (v: number | null) => void;
  /** Lectura del texto (por defecto, un número con coma o punto). */
  parse?: (s: string) => number | null;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (parse(text) !== value) setText(value == null ? "" : String(value));
  }
  return (
    <input
      {...rest}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onValue(parse(e.target.value));
      }}
    />
  );
}

export function FilterPanel({ counts, showCounts = true, resultCount, brands, models, openAdvanced }: Props) {
  const { filters, navigate, sheetOpen, setSheetOpen, supportsDistance } = useSearchNav();
  const { profile } = useUserState();
  const [draft, setDraft] = useState(filters);
  const [adv, setAdv] = useState(openAdvanced);
  const [allBrands, setAllBrands] = useState(false);
  // Última query enviada desde este panel: sus propios cambios no deben resetear el borrador.
  const [committed, setCommitted] = useState(() => toQuery(filters));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sheetRef = useRef<HTMLElement>(null);

  // Si los filtros cambian desde fuera (chips, sugerencias, atrás/adelante), se descarta el borrador.
  const q = toQuery(filters);
  const [lastQ, setLastQ] = useState(q);
  const [resets, setResets] = useState(0);
  if (q !== lastQ) {
    setLastQ(q);
    if (q !== committed) {
      setCommitted(q);
      setDraft(filters);
      setResets((n) => n + 1);
    }
  }
  // …y también el envío pendiente de un campo de texto: si no, al quitar un chip mientras se escribe,
  // el temporizador volvía a navegar con el borrador antiguo y deshacía el cambio.
  useEffect(() => {
    if (resets) clearTimeout(timer.current);
  }, [resets]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Solo la hoja móvil es un diálogo modal: foco dentro, Tab atrapado y vuelta al botón «Filtros».
  // En escritorio el panel es una barra lateral normal.
  const isMobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE).matches, () => false);
  const isSheet = sheetOpen && isMobile;
  useDialogFocus(isSheet, sheetRef);

  // Con ?avanzados=1 la hoja empieza abierta (también en el HTML del servidor, sin parpadeo). En
  // escritorio no hay hoja, así que se cierra el estado para que no bloquee el scroll.
  useEffect(() => {
    if (openAdvanced && !window.matchMedia(MOBILE).matches) setSheetOpen(false);
  }, [openAdvanced, setSheetOpen]);

  useEffect(() => {
    if (!isSheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isSheet, setSheetOpen]);

  const commit = (f: Filters, delay: number) => {
    setDraft(f);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCommitted(toQuery(f));
      navigate(f);
    }, delay);
  };
  const set = (p: Partial<Filters>) => commit({ ...draft, ...p }, 0);
  const setTyped = (p: Partial<Filters>) => commit({ ...draft, ...p }, 500);

  const f = draft;
  const isRegion = Boolean(regionBySlug(f.zone));
  const visibleModels = models.filter((m) => !f.brand || m.brandSlug === f.brand);
  // Marcas como chips (antes, un desplegable escondido en «más filtros»): ordenadas por número de
  // tablas, sin las que no tienen ninguna (salvo la elegida) y «Sin marca» siempre al final.
  const brandChips = brands
    .filter((b) => b.slug !== NO_BRAND.slug)
    .map((b) => ({ ...b, n: counts.brands[b.slug] ?? 0 }))
    .filter((b) => b.n > 0 || b.slug === f.brand)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "es"));
  const shownBrands = allBrands ? brandChips : brandChips.filter((b, i) => i < TOP_BRANDS || b.slug === f.brand);
  const noBrandCount = counts.brands[NO_BRAND.slug] ?? 0;
  const hasFilters = toQuery(f) !== toQuery(emptyFilters());
  const n = (v: number | undefined) => (showCounts ? ` (${num(v ?? 0)})` : "");
  const showBrands = shownBrands.length > 0 || noBrandCount > 0 || Boolean(f.brand);
  const lens = LENGTH_STEPS.map((i) => ({ v: String(i), l: `${ftLabel(i)} · ${inToCm(i)} cm` }));

  return (
    <aside
      ref={sheetRef}
      id="filtros"
      tabIndex={-1}
      className={styles.panel}
      data-open={sheetOpen || undefined}
      aria-label="Filtros"
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet || undefined}
    >
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Filtros</span>
        <div className={styles.panelHeadActions}>
          {hasFilters && (
            <button type="button" className={`${styles.linkBtn} ${styles.dOnly}`} onClick={() => commit(emptyFilters(), 0)}>
              Limpiar
            </button>
          )}
          <button type="button" aria-label="Cerrar" className={`${styles.closeBtn} ${styles.mOnly}`} onClick={() => setSheetOpen(false)}>
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.group}>
          <label className={ui.label} htmlFor="f-zona">
            {LAUNCH.zoneTitle}
          </label>
          <select id="f-zona" className={ui.select} value={f.zone} onChange={(e) => set({ zone: e.target.value, ...(e.target.value ? {} : { dist: null }) })}>
            <option value="">{`${LAUNCH.allLabel}${n(counts.total)}`}</option>
            {/* Con una sola región activa, la región es lo mismo que «Todas las islas»: no se repite. */}
            {REGIONS.length > 1 &&
              REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {`${r.name}${n(counts.zones[r.slug])}`}
                </option>
              ))}
            {[...new Set(ZONES.map((z) => z.group ?? ""))].map((g) => (
              <optgroup key={g || "zonas"} label={g || "Zonas"}>
                {ZONES.filter((z) => (z.group ?? "") === g).map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {`${z.name}${n(counts.zones[z.slug])}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {supportsDistance && (
          <select
            aria-label="Distancia"
            className={`${ui.select} ${styles.selectSm}`}
            value={f.dist ?? ""}
            disabled={!f.zone || isRegion}
            onChange={(e) => set({ dist: e.target.value ? Number(e.target.value) : null })}
          >
            {DISTANCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          )}
        </div>

        <div className={styles.group}>
          <span className={ui.label} id="f-litros">
            Litros
          </span>
          <div className={styles.range}>
            <NumField
              className={`${ui.input} ${ui.mono}`}
              inputMode="decimal"
              placeholder="mín."
              aria-label="Litros mínimos"
              value={f.volMin}
              onValue={(v) => setTyped({ volMin: v })}
            />
            <span aria-hidden="true">–</span>
            <NumField
              className={`${ui.input} ${ui.mono}`}
              inputMode="decimal"
              placeholder="máx."
              aria-label="Litros máximos"
              value={f.volMax}
              onValue={(v) => setTyped({ volMax: v })}
            />
          </div>
          <div className={styles.volChips} aria-labelledby="f-litros">
            {VOLUME_CHIPS.map(([a, b]) => (
              <button
                key={a}
                type="button"
                className={`${ui.chip} ${ui.chipSm} ${ui.chipMono}`}
                aria-pressed={f.volMin === a && f.volMax === b}
                onClick={() => set({ volMin: a, volMax: b })}
              >
                {a}
                {b ? `–${b}` : "+"} L
              </button>
            ))}
          </div>
          {profile && (
            <button
              type="button"
              className={styles.onlyMe}
              aria-pressed={Boolean(f.fit)}
              onClick={() => set({ fit: f.fit ? null : { lo: profile.lo, hi: profile.hi } })}
            >
              <span className={styles.onlyMeBox} aria-hidden="true" />
              <span>
                <strong>Solo mi rango de litros</strong>
                <br />
                <span className={styles.onlyMeText}>
                  {profile.lo}–{profile.hi} L, según el asistente ({profile.level.toLowerCase()}, {profile.weight} kg)
                </span>
              </span>
            </button>
          )}
        </div>

        <div className={styles.group}>
          <span className={ui.label}>Longitud</span>
          <div className={styles.two}>
            <select
              aria-label="Longitud mínima"
              className={`${ui.select} ${styles.selectMono}`}
              value={f.lenMin ?? ""}
              onChange={(e) => set({ lenMin: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Desde…</option>
              {lens.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
            <select
              aria-label="Longitud máxima"
              className={`${ui.select} ${styles.selectMono}`}
              value={f.lenMax ?? ""}
              onChange={(e) => set({ lenMax: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Hasta…</option>
              {lens.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.group}>
          <span className={ui.label}>Tipo de tabla</span>
          <div className={styles.chips}>
            {SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                className={`${ui.chip} ${showCounts && !counts.shapes[s] ? styles.zero : ""}`}
                aria-pressed={f.shapes.includes(s)}
                onClick={() => set({ shapes: toggle(f.shapes, s) })}
              >
                {SHAPE_INFO[s].label}
                {showCounts && <span className={styles.optCount}>{num(counts.shapes[s] ?? 0)}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Marca: solo con marcas que tengan tablas (o la elegida). Sin inventario, el grupo no aparece. */}
        {showBrands && (
        <div className={styles.group} role="group" aria-labelledby="f-marca">
          <span className={ui.label} id="f-marca">
            Marca
          </span>
          <div className={styles.chips}>
            {shownBrands.map((b) => (
              <button
                key={b.slug}
                type="button"
                className={ui.chip}
                aria-pressed={f.brand === b.slug}
                onClick={() => set({ brand: f.brand === b.slug ? "" : b.slug, model: "" })}
              >
                {b.name}
                {showCounts && <span className={styles.optCount}>{num(b.n)}</span>}
              </button>
            ))}
            {(noBrandCount > 0 || f.brand === NO_BRAND.slug) && (
              <button
                type="button"
                className={`${ui.chip} ${showCounts && !noBrandCount ? styles.zero : ""}`}
                aria-pressed={f.brand === NO_BRAND.slug}
                onClick={() => set({ brand: f.brand === NO_BRAND.slug ? "" : NO_BRAND.slug, model: "" })}
              >
                {NO_BRAND.label}
                {showCounts && <span className={styles.optCount}>{num(noBrandCount)}</span>}
              </button>
            )}
          </div>
          {brandChips.length > TOP_BRANDS && (
            <button type="button" className={styles.moreLink} aria-expanded={allBrands} onClick={() => setAllBrands((a) => !a)}>
              {allBrands ? "Ver menos marcas" : `Ver todas las marcas (${brandChips.length})`}
            </button>
          )}
          {f.brand && f.brand !== NO_BRAND.slug && visibleModels.length > 0 && (
            <label className={`${ui.label} ${styles.field}`}>
              Modelo
              <select className={`${ui.select} ${styles.selectField}`} value={f.model} onChange={(e) => set({ model: e.target.value })}>
                <option value="">Cualquier modelo</option>
                {visibleModels.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        )}

        <div className={styles.group}>
          <span className={ui.label}>Precio (€)</span>
          <div className={styles.range}>
            <NumField
              className={`${ui.input} ${ui.mono}`}
              inputMode="numeric"
              placeholder="mín."
              aria-label="Precio mínimo"
              value={f.priceMin}
              onValue={(v) => setTyped({ priceMin: v })}
            />
            <span aria-hidden="true">–</span>
            <NumField
              className={`${ui.input} ${ui.mono}`}
              inputMode="numeric"
              placeholder="máx."
              aria-label="Precio máximo"
              value={f.priceMax}
              onValue={(v) => setTyped({ priceMax: v })}
            />
          </div>
          <input
            type="range"
            min={50}
            max={600}
            step={10}
            aria-label="Precio máximo (deslizador)"
            className={styles.slider}
            style={{ "--p": `${(((f.priceMax ?? 600) - 50) / 550) * 100}%` } as React.CSSProperties}
            value={f.priceMax ?? 600}
            onChange={(e) => setTyped({ priceMax: e.target.value === "600" ? null : Number(e.target.value) })}
          />
        </div>

        <div className={styles.group}>
          <span className={ui.label}>Construcción</span>
          <div className={styles.chips}>
            {CONSTRUCTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={ui.chip}
                aria-pressed={f.constructions.includes(c)}
                onClick={() => set({ constructions: toggle(f.constructions, c) })}
              >
                {CONSTRUCTION_INFO[c].label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.advToggle} aria-expanded={adv} onClick={() => setAdv((a) => !a)}>
          {adv ? "− Ocultar estado, quillas y medidas" : "+ Estado, quillas, anchura y grosor"}
        </button>

        {adv && (
          <div className={styles.adv}>
            <div className={styles.group}>
              <span className={ui.label}>Estado</span>
              <div className={styles.chips}>
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${ui.chip} ${ui.chipSm}`}
                    aria-pressed={f.conditions.includes(c)}
                    onClick={() => set({ conditions: toggle(f.conditions, c) })}
                  >
                    {CONDITION_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.group}>
              <span className={ui.label}>Reparaciones y accesorios</span>
              <div className={styles.chips}>
                <button type="button" className={`${ui.chip} ${ui.chipSm}`} aria-pressed={f.noRepairs} onClick={() => set({ noRepairs: !f.noRepairs })}>
                  Sin reparaciones
                </button>
                <button type="button" className={`${ui.chip} ${ui.chipSm}`} aria-pressed={f.accessories} onClick={() => set({ accessories: !f.accessories })}>
                  Con funda o accesorios
                </button>
              </div>
            </div>
            <label className={`${ui.label} ${styles.field}`}>
              Sistema de quillas
              <select className={`${ui.select} ${styles.selectField}`} value={f.fins} onChange={(e) => set({ fins: e.target.value })}>
                <option value="">Cualquiera</option>
                {FIN_OPTIONS.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.two}>
              <label className={`${ui.label} ${styles.field}`}>
                Anchura mínima (&quot;)
                <NumField
                  className={`${ui.input} ${ui.mono} ${styles.selectField}`}
                  inputMode="text"
                  placeholder='p. ej. 21 1/2"'
                  value={f.widthMin}
                  parse={readInches("width")}
                  onValue={(v) => setTyped({ widthMin: v })}
                />
              </label>
              <label className={`${ui.label} ${styles.field}`}>
                Grosor mínimo (&quot;)
                <NumField
                  className={`${ui.input} ${ui.mono} ${styles.selectField}`}
                  inputMode="text"
                  placeholder='p. ej. 2 3/4"'
                  value={f.thickMin}
                  parse={readInches("thick")}
                  onValue={(v) => setTyped({ thickMin: v })}
                />
              </label>
            </div>
            <div className={styles.group}>
              <span className={ui.label}>Vendedor</span>
              <div className={styles.chips}>
                {SELLER_TYPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${ui.chip} ${ui.chipSm}`}
                    aria-pressed={f.sellers.includes(s)}
                    onClick={() => set({ sellers: toggle(f.sellers, s) })}
                  >
                    {SELLER_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.panelFoot} ${styles.mOnly}`}>
        <button type="button" className={ui.btnNeutral} onClick={() => commit(emptyFilters(), 0)}>
          Limpiar
        </button>
        <button type="button" className={ui.btnPrimary} onClick={() => setSheetOpen(false)}>
          {resultCount === 0 ? "Ver resultados" : resultCount === 1 ? "Ver 1 tabla" : `Ver ${num(resultCount)} tablas`}
        </button>
      </div>
    </aside>
  );
}
