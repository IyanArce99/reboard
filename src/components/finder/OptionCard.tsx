"use client";

import { useRef } from "react";
import styles from "./Finder.module.css";

export interface Option {
  value: string;
  title: string;
  description?: string;
}

interface CardProps {
  option: Option;
  checked: boolean;
  multi: boolean;
  tabIndex?: number;
  onSelect: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  ref?: React.Ref<HTMLButtonElement>;
}

/** Tarjeta de opción del asistente: role radio o checkbox con aria-checked (CLAUDE.md). */
export function OptionCard({ option, checked, multi, tabIndex, onSelect, onKeyDown, ref }: CardProps) {
  return (
    <button
      ref={ref}
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={checked}
      tabIndex={tabIndex}
      className={styles.option}
      data-on={checked || undefined}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span className={styles.optionText}>
        <span className={styles.optionTitle}>{option.title}</span>
        {option.description && <span className={styles.optionDesc}>{option.description}</span>}
      </span>
      <span className={styles.optionMark} data-multi={multi || undefined} aria-hidden="true">
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

interface GroupProps {
  label: string;
  options: Option[];
  /** Valores seleccionados. En selección única, como mucho uno. */
  selected: string[];
  multi?: boolean;
  twoCols?: boolean;
  onToggle: (value: string) => void;
}

/**
 * Grupo de OptionCard. En selección única es un radiogroup con un solo tabulador
 * y flechas para moverse; en múltiple, un grupo de checkboxes.
 */
export function OptionGroup({ label, options, selected, multi = false, twoCols = false, onToggle }: GroupProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(0, options.findIndex((o) => selected.includes(o.value)));

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const j = (i + delta + options.length) % options.length;
    refs.current[j]?.focus();
    if (!selected.includes(options[j].value)) onToggle(options[j].value);
  };

  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={label} className={styles.options} data-cols={twoCols ? 2 : undefined}>
      {options.map((o, i) => (
        <OptionCard
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          option={o}
          checked={selected.includes(o.value)}
          multi={multi}
          tabIndex={multi ? undefined : i === current ? 0 : -1}
          onSelect={() => onToggle(o.value)}
          onKeyDown={multi ? undefined : onKeyDown(i)}
        />
      ))}
    </div>
  );
}
