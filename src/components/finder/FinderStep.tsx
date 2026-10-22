"use client";

import { LENGTH_STEPS } from "@/lib/domain/taxonomy";
import { ftLabel } from "@/lib/domain/format";
import { BUDGETS, FINDER_ZONES, OTHER_ZONES } from "@/lib/finder/listings";
import {
  CURRENT_BOARDS,
  FREQS,
  GOALS,
  LEVELS,
  NO_BOARD,
  QUESTIONS,
  WAVES,
  WEIGHT_MAX,
  WEIGHT_MIN,
  isValidWeight,
  type FinderState,
  type GoalKey,
} from "@/lib/finder/recommend";
import { OptionGroup, type Option } from "./OptionCard";
import styles from "./Finder.module.css";

interface Props {
  state: FinderState;
  set: (patch: Partial<FinderState>) => void;
  /** Se intentó continuar el paso 1 sin un peso válido. */
  weightError: boolean;
  /** Se intentó continuar el paso 2 sin elegir nivel. */
  levelError: boolean;
  onEnter: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

const digits = (v: string, max = 3) => v.replace(/[^0-9]/g, "").slice(0, max);

/** Una pregunta del asistente: título, ayuda y controles del paso. */
export function FinderStep({ state: W, set, weightError, levelError, onEnter, headingRef }: Props) {
  const step = Math.min(W.step, 7);
  const [q, help] = QUESTIONS[step - 1];
  const single = (key: "lvl" | "cur" | "freq" | "waves", required = false) => (v: string) =>
    set({ [key]: W[key] === v && !required ? null : v } as Partial<FinderState>);

  return (
    <>
      <h2 ref={headingRef} tabIndex={-1} className={styles.question} id="finder-question">
        {q}
      </h2>
      <p className={styles.help}>{help}</p>

      {step === 1 && (
        <div className={styles.weightBlock}>
          <label className={styles.weightField} data-state={weightError ? "error" : isValidWeight(W.w) ? "ok" : undefined}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="75"
              value={W.w}
              onChange={(e) => set({ w: digits(e.target.value) })}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEnter();
              }}
              aria-label="Peso en kilos"
              aria-invalid={weightError || undefined}
              aria-describedby={weightError ? "finder-weight-error" : undefined}
              className={styles.weightInput}
            />
            <span className={styles.weightUnit}>kg</span>
          </label>
          {weightError && (
            <span id="finder-weight-error" className={styles.error} role="alert">
              Introduce un peso entre {WEIGHT_MIN} y {WEIGHT_MAX} kg.
            </span>
          )}
          <div className={styles.quick}>
            {[55, 65, 75, 85, 95].map((v) => (
              <button
                key={v}
                type="button"
                className={styles.quickChip}
                aria-pressed={W.w === String(v)}
                onClick={() => set({ w: String(v) })}
              >
                {v} kg
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <OptionGroup
            label={q}
            options={LEVELS.map(([value, title, description]) => ({ value, title, description }))}
            selected={W.lvl ? [W.lvl] : []}
            onToggle={single("lvl", true)}
          />
          {levelError && !W.lvl && (
            <span id="finder-level-error" className={styles.error} role="alert">
              Elige tu nivel para continuar.
            </span>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <OptionGroup
            label={q}
            options={CURRENT_BOARDS.map(([title, description]): Option => ({ value: title, title, description }))}
            selected={W.cur ? [W.cur] : []}
            onToggle={single("cur")}
          />
          {W.cur && W.cur !== NO_BOARD && (
            <div className={styles.currentExtra}>
              <label className={styles.fieldLabel}>
                Longitud (opcional)
                <select value={W.curLen} onChange={(e) => set({ curLen: e.target.value })} className={styles.select}>
                  <option value="">Elige…</option>
                  {LENGTH_STEPS.map((i) => (
                    <option key={i} value={i}>
                      {ftLabel(i)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Litros (opcional)
                <input
                  inputMode="decimal"
                  placeholder="p. ej. 60"
                  value={W.curVol}
                  onChange={(e) => set({ curVol: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 6) })}
                  className={styles.textInput}
                />
              </label>
            </div>
          )}
        </>
      )}

      {step === 4 && (
        <OptionGroup
          label={q}
          options={FREQS.map(([value, title, description]) => ({ value, title, description }))}
          selected={W.freq ? [W.freq] : []}
          onToggle={single("freq")}
        />
      )}

      {step === 5 && (
        <OptionGroup
          label={q}
          options={WAVES.map(([value, title, description]) => ({ value, title, description }))}
          selected={W.waves ? [W.waves] : []}
          onToggle={single("waves")}
        />
      )}

      {step === 6 && (
        <OptionGroup
          label={q}
          multi
          twoCols
          options={GOALS.map(([value, title]) => ({ value, title }))}
          selected={W.goals}
          onToggle={(v) => {
            const g = v as GoalKey;
            set({ goals: W.goals.includes(g) ? W.goals.filter((x) => x !== g) : [...W.goals, g] });
          }}
        />
      )}

      {step === 7 && (
        <div className={styles.whereBlock}>
          <div>
            <div className={styles.groupLabel} id="finder-zone-label">
              Dónde buscar
            </div>
            <div className={styles.choiceRow} role="group" aria-labelledby="finder-zone-label">
              {FINDER_ZONES.map(([v, l]) => (
                <button key={v || "all"} type="button" className={styles.choice} aria-pressed={W.zone === v} onClick={() => set({ zone: v })}>
                  {l}
                </button>
              ))}
            </div>
            {W.zone === "other" && (
              <select
                value={W.otherZone}
                onChange={(e) => set({ otherZone: e.target.value })}
                className={`${styles.select} ${styles.otherZone}`}
                aria-label="Otra zona"
              >
                {OTHER_ZONES.map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <div className={styles.groupLabel} id="finder-budget-label">
              Presupuesto máximo
            </div>
            <div className={styles.choiceRow} role="group" aria-labelledby="finder-budget-label">
              {BUDGETS.map(([v, l]) => (
                <button
                  key={v || "none"}
                  type="button"
                  className={`${styles.choice} ${styles.choiceMono}`}
                  aria-pressed={W.budget === v}
                  onClick={() => set({ budget: v })}
                >
                  {l}
                </button>
              ))}
              <label className={styles.budgetField}>
                <input
                  inputMode="numeric"
                  placeholder="Otro"
                  value={W.budget}
                  onChange={(e) => set({ budget: digits(e.target.value, 5) })}
                  aria-label="Otro presupuesto máximo, en euros"
                  className={styles.budgetInput}
                />
                €
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
