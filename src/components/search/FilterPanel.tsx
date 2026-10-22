"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONDITIONS,
  CONDITION_LABEL,
  CONSTRUCTIONS,
  CONSTRUCTION_INFO,
  LENGTH_STEPS,
  REGIONS,
  SELLER_LABEL,
  SELLER_TYPES,
  SHAPES,
  SHAPE_INFO,
  ZONES,
  regionBySlug,
} from "@/lib/domain/taxonomy";
import { ftLabel, inToCm, num } from "@/lib/domain/format";
import { FIN_OPTIONS, emptyFilters, toQuery, type Filters } from "@/lib/search/filters";
import { VOLUME_CHIPS } from "./SearchBar";
import { useUserState } from "@/components/user/UserStateProvider";
import { useSearchNav } from "./SearchNav";
import ui from "@/styles/ui.module.css";
import styles from "./Search.module.css";

export interface PanelCounts {
  total: number;
  zones: Record<string, number>;
  shapes: Record<string, number>;
}

interface Props {
  counts: PanelCounts;
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

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const parseNum = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : null;
};

/** Campo numérico controlado: conserva lo que se escribe («4,») y se sincroniza si el valor cambia fuera. */
function NumField({
  value,
  onValue,
  ...rest
}: { value: number | null; onValue: (v: number | null) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (parseNum(text) !== value) setText(value == null ? "" : String(value));
  }
  return (
    <input
      {...rest}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onValue(parseNum(e.target.value));
      }}
    />
  );
}

export function FilterPanel({ counts, resultCount, brands, models, openAdvanced }: Props) {
  const { filters, navigate, sheetOpen, setSheetOpen } = useSearchNav();
  const { profile } = useUserState();
  const [draft, setDraft] = useState(filters);
  const [adv, setAdv] = useState(openAdvanced);
  // Última query enviada desde este panel: sus propios cambios no deben resetear el borrador.
  const [committed, setCommitted] = useState(() => toQuery(filters));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sheetRef = useRef<HTMLElement>(null);

  // Si los filtros cambian desde fuera (chips, sugerencias), se descarta el borrador.
  const q = toQuery(filters);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    if (q !== committed) {
      setCommitted(q);
      setDraft(filters);
    }
  }

  useEffect(() => {
    if (openAdvanced && window.matchMedia("(max-width: 759px)").matches) setSheetOpen(true);
  }, [openAdvanced, setSheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheetOpen, setSheetOpen]);

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
  const lens = LENGTH_STEPS.map((i) => ({ v: String(i), l: `${ftLabel(i)} · ${inToCm(i)} cm` }));

  return (
    <aside ref={sheetRef} tabIndex={-1} className={styles.panel} data-open={sheetOpen || undefined} aria-label="Filtros">
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Filtros</span>
        <div className={styles.panelHeadActions}>
          <button type="button" className={styles.linkBtn} onClick={() => commit(emptyFilters(), 0)}>
            Limpiar
          </button>
          <button type="button" aria-label="Cerrar" className={`${styles.closeBtn} ${styles.mOnly}`} onClick={() => setSheetOpen(false)}>
            ✕
          </button>
        </div>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.group}>
          <label className={ui.label} htmlFor="f-zona">
            Ubicación y distancia
          </label>
          <select id="f-zona" className={ui.select} value={f.zone} onChange={(e) => set({ zone: e.target.value, ...(e.target.value ? {} : { dist: null }) })}>
            <option value="">Toda España ({counts.total})</option>
            {REGIONS.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name} ({counts.zones[r.slug] ?? 0})
              </option>
            ))}
            {ZONES.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.name} ({counts.zones[z.slug] ?? 0})
              </option>
            ))}
          </select>
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
        </div>

        <div className={styles.group}>
          <span className={ui.label} id="f-litros">
            Volumen (litros)
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
          <div className={styles.chips} aria-labelledby="f-litros">
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
                <strong>Solo tablas para mí</strong>
                <br />
                <span className={styles.onlyMeText}>
                  Tu rango orientativo: {profile.lo}–{profile.hi} L ({profile.level}, {profile.weight} kg)
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
          <span className={ui.label}>Forma</span>
          <div className={styles.chips}>
            {SHAPES.map((s) => (
              <button key={s} type="button" className={ui.chip} aria-pressed={f.shapes.includes(s)} onClick={() => set({ shapes: toggle(f.shapes, s) })}>
                {SHAPE_INFO[s].label} · {counts.shapes[s] ?? 0}
              </button>
            ))}
          </div>
        </div>

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
            aria-label="Precio máximo"
            className={styles.slider}
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
          {adv ? "− Menos filtros" : "+ Marca, modelo, estado, quillas, medidas…"}
        </button>

        {adv && (
          <div className={styles.adv}>
            <div className={styles.two}>
              <label className={`${ui.label} ${styles.field}`}>
                Marca
                <select className={`${ui.select} ${styles.selectField}`} value={f.brand} onChange={(e) => set({ brand: e.target.value, model: "" })}>
                  <option value="">Cualquier marca</option>
                  {brands.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${ui.label} ${styles.field}`}>
                Modelo
                <select className={`${ui.select} ${styles.selectField}`} value={f.model} onChange={(e) => set({ model: e.target.value })}>
                  <option value="">Cualquier modelo</option>
                  {visibleModels.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {brands.find((b) => b.slug === m.brandSlug)?.name} {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
                  Incluye funda o accesorios
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
                Anchura mín. (&quot;)
                <NumField
                  className={`${ui.input} ${ui.mono} ${styles.selectField}`}
                  inputMode="decimal"
                  placeholder="p. ej. 21"
                  value={f.widthMin}
                  onValue={(v) => setTyped({ widthMin: v })}
                />
              </label>
              <label className={`${ui.label} ${styles.field}`}>
                Grosor mín. (&quot;)
                <NumField
                  className={`${ui.input} ${ui.mono} ${styles.selectField}`}
                  inputMode="decimal"
                  placeholder="p. ej. 2.75"
                  value={f.thickMin}
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
          Ver {num(resultCount)} tablas
        </button>
      </div>
    </aside>
  );
}
