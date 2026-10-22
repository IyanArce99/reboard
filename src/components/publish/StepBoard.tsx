"use client";

// Paso 2 · La tabla: marca → modelo → medida del catálogo (autorrellena «Según catálogo · confírmalo»),
// o medidas pegadas/escritas para quien no conoce el modelo. Y el tipo: forma y construcción.
// El origen de cada dato (cat / ai / ok) lo traduce draftToInput a 'manufacturer' o 'seller'.

import { useMemo, useState } from "react";
import { BoardShape } from "@/components/brand/BoardShape";
import { CONSTRUCTIONS, CONSTRUCTION_INFO, SHAPES, SHAPE_INFO } from "@/lib/domain/taxonomy";
import {
  NO_BRAND_OPTION,
  OTHER_MODEL,
  SHAPER_LOCAL,
  applyCatalogSize,
  convertUnits,
  type FieldSource,
  type PublishDraft,
} from "@/lib/publish/draft";
import { parseMeasures, type MeasureKey } from "@/lib/publish/parse";
import { Chip, Group, type CatalogProps, type StepProps } from "./parts";
import styles from "./Publish.module.css";

const SRC_LABEL: Record<FieldSource, { text: string; tone: string; needs: boolean }> = {
  cat: { text: "Según catálogo · confírmalo", tone: "cat", needs: true },
  ai: { text: "Propuesta automática · revísala", tone: "ai", needs: true },
  ok: { text: "Confirmado por ti", tone: "ok", needs: false },
  "": { text: "", tone: "none", needs: false },
};

interface Props extends StepProps, CatalogProps {
  toast: (text: string) => void;
}

export function StepBoard({ d, set, setD, catalog, toast }: Props) {
  const [paste, setPaste] = useState("");
  const brands = useMemo(() => [...new Set(catalog.map((m) => m.brand))], [catalog]);
  const models = catalog.filter((m) => m.brand === d.brand);
  const pm = catalog.find((m) => m.brand === d.brand && m.model === d.model);

  const doParse = () => {
    const o = parseMeasures(paste);
    const keys = Object.keys(o) as MeasureKey[];
    if (!keys.length) {
      toast("No hemos reconocido las medidas. Prueba así: 6'4 x 20 1/2 x 2 5/8 34L");
      return;
    }
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
    ["thick", "Grosor", ft ? '2 5/8"' : "6.7", ft ? "text" : "decimal"],
    ["vol", "Litros", "34", "decimal"],
  ];

  return (
    <div className={styles.stepBody}>
      <Group id="pub-brand" title="Marca" hint="¿Sin marca o no la sabes? Elige «Shaper local» o «Sin marca».">
        <div className={styles.chips}>
          {[...brands, SHAPER_LOCAL, NO_BRAND_OPTION].map((b) => (
            <Chip key={b} on={d.brand === b} onClick={() => set({ brand: b, model: "", size: "" })}>
              {b}
            </Chip>
          ))}
        </div>
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
              onChange={(e) => setPaste(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doParse();
              }}
            />
            <button type="button" className={styles.pasteBtn} onClick={doParse}>
              Rellenar
            </button>
          </div>
        </div>

        <div className={styles.fields}>
          {fields.map(([k, label, ph, im]) => {
            const s = SRC_LABEL[d.src[k] ?? ""];
            const id = `pub-${k}`;
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
                  aria-describedby={s.text ? `${id}-src` : undefined}
                  onChange={(e) => set({ [k]: e.target.value, src: { ...d.src, [k]: "ok" } })}
                />
                {s.text && (
                  <div className={styles.srcRow}>
                    <span id={`${id}-src`} className={styles.src} data-tone={s.tone}>
                      {s.text}
                    </span>
                    {s.needs && (
                      <button
                        type="button"
                        className={styles.confirm}
                        aria-label={`Confirmar ${label.toLowerCase()}`}
                        onClick={() => set({ src: { ...d.src, [k]: "ok" } })}
                      >
                        Confirmar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!d.vol.trim() && <p className={styles.small}>Los litros son opcionales, pero sin ellos tu tabla sale en menos búsquedas.</p>}
      </div>

      <Group id="pub-shape" title="Tipo de tabla">
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
