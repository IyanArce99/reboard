"use client";

// Paso 2 · La tabla: marca → modelo → medida del catálogo (autorrellena «Según catálogo · confírmalo»),
// o medidas pegadas/escritas para quien no conoce el modelo. Y el tipo: forma y construcción.
// El origen de cada dato (cat / ai / ok) lo traduce draftToInput a 'manufacturer' o 'seller'.

import { useMemo, useState } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import { CONSTRUCTIONS, CONSTRUCTION_INFO, POPULAR_BRANDS, SHAPES, SHAPE_INFO } from "@/lib/domain/taxonomy";
import {
  OTHER_MODEL,
  applyCatalogSize,
  confirmAll,
  convertUnits,
  orderBrands,
  pendingCount,
  type FieldSource,
  type PublishDraft,
} from "@/lib/publish/draft";
import { describeMeasure, parseMeasures, type MeasureKey } from "@/lib/publish/parse";
import { BrandPicker } from "./BrandPicker";
import { Chip, Group, type CatalogProps, type StepProps } from "./parts";
import styles from "./Publish.module.css";

const SRC_LABEL: Record<FieldSource, { text: string; tone: string; needs: boolean }> = {
  cat: { text: "Del catálogo", tone: "cat", needs: true },
  catok: { text: "Del catálogo", tone: "cat", needs: false },
  ai: { text: "Sacado de tu texto", tone: "ai", needs: true },
  ok: { text: "", tone: "none", needs: false },
  "": { text: "", tone: "none", needs: false },
};

interface Props extends StepProps, CatalogProps {
  /** Marcas conocidas (tengan o no modelos en el catálogo). */
  brands: string[];
  /**
   * Marcas destacadas en el orden del panel (/admin/catalogo → repo.brands() con featured). Siempre
   * visibles. Sin la lista, las habituales (POPULAR_BRANDS).
   */
  featuredBrands?: string[];
  toast: (text: string) => void;
}

export function StepBoard({ d, set, setD, catalog, brands: known, featuredBrands, toast }: Props) {
  const [paste, setPaste] = useState("");
  // Error fijo bajo el campo (no un toast que desaparece): DESIGN_AUDIT §8.
  const [pasteError, setPasteError] = useState("");
  // Torq, NSP, Softech… primero (sugerencias con el campo vacío); el resto, al escribir.
  const featured = featuredBrands?.length ? featuredBrands : POPULAR_BRANDS;
  const brands = useMemo(() => orderBrands(known, [...new Set(catalog.map((m) => m.brand))], featured), [catalog, known, featured]);
  const models = catalog.filter((m) => m.brand === d.brand);
  const pm = catalog.find((m) => m.brand === d.brand && m.model === d.model);

  const doParse = () => {
    const o = parseMeasures(paste);
    const keys = Object.keys(o) as MeasureKey[];
    if (!keys.length) {
      setPasteError("No hemos reconocido las medidas. Prueba así: 6'4 x 20 1/2 x 2 5/8 34L");
      return;
    }
    setPasteError("");
    // El parser devuelve pies y pulgadas: se pasa a cm si es la unidad elegida.
    const parsed = convertUnits({ ...d, unit: "ft", len: o.len ?? "", width: o.width ?? "", thick: o.thick ?? "", vol: o.vol ?? "" }, d.unit);
    const patch: Partial<PublishDraft> = { src: { ...d.src } };
    for (const k of keys) {
      patch[k] = parsed[k];
      patch.src![k] = "ai";
    }
    set(patch);
    toast("Medidas rellenadas. Revísalas y confírmalas.");
  };

  const ft = d.unit === "ft";
  const pending = pendingCount(d);
  const pendingFrom = Object.values(d.src).includes("cat") ? "cat" : "ai";
  const fields: [MeasureKey, string, string, React.HTMLAttributes<HTMLInputElement>["inputMode"]][] = [
    // «ej.» delante: sin él, los ejemplos parecían medidas ya rellenadas.
    ["len", "Longitud", ft ? "ej. 6'4\"" : "ej. 193", ft ? "text" : "decimal"],
    ["width", "Anchura", ft ? 'ej. 20 1/2"' : "ej. 52", ft ? "text" : "decimal"],
    ["thick", "Grosor", ft ? 'ej. 2 5/8"' : "ej. 6,7", ft ? "text" : "decimal"],
    ["vol", "Litros", "ej. 34", "decimal"],
  ];

  return (
    <div className={styles.stepBody}>
      <Group id="pub-brand" title="Marca" hint="Escribe y elige de la lista. Si no aparece, vale tal cual la escribas.">
        <BrandPicker
          brands={brands}
          featured={featured}
          brand={d.brand}
          brandOther={d.brandOther}
          onChange={(brand, brandOther) =>
            // Cambiar de marca borra modelo y medida del catálogo (eran de la marca anterior).
            set(brand === d.brand ? { brandOther } : { brand, brandOther, model: "", size: "" })
          }
        />
      </Group>

      {models.length > 0 && (
        <Group id="pub-model" title="Modelo">
          <div className={styles.chips}>
            {models.map((m) => (
              <Chip key={m.slug} on={d.model === m.model} onClick={() => set({ model: m.model, size: "", shape: m.shape, construction: m.construction })}>
                {m.model}
              </Chip>
            ))}
            <Chip on={d.model === OTHER_MODEL} onClick={() => set({ model: OTHER_MODEL, size: "" })}>
              Otro modelo
            </Chip>
          </div>
        </Group>
      )}

      {pm && (
        <Group id="pub-size" title="Medida" hint="Elige la tuya y rellenamos el resto con los datos del fabricante.">
          <div className={styles.chips}>
            {pm.sizes.map((s) => (
              <Chip key={s.label} mono on={d.size === s.label} onClick={() => setD((x) => applyCatalogSize(x, s))}>
                {s.label}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      <div className={styles.measures}>
        <div className={styles.measHead}>
          <span id="pub-meas" className={styles.groupTitle}>
            Medidas
          </span>
          <div className={styles.units} role="group" aria-label="Unidad de medida">
            {(
              [
                ["ft", "pies y pulgadas"],
                ["cm", "cm"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={d.unit === v} className={styles.unit} onClick={() => setD((x) => convertUnits(x, v))}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.paste}>
          <label htmlFor="pub-paste" className={styles.pasteLabel}>
            ¿Vienen escritas en la tabla? Escríbelas tal cual y las separamos
          </label>
          <div className={styles.pasteRow}>
            <input
              id="pub-paste"
              className={styles.pasteInput}
              placeholder="6'4 x 20 1/2 x 2 5/8 34L"
              value={paste}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={pasteError ? true : undefined}
              aria-describedby="pub-paste-error"
              onChange={(e) => {
                setPaste(e.target.value);
                if (pasteError) setPasteError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") doParse();
              }}
            />
            <button type="button" className={styles.pasteBtn} onClick={doParse}>
              Rellenar
            </button>
          </div>
          <p id="pub-paste-error" className={styles.error} role="alert">
            {pasteError}
          </p>
        </div>

        {/* Una sola confirmación para todas las medidas rellenadas automáticamente (antes, un botón por
            medida). Corregir una a mano también la confirma. */}
        {pending > 0 && (
          <div className={styles.confirmAll} role="group" aria-label="Medidas rellenadas automáticamente">
            <span>
              {pendingFrom === "cat"
                ? "Hemos rellenado las medidas del catálogo. ¿Coinciden con tu tabla?"
                : "Hemos sacado las medidas de tu texto. ¿Están bien?"}
              <small>Si alguna no cuadra, corrígela abajo.</small>
            </span>
            <button type="button" className={styles.confirm} onClick={() => set({ src: confirmAll(d.src) })}>
              Son correctas
            </button>
          </div>
        )}
        <div className={styles.fields}>
          {fields.map(([k, label, ph, im]) => {
            const s = SRC_LABEL[d.src[k] ?? ""];
            const id = `pub-${k}`;
            // Cómo hemos entendido lo escrito («6'4" · 193 cm») o qué no cuadra, al momento.
            const reading = describeMeasure(k, d[k], d.unit);
            const describedBy = [s.text ? `${id}-src` : "", reading ? `${id}-read` : ""].filter(Boolean).join(" ") || undefined;
            return (
              <div key={k} className={styles.field}>
                <label htmlFor={id} className={styles.fieldLabel}>
                  {label}
                  {k === "len" && <span className={styles.req}> · obligatoria</span>}
                  {k !== "vol" && !ft ? " (cm)" : ""}
                </label>
                <input
                  id={id}
                  inputMode={im}
                  placeholder={ph}
                  value={d[k]}
                  autoComplete="off"
                  data-needs={s.needs || undefined}
                  className={styles.fieldInput}
                  aria-invalid={reading && !reading.ok ? true : undefined}
                  aria-describedby={describedBy}
                  onChange={(e) => set({ [k]: e.target.value, src: { ...d.src, [k]: "ok" } })}
                />
                {reading && (
                  <span id={`${id}-read`} className={styles.reading} data-ok={reading.ok || undefined}>
                    {reading.text}
                  </span>
                )}
                {s.text && (
                  <span id={`${id}-src`} className={styles.src} data-tone={s.tone}>
                    {s.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {!d.vol.trim() && <p className={styles.small}>Los litros son opcionales, pero sin ellos tu tabla sale en menos búsquedas.</p>}
      </div>

      <Group id="pub-shape" title="Tipo de tabla" hint="¿Es una softboard (de espuma)? Elige su forma (casi siempre evolutiva) y abajo, en Construcción, marca Softboard.">
        <div className={styles.shapeGrid}>
          {SHAPES.map((s) => (
            <button key={s} type="button" aria-pressed={d.shape === s} className={styles.shapeOpt} onClick={() => set({ shape: s })}>
              <BoardShape shape={s} size={44} tone={d.shape === s ? "soft" : "light"} />
              <span>{SHAPE_INFO[s].label}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group id="pub-cons" title="Construcción">
        <div className={styles.chips}>
          {CONSTRUCTIONS.map((c) => (
            <Chip key={c} on={d.construction === c} onClick={() => set({ construction: c })}>
              {CONSTRUCTION_INFO[c].label}
            </Chip>
          ))}
        </div>
      </Group>
    </div>
  );
}
