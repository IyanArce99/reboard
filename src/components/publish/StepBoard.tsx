"use client";

// Paso 2 · La tabla: marca → modelo → medida del catálogo (autorrellena «Según catálogo · confírmalo»),
// o medidas pegadas/escritas para quien no conoce el modelo. Y el tipo: forma y construcción.
// El origen de cada dato (cat / ai / ok) lo traduce draftToInput a 'manufacturer' o 'seller'.

import { useMemo, useState } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import { CONSTRUCTIONS, CONSTRUCTION_INFO, POPULAR_BRANDS, SHAPES, SHAPE_INFO } from "@/lib/domain/taxonomy";
import {
  NO_BRAND_OPTION,
  OTHER_BRAND,
  OTHER_MODEL,
  SHAPER_LOCAL,
  applyCatalogSize,
  convertUnits,
  orderBrands,
  visibleBrandCount,
  type FieldSource,
  type PublishDraft,
} from "@/lib/publish/draft";
import { describeMeasure, parseMeasures, type MeasureKey } from "@/lib/publish/parse";
import { Chip, Group, type CatalogProps, type StepProps } from "./parts";
import styles from "./Publish.module.css";

const SRC_LABEL: Record<FieldSource, { text: string; tone: string; needs: boolean }> = {
  cat: { text: "Según catálogo · confírmalo", tone: "cat", needs: true },
  ai: { text: "Sacado de tu texto · revísalo", tone: "ai", needs: true },
  ok: { text: "Confirmado por ti", tone: "ok", needs: false },
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

/** Marcas visibles antes de «Ver todas» como mínimo (y todas las destacadas, aunque sean más). */
const TOP_BRANDS = 12;

export function StepBoard({ d, set, setD, catalog, brands: known, featuredBrands, toast }: Props) {
  const [paste, setPaste] = useState("");
  // Error fijo bajo el campo (no un toast que desaparece): DESIGN_AUDIT §8.
  const [pasteError, setPasteError] = useState("");
  const [allBrands, setAllBrands] = useState(false);
  // Torq, NSP, Softech… primero; el listado completo, tras «Ver todas las marcas».
  const featured = featuredBrands?.length ? featuredBrands : POPULAR_BRANDS;
  const brands = useMemo(() => orderBrands(known, [...new Set(catalog.map((m) => m.brand))], featured), [catalog, known, featured]);
  const top = visibleBrandCount(brands.filter((b) => featured.includes(b)).length, TOP_BRANDS);
  // Al editar un anuncio con una marca escrita a mano que no está en la lista, se muestra igual.
  const special = [SHAPER_LOCAL, NO_BRAND_OPTION, OTHER_BRAND];
  const shownBrands = [
    ...(allBrands ? brands : brands.filter((b, i) => i < top || b === d.brand)),
    ...(d.brand && !brands.includes(d.brand) && !special.includes(d.brand) ? [d.brand] : []),
  ];
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
  const fields: [MeasureKey, string, string, React.HTMLAttributes<HTMLInputElement>["inputMode"]][] = [
    ["len", "Longitud", ft ? "6'4\"" : "193", ft ? "text" : "decimal"],
    ["width", "Anchura", ft ? '20 1/2"' : "52", ft ? "text" : "decimal"],
    ["thick", "Grosor", ft ? '2 5/8"' : "6,7", ft ? "text" : "decimal"],
    ["vol", "Litros", "34", "decimal"],
  ];

  return (
    <div className={styles.stepBody}>
      <Group id="pub-brand" title="Marca" hint="¿No está en la lista? Elige «Otra marca» y escríbela. Si no tiene marca, «Shaper local» o «Sin marca».">
        <div className={styles.chips}>
          {[...shownBrands, SHAPER_LOCAL, NO_BRAND_OPTION, OTHER_BRAND].map((b) => (
            <Chip key={b} on={d.brand === b} onClick={() => set({ brand: b, model: "", size: "" })}>
              {b}
            </Chip>
          ))}
        </div>
        {brands.length > top && (
          <button type="button" className={styles.moreBrands} aria-expanded={allBrands} onClick={() => setAllBrands((a) => !a)}>
            {allBrands ? "Ver menos marcas" : `Ver todas las marcas (${brands.length})`}
          </button>
        )}
        {d.brand === OTHER_BRAND && (
          <div className={styles.labelField}>
            <label htmlFor="pub-brand-other">¿Qué marca es?</label>
            <input
              id="pub-brand-other"
              className={styles.text}
              maxLength={60}
              autoComplete="off"
              placeholder="Escribe la marca"
              value={d.brandOther}
              onChange={(e) => set({ brandOther: e.target.value })}
            />
          </div>
        )}
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
            ¿Las tienes escritas en la tabla? Cópialas tal cual
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

        <div className={styles.fields}>
          {fields.map(([k, label, ph, im]) => {
            const s = SRC_LABEL[d.src[k] ?? ""];
            const id = `pub-${k}`;
            // Cómo hemos entendido lo escrito («6'4" · 193 cm») o qué no cuadra, al momento.
            const reading = describeMeasure(k, d[k], d.unit);
            const describedBy = [s.needs ? `${id}-src` : "", reading ? `${id}-read` : ""].filter(Boolean).join(" ") || undefined;
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
                {s.needs && (
                  <div className={styles.srcRow}>
                    <span id={`${id}-src`} className={styles.src} data-tone={s.tone}>
                      {s.text}
                    </span>
                    <button
                      type="button"
                      className={styles.confirm}
                      aria-label={`Confirmar ${label.toLowerCase()}`}
                      onClick={() => set({ src: { ...d.src, [k]: "ok" } })}
                    >
                      Confirmar
                    </button>
                  </div>
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
