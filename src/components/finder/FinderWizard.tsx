"use client";

// Isla del asistente «¿Qué tabla necesito?» (docs/SURFBOARD_FINDER.md).
// Una pregunta por pantalla. Las respuestas se guardan en este dispositivo (rb-asistente-v1).

import { useCallback, useEffect, useRef, useState } from "react";
import { useUserState } from "@/components/user/UserStateProvider";
import { summaryOf } from "@/lib/finder/summary";
import {
  RESULT_STEP,
  TOTAL_STEPS,
  initialFinderState,
  isValidWeight,
  recommend,
  sanitizeFinderState,
  type FinderState,
} from "@/lib/finder/recommend";
import { FINDER_DISCLAIMER, FinderResult } from "./FinderResult";
import { FinderStep } from "./FinderStep";
import styles from "./Finder.module.css";
import { trackOnce } from "@/lib/analytics/track";

const KEY = "rb-asistente-v1";

export function FinderWizard({ intro }: { intro: React.ReactNode }) {
  const { setProfile } = useUserState();
  const [W, setW] = useState<FinderState>(initialFinderState);
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  /** Cambio de paso pedido por el usuario: subir y llevar el foco a la pregunta. */
  const moved = useRef(false);

  useEffect(() => {
    // localStorage solo existe en el cliente: se lee tras hidratar (igual que UserStateProvider).
    let saved: FinderState | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = sanitizeFinderState(JSON.parse(raw));
    } catch {
      // Almacenamiento bloqueado o dato corrupto: se empieza de cero.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setW(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(W));
    } catch {
      // Navegación privada: las respuestas siguen en memoria.
    }
  }, [W, loaded]);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    // Al cambiar de pantalla, el scroll vuelve arriba al instante (DESIGN_SYSTEM.md).
    // En móvil la intro empuja la pregunta fuera de la pantalla: se lleva la tarjeta del paso arriba.
    const card = headingRef.current?.closest("section") ?? topRef.current;
    const y = card?.getBoundingClientRect().top ?? 0;
    if (card && (y < 0 || y > window.innerHeight * 0.35)) card.scrollIntoView({ block: "start", behavior: "instant" });
    const target = W.step === RESULT_STEP ? document.getElementById("finder-result-title") : headingRef.current;
    target?.focus({ preventScroll: true });
  }, [W.step]);

  const set = useCallback((patch: Partial<FinderState>) => setW((s) => ({ ...s, ...patch })), []);

  const r = recommend(W);
  const step = W.step;
  const isResult = step === RESULT_STEP && !!r;
  const weightOk = isValidWeight(W.w);

  const goTo = (s: number) => {
    moved.current = true;
    setTried(false);
    set({ step: s });
  };

  const next = () => {
    if (step === 1 && !weightOk) {
      setTried(true);
      return;
    }
    if (step === 2 && !W.lvl) {
      // Mensaje fijo bajo las opciones (role="alert"), como el error del peso.
      setTried(true);
      return;
    }
    // Analítica: empieza a usar TablaFinder (sin el peso ni ninguna respuesta).
    if (step === 1) trackOnce("finder", "finder_started", {});
    if (step === TOTAL_STEPS) {
      // Desde el panel se puede saltar a cualquier paso: el peso y el nivel siguen siendo obligatorios.
      if (!r) {
        if (!weightOk) {
          goTo(1);
          setTried(true);
        } else {
          goTo(2);
          setTried(true);
        }
        return;
      }
      // Perfil de surfista: activa «Te encaja» y «Solo tablas para mí» (sin registro, en local).
      setProfile({ lo: r.lo, hi: r.hi, level: r.levelName, weight: r.weight });
    }
    goTo(Math.min(RESULT_STEP, step + 1));
  };

  const restart = () => {
    moved.current = true;
    setTried(false);
    setW(initialFinderState());
  };

  const summary = summaryOf(W);
  const scope = summaryOf(W, true);
  const hasProgress = step > 1 || !!W.w;
  const optional = step >= 3 && step <= TOTAL_STEPS;
  const blocked = (step === 1 && !weightOk) || (step === 2 && !W.lvl);
  const hint = !summary.length
    ? "Tus respuestas aparecerán aquí."
    : !r
      ? weightOk
        ? "Elige tu nivel para ver el volumen orientativo."
        : "Indica tu peso para ver el volumen orientativo."
      : null;
  const shown = Math.min(step, TOTAL_STEPS);

  return (
    <div ref={topRef} className={styles.top}>
      <div className={styles.headRow}>
        <div>{intro}</div>
        {hasProgress && (
          <button type="button" className={styles.restart} onClick={restart}>
            Empezar de nuevo
          </button>
        )}
      </div>

      {isResult && r ? (
        <FinderResult state={W} rec={r} summary={scope} onEdit={goTo} onRestart={restart} set={set} />
      ) : (
        <div className={styles.layout}>
          <section className={styles.card} aria-labelledby="finder-question">
            <div className={styles.stepRow}>
              <span className={styles.stepCount}>
                Paso {shown} de {TOTAL_STEPS}
              </span>
              {optional && <span className={styles.optional}>Opcional</span>}
            </div>
            <div className={styles.bar} aria-label={`Progreso: paso ${shown} de ${TOTAL_STEPS}`} role="group">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const n = i + 1;
                const state = n < step ? "done" : n === step ? "current" : "todo";
                return n < step ? (
                  <button key={n} type="button" className={styles.seg} data-state={state} aria-label={`Volver al paso ${n}`} onClick={() => goTo(n)} />
                ) : (
                  <span key={n} className={styles.seg} data-state={state} aria-hidden="true" />
                );
              })}
            </div>

            <FinderStep state={W} set={set} weightError={tried && !weightOk} levelError={tried && step === 2} onEnter={next} headingRef={headingRef} />

            <div className={styles.grow} />
            <div className={styles.nav}>
              <button
                type="button"
                className={styles.back}
                onClick={() => step > 1 && goTo(step - 1)}
                disabled={step <= 1}
              >
                Atrás
              </button>
              <div className={styles.navRight}>
                {/* En el último paso sobra «Saltar»: el botón principal ya avanza (y a 360 px se pisaban). */}
                {optional && step < TOTAL_STEPS && (
                  <button type="button" className={styles.skip} onClick={() => (step === TOTAL_STEPS ? next() : goTo(step + 1))}>
                    Saltar
                  </button>
                )}
                <button type="button" className={styles.next} data-blocked={blocked || undefined} onClick={next}>
                  {step === TOTAL_STEPS ? "Ver mi recomendación" : "Continuar"}
                </button>
              </div>
            </div>
          </section>

          <aside className={styles.aside} aria-label="Tu perfil hasta ahora">
            <div className={styles.profile}>
              <span className={styles.profileTitle}>Tu perfil hasta ahora</span>
              {summary.map((s) => (
                <button
                  key={s.step}
                  type="button"
                  className={styles.profileRow}
                  onClick={() => goTo(s.step)}
                >
                  {/* Sin aria-label: el nombre accesible es el texto visible (WCAG 2.5.3) más «Editar». */}
                  <span className={styles.profileKey}>{s.label}</span>
                  <span className={styles.profileVal}>{s.value}</span>
                  <span className={styles.srOnly}> · Editar</span>
                </button>
              ))}
              {hint && <p className={styles.profileHint}>{hint}</p>}
              {/* Región viva siempre montada: el volumen se anuncia cuando se puede calcular. */}
              <div aria-live="polite">
                {r && (
                  <div className={styles.live}>
                    <div className={styles.liveLabel}>Volumen orientativo</div>
                    <div className={styles.liveValue}>
                      {r.lo}–{r.hi} L
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
      {!isResult && <p className={styles.disclaimer}>{FINDER_DISCLAIMER}</p>}
    </div>
  );
}
