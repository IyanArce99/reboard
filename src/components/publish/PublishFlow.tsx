"use client";

// Publicación guiada en 5 pasos (design/prototype/Reboard.dc.html, pantalla «publicar»,
// y moreVals() en design/source/prototype-logic.js).
// ⚠️ DEMO: no hay backend. Las fotos se quedan en el dispositivo (URL blob: locales) y
// demoPublishService no guarda nada ni envía SMS (src/lib/publish/service.ts).

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ListingCard } from "@/components/listing/ListingCard";
import { readPanelState } from "@/components/panel/panelStore";
import { useUserState } from "@/components/user/UserStateProvider";
import {
  CONDITIONS,
  CONDITION_LABEL,
  CONSTRUCTIONS,
  CONSTRUCTION_INFO,
  SHAPES,
  SHAPE_INFO,
  ZONES,
  zoneBySlug,
} from "@/lib/domain/taxonomy";
import type { CatalogModel } from "@/lib/domain/types";
import { eur } from "@/lib/domain/format";
import {
  NO_BRAND_OPTION,
  OTHER_MODEL,
  SHAPER_LOCAL,
  applyCatalogSize,
  convertUnits,
  emptyDraft,
  pendingCount,
  previewListing,
  type ContactMethod,
  type DraftPhoto,
  type FieldSource,
  type PublishDraft,
} from "@/lib/publish/draft";
import { parseMeasures, type MeasureKey } from "@/lib/publish/parse";
import { getPublishService, isPlausiblePhone, type PublishResult } from "@/lib/publish/service";
import ui from "@/styles/ui.module.css";
import styles from "./Publish.module.css";

const MAX_PHOTOS = 8;
const STEPS = ["Fotos", "La tabla", "Estado", "Precio", "Publicar"];
const PHOTO_LABELS = ["cubierta", "fondo", "cola", "nose", "canto", "quillas", "detalle", "funda"];
const SLOT_LABELS = ["Cubierta", "Fondo", "Cola y quillas", "Golpes o reparaciones"];

const SRC_LABEL: Record<FieldSource, { text: string; tone: string; needs: boolean }> = {
  cat: { text: "Según catálogo · confírmalo", tone: "cat", needs: true },
  ai: { text: "Propuesta automática · revísala", tone: "ai", needs: true },
  ok: { text: "Confirmado por ti", tone: "ok", needs: false },
  "": { text: "Opcional, pero ayuda a que te encuentren", tone: "none", needs: false },
};

const CONTACTS: [ContactMethod, string][] = [
  ["whatsapp", "WhatsApp"],
  ["phone", "Teléfono"],
  ["email", "Email"],
];

const NEXT_ERROR: Record<number, string> = {
  1: "Añade al menos una foto",
  2: "Indica al menos la longitud",
  3: "Elige forma, construcción y estado",
  4: "Indica un precio",
};

interface Props {
  catalog: CatalogModel[];
  /** Precios de los anuncios activos por modelo de catálogo (slug → precios). Solo datos existentes. */
  priceRefs: Record<string, number[]>;
  nowIso: string;
  /** true si los anuncios de referencia son simulados. */
  dataIsDemo: boolean;
  initial: PublishDraft | null;
  editingId: string | null;
}

function Chip({ on, onClick, children, mono }: { on: boolean; onClick: () => void; children: React.ReactNode; mono?: boolean }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`${ui.chip} ${styles.chip} ${mono ? ui.chipMono : ""}`}>
      {children}
    </button>
  );
}

export function PublishFlow({ catalog, priceRefs, nowIso, dataIsDemo, initial, editingId }: Props) {
  const { toast } = useUserState();
  const [d, setD] = useState<PublishDraft>(() => initial ?? emptyDraft());
  const [step, setStep] = useState(initial ? 2 : 1);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const set = (p: Partial<PublishDraft>) => setD((x) => ({ ...x, ...p }));

  // «Editar» desde el panel: el precio puede haberse bajado en este dispositivo (rb-panel-v1).
  useEffect(() => {
    if (!editingId) return;
    const price = readPanelState()[editingId]?.price;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (price != null) setD((x) => ({ ...x, price: String(price) }));
  }, [editingId]);

  // Libera las URL blob: de las fotos locales al salir de la pantalla.
  const photosRef = useRef(d.photos);
  useEffect(() => {
    photosRef.current = d.photos;
  }, [d.photos]);
  useEffect(
    () => () => {
      for (const p of photosRef.current) if (p.local) URL.revokeObjectURL(p.url);
    },
    [],
  );

  const goTo = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  // ——— Catálogo ———
  const brands = useMemo(() => [...new Set(catalog.map((m) => m.brand))], [catalog]);
  const models = catalog.filter((m) => m.brand === d.brand);
  const pm = catalog.find((m) => m.brand === d.brand && m.model === d.model);
  const refs = pm ? (priceRefs[pm.slug] ?? []) : [];

  const canNext: Record<number, boolean> = {
    1: d.photos.length > 0,
    2: !!d.len.trim(),
    3: !!(d.shape && d.construction && d.condition),
    4: Number(d.price) > 0,
    5: true,
  };

  const next = () => {
    if (!canNext[step]) {
      toast(NEXT_ERROR[step]);
      return;
    }
    goTo(step + 1);
  };

  // ——— Fotos ———
  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - d.photos.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/"));
    if (picked.length > room) toast(`Puedes añadir hasta ${MAX_PHOTOS} fotos`);
    const added: DraftPhoto[] = picked.slice(0, Math.max(0, room)).map((f) => ({ url: URL.createObjectURL(f), local: true }));
    if (added.length) set({ photos: [...d.photos, ...added] });
  };
  const removePhoto = (i: number) => {
    const p = d.photos[i];
    if (p?.local) URL.revokeObjectURL(p.url);
    set({ photos: d.photos.filter((_, k) => k !== i) });
  };
  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (d.photos.length >= MAX_PHOTOS) {
      toast(`Puedes añadir hasta ${MAX_PHOTOS} fotos`);
      return;
    }
    ref.current?.click();
  };

  // ——— Medidas ———
  const doParse = () => {
    const o = parseMeasures(paste);
    const keys = Object.keys(o) as MeasureKey[];
    if (!keys.length) {
      toast("No hemos reconocido medidas. Prueba con 7'2 x 21 1/2 x 2 7/8 47L");
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
    toast("Hemos interpretado las medidas. Revísalas y confírmalas.");
  };

  const ft = d.unit === "ft";
  const fields: [MeasureKey, string, string, React.HTMLAttributes<HTMLInputElement>["inputMode"]][] = [
    ["len", "Longitud", ft ? "7'2\"" : "218", ft ? "text" : "decimal"],
    ["width", "Anchura", ft ? '21 1/2"' : "54.6", ft ? "text" : "decimal"],
    ["thick", "Grosor", ft ? '2 7/8"' : "7.3", ft ? "text" : "decimal"],
    ["vol", "Volumen (L)", "47", "decimal"],
  ];

  const pending = pendingCount(d);

  // ——— Publicar (STUB) ———
  const publish = async () => {
    if (!isPlausiblePhone(d.phone)) {
      toast("Introduce tu teléfono para verificar la publicación");
      return;
    }
    setBusy(true);
    try {
      const svc = getPublishService();
      await svc.verifyPhone(d.phone);
      setResult(await svc.publish(d, { phone: d.phone, editingId }));
      window.scrollTo({ top: 0 });
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    for (const p of d.photos) if (p.local) URL.revokeObjectURL(p.url);
    setD(emptyDraft(d.zone));
    setPaste("");
    setResult(null);
    goTo(1);
  };

  if (result) return <Done result={result} editing={!!editingId} onAgain={restart} />;

  const zone = zoneBySlug(d.zone);

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h1 ref={headingRef} tabIndex={-1} className={`${ui.h1} ${styles.h1}`}>
          {editingId ? "Editar anuncio" : "Vende tu tabla"}
        </h1>
        <span className={styles.stepCount}>Paso {step} de 5</span>
      </div>

      <ol className={styles.progress} aria-label="Pasos">
        {STEPS.map((l, i) => {
          const n = i + 1;
          return (
            <li key={l}>
              <button
                type="button"
                className={styles.progressBtn}
                data-done={n <= step || undefined}
                data-current={n === step || undefined}
                aria-current={n === step ? "step" : undefined}
                disabled={n >= step}
                onClick={() => goTo(n)}
              >
                <span className={styles.bar} />
                <span className={styles.progressLabel}>{l}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <section className={styles.section} style={{ gap: 14 }}>
          <h2 className={styles.h2}>Fotos de la tabla</h2>
          <p className={styles.lead}>
            Cubierta, fondo, cola con quillas y cualquier golpe o reparación. Con luz natural y la tabla entera.
          </p>
          <div className={styles.photos}>
            {d.photos.map((p, i) => (
              <div key={p.url} className={styles.photo}>
                <Image src={p.url} alt={`Foto ${i + 1}: ${PHOTO_LABELS[i]}`} fill sizes="120px" className={styles.photoImg} />
                <span className={styles.photoLabel}>{PHOTO_LABELS[i]}</span>
                <button type="button" aria-label={`Quitar la foto ${i + 1}`} className={styles.photoRm} onClick={() => removePhoto(i)}>
                  ✕
                </button>
              </div>
            ))}
            {SLOT_LABELS.slice(d.photos.length).map((l) => (
              <div key={l} className={styles.slot} aria-hidden="true">
                {l}
              </div>
            ))}
          </div>
          <div className={styles.photoBtns}>
            <button type="button" className={styles.btnPetrol} onClick={() => openPicker(cameraRef)}>
              Hacer foto
            </button>
            <button type="button" className={styles.btnWhite} onClick={() => openPicker(galleryRef)}>
              Elegir de la galería
            </button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className={styles.small}>
            {d.photos.length} de {MAX_PHOTOS} fotos. Demo: las fotos solo se ven en este dispositivo; no se suben a ningún sitio.
          </p>
        </section>
      )}

      {step === 2 && (
        <section className={styles.section} style={{ gap: 18 }}>
          <h2 className={styles.h2}>¿Qué tabla es?</h2>
          <div className={styles.group} role="group" aria-labelledby="pub-brand">
            <span id="pub-brand" className={ui.label}>
              Marca
            </span>
            <div className={styles.chips}>
              {[...brands, SHAPER_LOCAL, NO_BRAND_OPTION].map((b) => (
                <Chip key={b} on={d.brand === b} onClick={() => set({ brand: b, model: "", size: "" })}>
                  {b}
                </Chip>
              ))}
            </div>
          </div>
          {models.length > 0 && (
            <div className={styles.group} role="group" aria-labelledby="pub-model">
              <span id="pub-model" className={ui.label}>
                Modelo
              </span>
              <div className={styles.chips}>
                {models.map((m) => (
                  <Chip
                    key={m.slug}
                    on={d.model === m.model}
                    onClick={() => set({ model: m.model, size: "", shape: m.shape, construction: m.construction })}
                  >
                    {m.model}
                  </Chip>
                ))}
                <Chip on={d.model === OTHER_MODEL} onClick={() => set({ model: OTHER_MODEL, size: "" })}>
                  Otro modelo
                </Chip>
              </div>
            </div>
          )}
          {pm && (
            <div className={styles.group} role="group" aria-labelledby="pub-size">
              <span id="pub-size" className={ui.label}>
                Medida del catálogo
              </span>
              <div className={styles.chips}>
                {pm.sizes.map((s) => (
                  <Chip key={s.label} mono on={d.size === s.label} onClick={() => setD((x) => applyCatalogSize(x, s))}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className={styles.box}>
            <label htmlFor="pub-paste" className={styles.boxTitle}>
              ¿Tienes las medidas escritas? Pégalas
            </label>
            <div className={styles.pasteRow}>
              <input
                id="pub-paste"
                className={styles.pasteInput}
                placeholder="7'2 x 21 1/2 x 2 7/8 47L"
                value={paste}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setPaste(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doParse();
                }}
              />
              <button type="button" className={styles.pasteBtn} onClick={doParse}>
                Interpretar
              </button>
            </div>
          </div>

          <div className={styles.measHead}>
            <span className={ui.label}>Medidas · confirma cada dato</span>
            <div className={styles.units} role="group" aria-label="Unidad de medida">
              {(
                [
                  ["ft", "pies / pulgadas"],
                  ["cm", "cm"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={d.unit === v} className={styles.unit} onClick={() => setD((x) => convertUnits(x, v))}>
                  {l}
                </button>
              ))}
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
                    aria-describedby={`${id}-src`}
                    onChange={(e) => set({ [k]: e.target.value, src: { ...d.src, [k]: "ok" } })}
                  />
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
                </div>
              );
            })}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={styles.section} style={{ gap: 18 }}>
          <h2 className={styles.h2}>Tipo y estado</h2>
          {(
            [
              ["Forma", SHAPES.map((s) => [s, SHAPE_INFO[s].label] as const), d.shape, (v: string) => set({ shape: v as PublishDraft["shape"] })],
              ["Construcción", CONSTRUCTIONS.map((c) => [c, CONSTRUCTION_INFO[c].label] as const), d.construction, (v: string) => set({ construction: v as PublishDraft["construction"] })],
              ["Estado", CONDITIONS.map((c) => [c, CONDITION_LABEL[c]] as const), d.condition, (v: string) => set({ condition: v as PublishDraft["condition"] })],
            ] as const
          ).map(([t, opts, cur, pick]) => (
            <div key={t} className={styles.group} role="group" aria-label={t}>
              <span className={ui.label} aria-hidden="true">
                {t}
              </span>
              <div className={styles.chips}>
                {opts.map(([v, l]) => (
                  <Chip key={v} on={cur === v} onClick={() => pick(v)}>
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
          <label className={styles.labelField}>
            Reparaciones o golpes (si los hay)
            <textarea
              className={styles.textarea}
              placeholder="p. ej. golpe en la cola reparado, estanco"
              value={d.repairs}
              onChange={(e) => set({ repairs: e.target.value })}
            />
          </label>
        </section>
      )}

      {step === 4 && (
        <section className={styles.section} style={{ gap: 16 }}>
          <h2 className={styles.h2}>Precio, ubicación y contacto</h2>
          <label className={styles.labelField}>
            Precio (€)
            <input
              inputMode="numeric"
              placeholder="190"
              className={styles.priceInput}
              value={d.price}
              onChange={(e) => set({ price: e.target.value.replace(/[^0-9]/g, "").slice(0, 5) })}
            />
          </label>
          {pm && refs.length > 0 && (
            <div className={styles.hint}>
              Otras {pm.brand} {pm.model} publicadas: entre {eur(Math.min(...refs))} y {eur(Math.max(...refs))} ({refs.length})
              {dataIsDemo ? " · anuncios de demostración" : ""}.
            </div>
          )}
          <div className={styles.grid2}>
            <label className={styles.labelField}>
              Zona
              <select className={styles.select} value={d.zone} onChange={(e) => set({ zone: e.target.value })}>
                {ZONES.map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.labelField}>
              Localidad
              <input
                className={styles.text}
                placeholder={zone?.towns[0] ?? "Las Palmas"}
                list="pub-towns"
                autoComplete="address-level2"
                value={d.town}
                onChange={(e) => set({ town: e.target.value })}
              />
              <datalist id="pub-towns">
                {zone?.towns.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
          </div>
          <div className={styles.group} role="group" aria-labelledby="pub-contact">
            <span id="pub-contact" className={styles.fieldLabel}>
              ¿Cómo quieres que te contacten?
            </span>
            <div className={styles.chips}>
              {CONTACTS.map(([v, l]) => (
                <Chip key={v} on={d.contact === v} onClick={() => set({ contact: v })}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <label className={styles.labelField}>
            Descripción · opcional
            <textarea
              className={styles.textarea}
              style={{ minHeight: 96 }}
              placeholder="Uso, olas en las que funciona, qué incluye…"
              value={d.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>
        </section>
      )}

      {step === 5 && (
        <section className={`${styles.section} ${styles.review}`}>
          <div>
            <div className={ui.label} style={{ marginBottom: 8 }}>
              Así se verá
            </div>
            {/* Vista previa con la tarjeta real; inert: no es un anuncio, no se puede abrir ni guardar. */}
            <div inert className={styles.preview}>
              <ListingCard listing={previewListing(d, catalog, now)} now={now} hereZone={d.zone} layout="vertical" />
            </div>
            <p className={styles.small} style={{ marginTop: 8 }}>
              Vista previa. No aparece en búsquedas.
            </p>
          </div>
          <div className={styles.reviewSide}>
            <h2 className={styles.h2}>Revisa y publica</h2>
            {(pending > 0 || !d.vol.trim()) && (
              <div className={styles.warn} role="note">
                {pending > 0
                  ? `Tienes ${pending} dato${pending > 1 ? "s" : ""} sin confirmar. Solo publicaremos como verificados los que confirmes.`
                  : "No has indicado los litros. El anuncio aparecerá como «litros sin indicar» y saldrá en menos búsquedas."}
              </div>
            )}
            <div className={styles.box}>
              <label htmlFor="pub-phone" className={styles.boxTitle} style={{ fontSize: 15 }}>
                Verifica tu teléfono para publicar
              </label>
              <span className={styles.sub}>Solo lo pedimos ahora, al final. No se muestra en el anuncio si eliges WhatsApp.</span>
              <input
                id="pub-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+34 600 000 000"
                className={styles.phoneInput}
                value={d.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
              <span className={styles.demoNote}>
                <span className={ui.demoTag}>DEMO</span> No se envía ningún SMS ni se guarda el número.
              </span>
            </div>
            <button type="button" className={styles.publishBtn} onClick={publish} disabled={busy} aria-busy={busy || undefined}>
              {editingId ? "Guardar cambios" : "Publicar gratis"}
            </button>
          </div>
        </section>
      )}

      <div className={styles.bottomBar}>
        {step > 1 ? (
          <button type="button" className={styles.backBtn} onClick={() => goTo(step - 1)}>
            Atrás
          </button>
        ) : (
          <Link href={editingId ? "/panel" : "/vender"} className={styles.backBtn}>
            Salir
          </Link>
        )}
        {step < 5 && (
          <button type="button" className={styles.nextBtn} data-ready={canNext[step] || undefined} onClick={next}>
            {step === 4 ? "Revisar anuncio" : "Continuar"}
          </button>
        )}
      </div>
    </main>
  );
}

function Done({ result, editing, onAgain }: { result: PublishResult; editing: boolean; onAgain: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const real = result.persisted;
  return (
    <main className={`${styles.page} ${styles.donePage}`}>
      <section className={styles.done}>
        <span className={styles.doneIcon} data-demo={!real || undefined} aria-hidden="true">
          {real ? "✓" : "i"}
        </span>
        <h1 ref={ref} tabIndex={-1} className={styles.doneH1}>
          {real ? "Tu tabla está publicada" : editing ? "Cambios revisados (demo)" : "Anuncio listo (demo)"}
        </h1>
        <div className={styles.doneKicker}>Reboard · su próxima vida empieza aquí</div>
        {real ? (
          <p className={styles.doneText}>
            Ya aparece en búsquedas por sus medidas. Cada 14 días te pediremos que confirmes que sigue disponible.
          </p>
        ) : (
          <>
            <p className={styles.doneText}>
              {editing
                ? "Esto es una demostración: los cambios no se han guardado en el anuncio."
                : "Esto es una demostración: el anuncio no se ha publicado de verdad."}{" "}
              Reboard aún no tiene base de datos ni verificación por SMS, así que no aparece en búsquedas, no se ha enviado
              ningún aviso y las fotos no han salido de tu dispositivo.
            </p>
            <p className={styles.doneText}>
              Cuando el servicio esté activo, tu anuncio aparecerá en búsquedas por sus medidas y cada 14 días te pediremos
              que confirmes que sigue disponible.
            </p>
          </>
        )}
        <div className={styles.doneBtns}>
          <Link href="/panel" className={styles.btnPetrol}>
            Ir a mi panel
          </Link>
          <button type="button" className={styles.btnWhite} onClick={onAgain}>
            Publicar otra tabla
          </button>
        </div>
      </section>
    </main>
  );
}
