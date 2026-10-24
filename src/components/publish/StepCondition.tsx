"use client";

// Paso 3 · Estado. La base de datos solo admite 4 estados (enum board_condition): se explican
// en lenguaje llano para que cada vendedor encaje su tabla sin dudar. Ver docs/DESIGN_AUDIT.md.

import { CONDITIONS, CONDITION_HELP, CONDITION_LABEL } from "@/lib/domain/taxonomy";
import { Group, type StepProps } from "./parts";
import styles from "./Publish.module.css";


export function StepCondition({ d, set }: StepProps) {
  const repairsNeeded = d.condition === "con-reparaciones" || d.condition === "buen-estado";
  return (
    <div className={styles.stepBody}>
      <Group id="pub-cond" title="Estado">
        <div className={styles.condGrid}>
          {CONDITIONS.map((c, i) => (
            <button key={c} type="button" aria-pressed={d.condition === c} className={styles.condOpt} onClick={() => set({ condition: c })}>
              <span className={styles.condMeter} aria-hidden="true">
                {[0, 1, 2, 3].map((k) => (
                  <span key={k} data-on={k < CONDITIONS.length - i || undefined} />
                ))}
              </span>
              <span className={styles.condName}>{CONDITION_LABEL[c]}</span>
              <span className={styles.condHelp}>{CONDITION_HELP[c]}</span>
            </button>
          ))}
        </div>
      </Group>

      <label className={styles.labelField}>
        <span>
          {repairsNeeded ? "¿Qué golpes o reparaciones tiene?" : "Golpes o reparaciones"}
          <span className={styles.opt}> · si los hay</span>
        </span>
        <textarea
          className={styles.textarea}
          placeholder="p. ej. golpe en la cola reparado y estanco"
          maxLength={600}
          value={d.repairs}
          onChange={(e) => set({ repairs: e.target.value })}
        />
      </label>

      <label className={styles.labelField}>
        <span>
          Algo más que contar<span className={styles.opt}> · opcional</span>
        </span>
        <textarea
          className={styles.textarea}
          placeholder="En qué olas funciona, si lleva quillas o funda, por qué la vendes…"
          maxLength={2000}
          value={d.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>
    </div>
  );
}
