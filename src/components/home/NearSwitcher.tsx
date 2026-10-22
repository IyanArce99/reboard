"use client";

// Alterna «Fotos» (carrusel con snap y flechas en escritorio) y «Lista» (agrupada por distancia).

import { useRef, useState } from "react";
import styles from "./Home.module.css";

export function NearSwitcher({
  heading,
  carousel,
  list,
}: {
  heading: React.ReactNode;
  carousel: React.ReactNode;
  list: React.ReactNode;
}) {
  const [view, setView] = useState<"fotos" | "lista">("fotos");
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const r = rail.current;
    if (r) r.scrollBy({ left: dir * r.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <div className={styles.nearHead}>
        {heading}
        <div className={styles.nearControls}>
          {view === "fotos" && (
            <span className={styles.arrows}>
              <button type="button" aria-label="Anteriores" className={styles.arrow} onClick={() => scroll(-1)}>
                ‹
              </button>
              <button type="button" aria-label="Siguientes" className={styles.arrow} onClick={() => scroll(1)}>
                ›
              </button>
            </span>
          )}
          <div className={styles.toggle} role="group" aria-label="Vista">
            {(
              [
                ["fotos", "Fotos"],
                ["lista", "Lista"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      {view === "fotos" ? (
        <div ref={rail} data-rail="1" className={styles.rail}>
          {carousel}
        </div>
      ) : (
        list
      )}
    </>
  );
}
