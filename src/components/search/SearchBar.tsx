"use client";

// Buscador del hero: Ubicación | Litros | Tipo | Filtros + «Buscar N tablas».
// Cada segmento abre la SearchSheet (hoja inferior en móvil, modal de 540 px en escritorio).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersIcon } from "@/components/icons";
import { SHAPES, SHAPE_INFO, ZONES, zoneBySlug, type Shape } from "@/lib/domain/taxonomy";
import { num } from "@/lib/domain/format";
import { HERE_COOKIE } from "@/lib/here";
import { searchHref, toQuery, withFilters, type Filters } from "@/lib/search/filters";
import styles from "./SearchBar.module.css";

const DISTANCES: [number | null, string][] = [
  [null, "Toda la zona"],
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

interface Props {
  here: string;
  initialCount: number;
}

export function SearchBar({ here, initialCount }: Props) {
  const router = useRouter();
  const [zone, setZone] = useState(here);
  const [dist, setDist] = useState<number | null>(null);
  const [volMin, setVolMin] = useState("");
  const [volMax, setVolMax] = useState("");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [zoneTouched, setZoneTouched] = useState(false);

  const filters: Filters = withFilters({
    zone,
    dist,
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

  const zn = zoneBySlug(zone)?.name ?? zone;
  const hasVol = Boolean(volMin || volMax);
  const where = `${zoneTouched ? zn : `Cerca de ti · ${zn}`}${dist ? ` · ${dist} km` : ""}`;
  const whereM = `${zn}${dist ? ` · ${dist} km` : ""}`;
  const vol = hasVol ? `${volMin || "0"}–${volMax || "∞"} L` : null;
  const type = shapes.length ? shapes.map((s) => SHAPE_INFO[s].label).join(", ") : null;
  const goText = `Buscar ${num(count)} tablas`;
  const href = searchHref(filters);

  const pickZone = (z: string) => {
    setZone(z);
    setZoneTouched(true);
    try {
      document.cookie = `${HERE_COOKIE}=${z}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
    router.refresh();
  };
  const toggleShape = (s: Shape) => setShapes((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  const clear = () => {
    setDist(null);
    setVolMin("");
    setVolMax("");
    setShapes([]);
  };

  return (
    <>
      <div className={styles.bar}>
        <button type="button" className={styles.seg} onClick={() => setOpen(true)}>
          <span className={styles.segLabel}>Ubicación</span>
          <span className={styles.segValue} data-set>
            <span className={styles.segDot} />
            <span className={styles.d}>{where}</span>
            <span className={styles.m}>{whereM}</span>
          </span>
        </button>
        <span className={styles.sep} />
        <button type="button" className={styles.seg} onClick={() => setOpen(true)}>
          <span className={styles.segLabel}>Litros</span>
          <span className={styles.segValue} data-set={vol ? true : undefined}>
            {vol && <span className={styles.segDot} />}
            {vol ?? (
              <>
                <span className={styles.d}>Cualquier volumen</span>
                <span className={styles.m}>Cualquiera</span>
              </>
            )}
          </span>
        </button>
        <span className={`${styles.sep} ${styles.dOnly}`} />
        <button type="button" className={`${styles.seg} ${styles.dOnly}`} onClick={() => setOpen(true)}>
          <span className={styles.segLabel}>Tipo de tabla</span>
          <span className={styles.segValue} data-set={type ? true : undefined}>
            {type && <span className={styles.segDot} />}
            {type ?? "Cualquier tipo"}
          </span>
        </button>
        <Link href={`${href}${href.includes("?") ? "&" : "?"}avanzados=1`} className={`${styles.filters} ${styles.dOnly}`}>
          <SlidersIcon />
          Filtros
        </Link>
        <Link href={href} className={styles.go}>
          {goText}
        </Link>
      </div>

      {open && (
        <SearchSheet onClose={() => setOpen(false)} goText={goText} href={href} onClear={clear}>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Dónde</span>
            <select className={styles.zoneSelect} value={zone} onChange={(e) => pickZone(e.target.value)} aria-label="Zona">
              {ZONES.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.name}
                </option>
              ))}
            </select>
            <div className={styles.chips}>
              {DISTANCES.map(([d, l]) => (
                <button key={l} type="button" className={styles.sheetChip} aria-pressed={dist === d} onClick={() => setDist(d)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Litros</span>
            <div className={styles.chips}>
              <button type="button" className={styles.modeChip} aria-pressed="true">
                Sé los litros
              </button>
              <Link href="/calculadora-litros" className={styles.modeChip}>
                No sé: ¿qué tabla necesito? →
              </Link>
            </div>
            <div className={styles.chips}>
              {VOLUME_CHIPS.map(([a, b]) => {
                const on = volMin === String(a) && volMax === (b == null ? "" : String(b));
                return (
                  <button
                    key={a}
                    type="button"
                    className={`${styles.sheetChip} ${styles.mono}`}
                    aria-pressed={on}
                    onClick={() => {
                      setVolMin(String(a));
                      setVolMax(b == null ? "" : String(b));
                    }}
                  >
                    {a}
                    {b ? `–${b}` : "+"} L
                  </button>
                );
              })}
            </div>
            <div className={styles.range}>
              <input inputMode="decimal" placeholder="mín." aria-label="Litros mínimos" value={volMin} onChange={(e) => setVolMin(e.target.value)} />
              <span aria-hidden="true">–</span>
              <input inputMode="decimal" placeholder="máx." aria-label="Litros máximos" value={volMax} onChange={(e) => setVolMax(e.target.value)} />
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Tipo</span>
            <div className={styles.chips}>
              {SHAPES.map((s) => (
                <button key={s} type="button" className={styles.sheetChip} aria-pressed={shapes.includes(s)} onClick={() => toggleShape(s)}>
                  {SHAPE_INFO[s].label}
                </button>
              ))}
            </div>
          </div>
        </SearchSheet>
      )}
    </>
  );
}

function SearchSheet({
  children,
  onClose,
  onClear,
  goText,
  href,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onClear: () => void;
  goText: string;
  href: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="search-sheet-title">
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
