"use client";

// Campo «Marca» de publicar: se escribe y se autocompleta (combobox accesible). Sustituye a la pared
// de chips con 30+ marcas, difícil de leer. Si la marca no está en la lista, lo escrito vale como
// marca («Usar «…» como marca»). «Shaper local» y «Sin marca», como atajos debajo.

import { useId, useRef, useState } from "react";
import { NO_BRAND_OPTION, OTHER_BRAND, SHAPER_LOCAL } from "@/lib/publish/draft";
import { exactBrand, matchBrands } from "@/lib/publish/brands";
import styles from "./Publish.module.css";

interface Props {
  brands: string[];
  featured: readonly string[];
  /** Marca del borrador: una de la lista, SHAPER_LOCAL, NO_BRAND_OPTION, OTHER_BRAND o "". */
  brand: string;
  brandOther: string;
  onChange: (brand: string, brandOther: string) => void;
  invalid?: boolean;
}

type Option = { kind: "brand"; value: string } | { kind: "custom"; value: string };

export function BrandPicker({ brands, featured, brand, brandOther, onChange, invalid }: Props) {
  const special = brand === SHAPER_LOCAL || brand === NO_BRAND_OPTION;
  const [query, setQuery] = useState(brand === OTHER_BRAND ? brandOther : special ? "" : brand);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const trimmed = query.trim();
  const exact = exactBrand(trimmed, brands);
  const options: Option[] = [
    ...matchBrands(query, brands, featured).map((value) => ({ kind: "brand" as const, value })),
    ...(trimmed && !exact ? [{ kind: "custom" as const, value: trimmed }] : []),
  ];
  const showList = open && options.length > 0;

  const pick = (o: Option) => {
    if (o.kind === "brand") {
      setQuery(o.value);
      onChange(o.value, "");
    } else {
      onChange(OTHER_BRAND, o.value);
    }
    setOpen(false);
  };

  const type = (v: string) => {
    setQuery(v);
    setOpen(true);
    setActive(0);
    const t = v.trim();
    const match = exactBrand(t, brands);
    // Lo escrito ya cuenta: si coincide con una marca de la lista, esa; si no, como marca propia.
    if (match) onChange(match, "");
    else if (t) onChange(OTHER_BRAND, t);
    else onChange("", "");
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (options.length ? (i - 1 + options.length) % options.length : 0));
    } else if (e.key === "Enter" && showList) {
      e.preventDefault();
      pick(options[Math.min(active, options.length - 1)]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const setSpecial = (b: string) => {
    setQuery("");
    setOpen(false);
    onChange(brand === b ? "" : b, "");
  };

  return (
    <div className={styles.brandPicker}>
      <div className={styles.comboWrap}>
        <input
          ref={inputRef}
          id="pub-brand-input"
          className={styles.text}
          role="combobox"
          aria-labelledby="pub-brand"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${Math.min(active, options.length - 1)}` : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={60}
          placeholder={special ? (brand === SHAPER_LOCAL ? "Shaper local" : "Sin marca") : "Escribe la marca: Torq, Firewire, NSP…"}
          value={query}
          onChange={(e) => type(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
        />
        {query && (
          <button
            type="button"
            className={styles.comboClear}
            aria-label="Borrar la marca"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              type("");
              inputRef.current?.focus();
            }}
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
        {showList && (
          <ul id={listId} role="listbox" aria-label="Marcas" className={styles.comboList}>
            {options.map((o, i) => (
              <li
                key={`${o.kind}-${o.value}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={styles.comboOption}
                data-custom={o.kind === "custom" || undefined}
                // mousedown: elegir antes de que el campo pierda el foco y cierre la lista.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
              >
                {o.kind === "brand" ? o.value : `Usar «${o.value}» como marca`}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.brandSpecial}>
        <span>¿No tiene marca?</span>
        {[SHAPER_LOCAL, NO_BRAND_OPTION].map((b) => (
          <button key={b} type="button" className={styles.brandSpecialBtn} aria-pressed={brand === b} onClick={() => setSpecial(b)}>
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}
