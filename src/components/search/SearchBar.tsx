"use client";

// Buscador del hero: Zona | Litros | Tipo | Más filtros + «Buscar N tablas».
// - Escritorio (≥ 760 px): cada segmento abre SU panel justo debajo de la barra; el botón amarillo
//   de la barra sigue a la vista y actualiza el recuento en directo.
// - Móvil: los segmentos abren la hoja inferior con las tres secciones.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { BoardShape } from "@/components/brand/BoardShape";
import { SlidersIcon } from "@/components/icons";
import { REGIONS, SHAPES, SHAPE_INFO, ZONES, zoneBySlug, type Shape } from "@/lib/domain/taxonomy";
import { num } from "@/lib/domain/format";
import { HERE_COOKIE } from "@/lib/here";
import { searchCtaText } from "@/lib/search/describe";
import { searchHref, toQuery, withFilters, type Filters } from "@/lib/search/filters";
import styles from "./SearchBar.module.css";

const DISTANCES: [number | null, string][] = [
  [null, "Cualquier distancia"],
  [10, "< 10 km"],
  [25, "< 25 km"],
  [50, "< 50 km"],
];
export const VOLUME_CHIPS: [number, number | null][] = [
  [25, 35],
  [35, 45],
  [45, 60],
  [60, null],
];
/** Para quién suele ser cada rango, con unos 75 kg (los mismos ejemplos que la calculadora). */
const VOLUME_HINT: Record<number, string> = {
  25: "Nivel avanzado",
  35: "Para maniobrar",
  45: "Ya coges olas",
  60: "Para aprender",
};
const SHAPE_HINT: Record<Shape, string> = {
  shortboard: "Olas con fuerza",
  fish: "Olas pequeñas, rápida",
  hibrida: "Para progresar",
  evolutiva: "Salir de la espuma",
  midlength: "Remada fácil",
  longboard: "Olas pequeñas, estilo",
  gun: "Olas grandes",
};
const CANARIAS = REGIONS.find((r) => r.slug === "canarias")?.zones ?? [];

type Panel = "zona" | "litros" | "tipo";
const PANEL_WIDTH: Record<Panel, number> = { zona: 560, litros: 520, tipo: 700 };

interface Props {
  /** Zona elegida por el usuario (cookie) o "" para toda España. Nunca una zona por defecto. */
  here: string;
  /** Hay km por anuncio (solo DEMO): muestra los chips de distancia. */
  supportsDistance?: boolean;
  initialCount: number;
  /** Tablas publicadas por zona y en total, para orientar al elegir dónde buscar. */
  zoneCounts?: Record<string, number>;
  totalCount?: number;
}

export function SearchBar({ here, initialCount, supportsDistance = true, zoneCounts = {}, totalCount }: Props) {
  const router = useRouter();
  const [zone, setZone] = useState(here);
  const [dist, setDist] = useState<number | null>(null);
  const [volMin, setVolMin] = useState("");
  const [volMax, setVolMax] = useState("");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [count, setCount] = useState(initialCount);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [left, setLeft] = useState(0);
  /** Hoja de móvil abierta, con la sección que se ha tocado. */
  const [sheet, setSheet] = useState<Panel | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<Record<Panel, HTMLButtonElement | null>>({ zona: null, litros: null, tipo: null });

  const filters: Filters = withFilters({
    zone,
    dist: zone ? dist : null,
    volMin: volMin ? Number(volMin.replace(",", ".")) : null,
    volMax: volMax ? Number(volMax.replace(",", ".")) : null,
    shapes,
  });
  const query = toQuery(filters);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/tablas/recuento?${query}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { count: number }) => setCount(d.count))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // Panel de escritorio: se cierra con Escape (devolviendo el foco) o al pulsar fuera.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      segRefs.current[panel]?.focus();
      setPanel(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [panel]);

  // Al abrir un panel, el foco entra en él: así el orden de tabulación sigue el visual (el panel
  // va después de toda la barra en el DOM).
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel) return;
    panelRef.current?.querySelector<HTMLElement>("button, a[href], input, select")?.focus();
  }, [panel]);
  const closePanel = () => {
    if (panel) segRefs.current[panel]?.focus();
    setPanel(null);
  };

  const zn = zone ? (zoneBySlug(zone)?.name ?? zone) : "Toda España";
  const hasVol = Boolean(volMin || volMax);
  const where = `${zn}${zone && dist ? ` · < ${dist} km` : ""}`;
  const vol = hasVol ? (volMin && volMax ? `${volMin}–${volMax} L` : volMin ? `Desde ${volMin} L` : `Hasta ${volMax} L`) : null;
  const type = shapes.length ? shapes.map((s) => SHAPE_INFO[s].label).join(", ") : null;
  // Sin ninguna tabla publicada no hay alternativas que ver: «Buscar tablas» (lleva al estado vacío honesto).
  const goText = searchCtaText(count, totalCount, num);
  const href = searchHref(filters);

  const open = (p: Panel) => {
    if (window.matchMedia("(max-width: 759px)").matches) {
      setSheet(p);
      return;
    }
    const bar = wrapRef.current?.getBoundingClientRect();
    const seg = segRefs.current[p]?.getBoundingClientRect();
    if (bar && seg) setLeft(Math.max(0, Math.min(seg.left - bar.left, bar.width - PANEL_WIDTH[p])));
    setPanel((cur) => (cur === p ? null : p));
  };

  const pickZone = (z: string) => {
    if (z === zone) return;
    setZone(z);
    if (!z) setDist(null);
    try {
      // «Toda España» borra la zona guardada: sin cookie, la home no presupone ninguna zona.
      document.cookie = z
        ? `${HERE_COOKIE}=${z}; path=/; max-age=31536000; samesite=lax`
        : `${HERE_COOKIE}=; path=/; max-age=0; samesite=lax`;
    } catch {}
    // La sección «Recién publicadas» de la home usa esta zona.
    router.refresh();
  };
  const toggleShape = (s: Shape) => setShapes((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  const pickVolume = (a: number, b: number | null) => {
    const on = volMin === String(a) && volMax === (b == null ? "" : String(b));
    setVolMin(on ? "" : String(a));
    setVolMax(on || b == null ? "" : String(b));
  };
  const clearAll = () => {
    setDist(null);
    setVolMin("");
    setVolMax("");
    setShapes([]);
  };
  const clearPanel = (p: Panel) => {
    if (p === "zona") {
      pickZone(here);
      setDist(null);
    } else if (p === "litros") {
      setVolMin("");
      setVolMax("");
    } else setShapes([]);
  };

  const sections: Record<Panel, React.ReactNode> = {
    zona: (
      <ZoneOptions
        zone={zone}
        dist={dist}
        counts={zoneCounts}
        total={totalCount}
        supportsDistance={supportsDistance}
        onZone={pickZone}
        onDist={setDist}
      />
    ),
    litros: <VolumeOptions volMin={volMin} volMax={volMax} onPick={pickVolume} onMin={setVolMin} onMax={setVolMax} />,
    tipo: <ShapeOptions shapes={shapes} onToggle={toggleShape} />,
  };

  const seg = (p: Panel, label: string, value: string | null, placeholder: string, extra = "") => (
    <button
      ref={(el) => {
        segRefs.current[p] = el;
      }}
      type="button"
      data-seg={p}
      className={`${styles.seg} ${extra}`}
      aria-haspopup="dialog"
      aria-expanded={panel === p}
      aria-controls={panel === p ? "hero-panel" : undefined}
      data-active={panel === p || undefined}
      onClick={() => open(p)}
    >
      <span className={styles.segLabel}>{label}</span>
      <span className={styles.segValue} data-set={value ? true : undefined}>
        {value && <span className={styles.segDot} />}
        <span>{value ?? placeholder}</span>
      </span>
    </button>
  );

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.bar} data-open={panel ? true : undefined}>
        {seg("zona", "Zona", where, "")}
        <span className={styles.sep} />
        {seg("litros", "Litros", vol, "¿Cuántos litros?")}
        <span className={`${styles.sep} ${styles.dOnly}`} />
        {seg("tipo", "Tipo de tabla", type, "Cualquier tipo", styles.dOnly)}
        <Link href={`${href}${href.includes("?") ? "&" : "?"}avanzados=1`} className={`${styles.filters} ${styles.dOnly}`}>
          <SlidersIcon />
          Más filtros
        </Link>
        <Link href={href} className={styles.go}>
          {goText}
        </Link>
      </div>

      {panel && (
        <div
          ref={panelRef}
          id="hero-panel"
          role="dialog"
          aria-label={panel === "zona" ? "Zona" : panel === "litros" ? "Litros" : "Tipo de tabla"}
          className={styles.panel}
          style={{ left, width: PANEL_WIDTH[panel] }}
        >
          {sections[panel]}
          <div className={styles.panelFoot}>
            <button type="button" className={styles.textBtn} onClick={() => clearPanel(panel)}>
              Limpiar
            </button>
            <button type="button" className={styles.doneBtn} onClick={closePanel}>
              Hecho
            </button>
          </div>
        </div>
      )}

      {sheet && (
        <SearchSheet focus={sheet} onClose={() => setSheet(null)} goText={goText} href={href} onClear={clearAll}>
          {sections.zona}
          {sections.litros}
          {sections.tipo}
        </SearchSheet>
      )}
    </div>
  );
}

function ZoneOptions({
  zone,
  dist,
  counts,
  total,
  supportsDistance,
  onZone,
  onDist,
}: {
  zone: string;
  dist: number | null;
  counts: Record<string, number>;
  total?: number;
  supportsDistance: boolean;
  onZone: (z: string) => void;
  onDist: (d: number | null) => void;
}) {
  const option = (slug: string, name: string, n?: number) => (
    <button key={slug || "todas"} type="button" className={styles.zoneOpt} aria-pressed={zone === slug} onClick={() => onZone(slug)}>
      <span>{name}</span>
      {n != null && <span className={styles.zoneCount}>{num(n)}</span>}
    </button>
  );
  // Sin ninguna tabla publicada, los recuentos serían «0» en todas las zonas: no se muestran.
  const showCounts = total !== 0;
  const group = (title: string, list: typeof ZONES) => (
    <div className={styles.zoneGroup}>
      <span className={styles.zoneGroupTitle}>{title}</span>
      {list.map((z) => option(z.slug, z.name, showCounts ? (counts[z.slug] ?? 0) : undefined))}
    </div>
  );
  return (
    <section className={styles.group} aria-labelledby="sb-zona">
      <h2 id="sb-zona" className={styles.groupTitle}>
        ¿Dónde buscas?
      </h2>
      <p className={styles.groupHint}>
        {showCounts ? "Por isla o provincia. El número son las tablas publicadas." : "Por isla o provincia."}
      </p>
      {option("", "Toda España", showCounts ? total : undefined)}
      <div className={styles.zoneCols}>
        {group(
          "Canarias",
          ZONES.filter((z) => CANARIAS.includes(z.slug)),
        )}
        {group(
          "Península",
          ZONES.filter((z) => !CANARIAS.includes(z.slug)),
        )}
      </div>
      {supportsDistance && zone && (
        <div className={styles.chips} role="group" aria-label="Distancia">
          {DISTANCES.map(([d, l]) => (
            <button key={l} type="button" className={styles.sheetChip} aria-pressed={dist === d} onClick={() => onDist(d)}>
              {l}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function VolumeOptions({
  volMin,
  volMax,
  onPick,
  onMin,
  onMax,
}: {
  volMin: string;
  volMax: string;
  onPick: (a: number, b: number | null) => void;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <section className={styles.group} aria-labelledby="sb-litros">
      <h2 id="sb-litros" className={styles.groupTitle}>
        ¿Cuántos litros?
      </h2>
      <div className={styles.volGrid}>
        {VOLUME_CHIPS.map(([a, b]) => {
          const on = volMin === String(a) && volMax === (b == null ? "" : String(b));
          return (
            <button key={a} type="button" className={styles.volOpt} aria-pressed={on} onClick={() => onPick(a, b)}>
              <span className={styles.volValue}>
                {a}
                {b ? `–${b}` : "+"} L
              </span>
              <span className={styles.volHint}>{VOLUME_HINT[a]}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.range}>
        <label>
          <span>Mínimo</span>
          <input inputMode="decimal" placeholder="—" value={volMin} onChange={(e) => onMin(e.target.value.replace(/[^\d.,]/g, ""))} />
        </label>
        <span aria-hidden="true">–</span>
        <label>
          <span>Máximo</span>
          <input inputMode="decimal" placeholder="—" value={volMax} onChange={(e) => onMax(e.target.value.replace(/[^\d.,]/g, ""))} />
        </label>
        <span className={styles.rangeUnit}>L</span>
      </div>
      <p className={styles.groupHint}>
        Orientativo para unos 75 kg: depende de tu peso y tu nivel.{" "}
        <Link href="/calculadora-litros" className={styles.inlineLink}>
          Calcular mis litros →
        </Link>
      </p>
    </section>
  );
}

function ShapeOptions({ shapes, onToggle }: { shapes: Shape[]; onToggle: (s: Shape) => void }) {
  return (
    <section className={styles.group} aria-labelledby="sb-tipo">
      <h2 id="sb-tipo" className={styles.groupTitle}>
        ¿Qué tipo de tabla buscas? <span className={styles.groupNote}>Puedes elegir varias</span>
      </h2>
      <div className={styles.shapeGrid}>
        {SHAPES.map((s) => (
          <button key={s} type="button" className={styles.shapeOpt} aria-pressed={shapes.includes(s)} onClick={() => onToggle(s)}>
            <span className={styles.shapeSil}>
              <BoardShape shape={s} size={80} tone={shapes.includes(s) ? "soft" : "light"} />
            </span>
            <span className={styles.shapeName}>{SHAPE_INFO[s].label}</span>
            <span className={styles.shapeHint}>{SHAPE_HINT[s]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SearchSheet({
  focus,
  children,
  onClose,
  onClear,
  goText,
  href,
}: {
  focus: Panel;
  children: React.ReactNode;
  onClose: () => void;
  onClear: () => void;
  goText: string;
  href: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // onClose cambia en cada render del buscador: se guarda en una ref para que el efecto solo
  // se ejecute al abrir (si no, cada tecla en «Mínimo» devolvía el foco al botón de cerrar).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const initialFocus = useRef(focus);
  // Diálogo modal: Tab no sale de la hoja y, al cerrar, el foco vuelve al segmento que la abrió.
  // Va antes del efecto que enfoca «Cerrar» para recordar el disparador.
  const sheetRef = useRef<HTMLDivElement>(null);
  useDialogFocus(true, sheetRef);

  useEffect(() => {
    closeRef.current?.focus();
    // Se abre en la sección que se ha tocado (Zona, Litros o Tipo).
    if (initialFocus.current !== "zona") document.getElementById(`sb-${initialFocus.current}`)?.scrollIntoView({ block: "start" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="search-sheet-title">
        <div className={styles.sheetHead}>
          <span id="search-sheet-title" className={styles.sheetTitle}>
            Buscar tablas
          </span>
          <button ref={closeRef} type="button" aria-label="Cerrar" className={styles.close} onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
        <div className={styles.sheetFoot}>
          <button type="button" className={styles.clear} onClick={onClear}>
            Limpiar
          </button>
          <Link href={href} className={styles.sheetGo}>
            {goText}
          </Link>
        </div>
      </div>
    </>,
    document.body,
  );
}
