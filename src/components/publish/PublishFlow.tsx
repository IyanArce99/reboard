"use client";

// Publicación guiada en 5 pasos: Fotos · La tabla · Estado · Precio y ubicación · Revisar.
// Rediseño del asistente (docs/DESIGN_AUDIT.md, «Publicar: rediseño del asistente»):
// progreso compacto con titular por paso, formulario a la izquierda y vista previa en vivo a la
// derecha en escritorio; una columna con barra inferior en móvil.
// - Con la base de datos real (`live`): fotos procesadas en el navegador (sin EXIF ni GPS),
//   borrador en IndexedDB, cuenta con código por email al final, Turnstile y publicación real
//   (src/lib/publish/client-publish.ts).
// - En la demo: las fotos se procesan igual, pero nada sale del dispositivo ni se publica.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readPanelState } from "@/components/panel/panelStore";
import { TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { useUserState } from "@/components/user/UserStateProvider";
import type { CatalogModel } from "@/lib/domain/types";
import { publishDraft } from "@/lib/publish/client-publish";
import { OTHER_BRAND, emptyDraft, pendingCount, type DraftPhoto, type PublishDraft } from "@/lib/publish/draft";
import { clearStoredDraft, loadStoredDraft, saveStoredDraft } from "@/lib/publish/draft-store";
import { processPhoto } from "@/lib/publish/image";
import { ListingInput, draftToInput, firstIssueText, toE164 } from "@/lib/publish/schema";
import { DoneScreen, type Done } from "./DoneScreen";
import { CoverPhoto, LivePreview, previewTexts } from "./LivePreview";
import { MAX_PHOTOS, STEPS } from "./parts";
import { StepBoard } from "./StepBoard";
import { StepCondition } from "./StepCondition";
import { StepPhotos } from "./StepPhotos";
import { StepPrice } from "./StepPrice";
import { StepReview } from "./StepReview";
import styles from "./Publish.module.css";

interface Props {
  catalog: CatalogModel[];
  /** Marcas conocidas (tengan o no modelos en el catálogo). */
  brands: string[];
  /** Marcas destacadas en el orden que fija /admin/catalogo (van primero en el selector). */
  featuredBrands?: string[];
  /** Precios de los anuncios activos por modelo de catálogo (slug → precios). Solo datos existentes. */
  priceRefs: Record<string, number[]>;
  nowIso: string;
  /** true si los anuncios de referencia son simulados. */
  dataIsDemo: boolean;
  initial: PublishDraft | null;
  editingId: string | null;
  /** Publicación real (base de datos y cuentas activas). */
  live: boolean;
}

/** Qué falta para pasar del paso `step` (vacío si está completo). */
function stepIssue(step: number, d: PublishDraft, processing: number): string {
  switch (step) {
    case 1:
      if (processing > 0) return "Espera a que terminen de prepararse las fotos.";
      return d.photos.length ? "" : "Añade al menos una foto para continuar.";
    case 2:
      if (d.brand === OTHER_BRAND && !d.brandOther.trim()) return "Escribe la marca o elige «Sin marca».";
      if (!d.len.trim()) return "Indica al menos la longitud de la tabla.";
      if (!d.shape) return "Elige el tipo de tabla.";
      return d.construction ? "" : "Elige la construcción.";
    case 3:
      return d.condition ? "" : "Elige el estado de la tabla.";
    case 4:
      if (!(Number(d.price) > 0)) return "Pon un precio para continuar.";
      if (!d.zone) return "Elige la zona donde está la tabla.";
      if (d.town.trim().length < 2) return "Indica la localidad donde está la tabla.";
      return toE164(d.phone) ? "" : "Revisa el teléfono: por ejemplo, 600 000 000 o +34 600 000 000.";
    default:
      return "";
  }
}

export function PublishFlow({ catalog, brands, featuredBrands, priceRefs, nowIso, dataIsDemo, initial, editingId, live }: Props) {
  const { toast, account } = useUserState();
  const [d, setD] = useState<PublishDraft>(() => initial ?? emptyDraft());
  const [step, setStep] = useState(initial ? 2 : 1);
  // true al entrar a un paso con «Editar» desde la revisión: el botón principal vuelve a ella.
  const [fromReview, setFromReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [processing, setProcessing] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [restored, setRestored] = useState(false);
  const [saved, setSaved] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  // Anuncio ya creado en un intento anterior que falló a mitad (para no duplicarlo al reintentar).
  const [createdId, setCreatedId] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const [waitingCaptcha, setWaitingCaptcha] = useState(false);
  const waitingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const set = (p: Partial<PublishDraft>) => setD((x) => ({ ...x, ...p }));

  // «Editar» desde el panel DEMO: el precio puede haberse bajado en este dispositivo (rb-panel-v1).
  useEffect(() => {
    if (!editingId || live) return;
    const price = readPanelState()[editingId]?.price;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (price != null) setD((x) => ({ ...x, price: String(price) }));
  }, [editingId, live]);

  // Borrador en IndexedDB (solo anuncios nuevos): se recupera al volver y se guarda al cambiar.
  const loaded = useRef(!!initial);
  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    loadStoredDraft().then((s) => {
      if (cancelled) return;
      loaded.current = true;
      if (!s) return;
      const photos: DraftPhoto[] = s.photos.map((p) => ({ url: URL.createObjectURL(p.blob), local: true, blob: p.blob, width: p.width, height: p.height }));
      setD({ ...emptyDraft(), ...s.draft, photos });
      setStep(Math.min(Math.max(s.step, 1), 5));
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(() => {
    if (initial || !loaded.current || done) return;
    const t = setTimeout(() => {
      const { photos, ...rest } = d;
      void saveStoredDraft({
        draft: rest,
        photos: photos.filter((p) => p.blob).map((p) => ({ blob: p.blob!, width: p.width ?? 1, height: p.height ?? 1 })),
        step,
        savedAt: new Date().toISOString(),
      }).then((r) => setSaved(r !== undefined));
    }, 400);
    return () => clearTimeout(t);
  }, [d, step, initial, done]);

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

  const goTo = (n: number, opts: { fromReview?: boolean } = {}) => {
    setStep(n);
    setFromReview(!!opts.fromReview);
    setError("");
    moved.current = true;
  };

  // Tras cambiar de paso (ya pintado): arriba del todo y foco en el titular del paso.
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    window.scrollTo({ top: 0, behavior: "instant" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, fromReview]);

  const pm = catalog.find((m) => m.brand === d.brand && m.model === d.model);
  const refs = pm ? (priceRefs[pm.slug] ?? []) : [];

  const next = () => {
    const issue = stepIssue(step, d, processing);
    if (issue) {
      setError(issue);
      return;
    }
    goTo(fromReview ? 5 : step + 1);
  };

  // ——— Fotos ———
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - d.photos.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    const batch = picked.slice(0, Math.max(0, room));
    if (picked.length > room) {
      const dropped = picked.length - batch.length;
      toast(
        batch.length
          ? `Caben ${MAX_PHOTOS} fotos como máximo: hemos añadido ${batch.length} y dejado fuera ${dropped}.`
          : `Ya tienes ${MAX_PHOTOS} fotos, que es el máximo.`,
      );
    }
    if (!batch.length) return;
    setError("");
    setProcessing((n) => n + batch.length);
    let failed = 0;
    for (const f of batch) {
      try {
        const p = await processPhoto(f);
        const photo: DraftPhoto = { url: URL.createObjectURL(p.blob), local: true, blob: p.blob, width: p.width, height: p.height };
        setD((x) => (x.photos.length >= MAX_PHOTOS ? x : { ...x, photos: [...x.photos, photo] }));
      } catch {
        failed += 1;
      } finally {
        setProcessing((n) => n - 1);
      }
    }
    if (failed) toast(`No hemos podido abrir ${failed === 1 ? "una foto" : `${failed} fotos`}. Prueba con JPG o PNG.`);
  };
  const removePhoto = (i: number) => {
    const p = d.photos[i];
    if (p?.local) URL.revokeObjectURL(p.url);
    set({ photos: d.photos.filter((_, k) => k !== i) });
  };
  const movePhoto = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.photos.length) return;
    const photos = [...d.photos];
    [photos[i], photos[j]] = [photos[j], photos[i]];
    set({ photos });
  };

  const pending = pendingCount(d);

  // ——— Publicar ———
  const validate = useCallback(() => {
    const parsed = ListingInput.safeParse(draftToInput(d, catalog));
    return parsed.success ? "" : firstIssueText(parsed.error);
  }, [d, catalog]);

  const publish = async (token: string | null = captcha) => {
    setError("");
    if (!toE164(d.phone)) {
      setError("Falta tu teléfono. Añádelo en «Precio y ubicación»: es por donde te contactarán (no aparece escrito en el anuncio).");
      return;
    }
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!live) {
      setDone({ path: null, persisted: false });
      window.scrollTo({ top: 0 });
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      // Turnstile aún no ha dado el token (es invisible y tarda unos segundos): en vez de pedir que
      // se vuelva a pulsar, se espera y se publica solo en cuanto llega (efecto de abajo).
      waitingRef.current = true;
      setWaitingCaptcha(true);
      setBusy(true);
      setProgress("Comprobando que no eres un robot…");
      return;
    }
    setBusy(true);
    try {
      const r = await publishDraft({
        draft: d,
        catalog,
        editingId: editingId ?? createdId,
        isNew: !editingId,
        turnstileToken: token,
        onProgress: setProgress,
      });
      if (r.ok) {
        if (!editingId) await clearStoredDraft();
        setDone({ path: r.path, persisted: true });
        window.scrollTo({ top: 0 });
      } else {
        if (r.publicId && !editingId) setCreatedId(r.publicId);
        setError(r.message);
      }
    } catch {
      setError("Se ha cortado la conexión. No has perdido nada: el anuncio sigue guardado en este dispositivo. Vuelve a intentarlo.");
    } finally {
      // El token de Turnstile es de un solo uso.
      turnstile.current?.reset();
      setBusy(false);
      setProgress("");
    }
  };

  // Token de Turnstile: si había una publicación esperándolo, sigue sola.
  const onCaptcha = (token: string | null) => {
    setCaptcha(token);
    if (token && waitingRef.current) {
      waitingRef.current = false;
      setWaitingCaptcha(false);
      setBusy(false);
      void publish(token);
    }
  };

  // Si el token no llega en 20 s, se deja de esperar con un aviso claro.
  useEffect(() => {
    if (!waitingCaptcha) return;
    const t = setTimeout(() => {
      waitingRef.current = false;
      setWaitingCaptcha(false);
      setBusy(false);
      setProgress("");
      setError("No hemos podido comprobar que no eres un robot. Recarga la página y vuelve a intentarlo; el anuncio sigue guardado.");
    }, 20_000);
    return () => clearTimeout(t);
  }, [waitingCaptcha]);

  const restart = async () => {
    for (const p of d.photos) if (p.local) URL.revokeObjectURL(p.url);
    await clearStoredDraft();
    setD(emptyDraft(d.zone));
    setDone(null);
    setRestored(false);
    setSaved(false);
    setCreatedId(null);
    goTo(1);
  };

  if (done) return <DoneScreen done={done} editing={!!editingId} onAgain={restart} />;

  const meta = STEPS[step - 1];
  const needsLogin = live && !account;
  const ready = !stepIssue(step, d, processing);
  const t = previewTexts(d, catalog, now);

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <div className={styles.progressRow}>
          <p className={styles.stepCount}>
            <span className={styles.stepNum}>
              Paso {step} de {STEPS.length}
            </span>
            <span className={styles.stepName}>{editingId && step === 5 ? "Revisar cambios" : meta.short}</span>
          </p>
          {!editingId && saved && (
            <span className={styles.saved} role="status">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 7.5l2.5 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={styles.savedLong}>Borrador guardado</span>
              <span className={styles.savedShort}>Guardado</span>
            </span>
          )}
        </div>
        <ol className={styles.progress} aria-label="Pasos">
          {STEPS.map((s, i) => {
            const n = i + 1;
            return (
              <li key={s.short}>
                <button
                  type="button"
                  className={styles.progressBtn}
                  data-done={n < step || undefined}
                  data-current={n === step || undefined}
                  aria-current={n === step ? "step" : undefined}
                  aria-label={n < step ? `Volver al paso ${n}: ${s.short}` : `Paso ${n}: ${s.short}`}
                  disabled={n >= step}
                  onClick={() => goTo(n)}
                >
                  <span className={styles.bar} />
                </button>
              </li>
            );
          })}
        </ol>
        {!live && (
          <p className={styles.closedNote} role="note">
            <strong>Todavía no se puede publicar.</strong> Puedes recorrer los pasos para ver cómo funciona, pero no se guarda
            nada: las fotos no salen de tu dispositivo y el anuncio no se publica.
          </p>
        )}
        {restored && (
          <div className={styles.restored} role="status">
            <span>Hemos recuperado el anuncio que dejaste a medias en este dispositivo.</span>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                // Acción destructiva: borra datos y fotos del borrador de este dispositivo.
                if (window.confirm("¿Borrar el borrador y sus fotos? No se puede deshacer.")) void restart();
              }}
            >
              Empezar de nuevo
            </button>
          </div>
        )}
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <header className={styles.stepHead}>
            <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>
              {editingId && step === 5 ? "Revisa los cambios" : meta.title}
            </h1>
            <p className={styles.lead}>{meta.lead}</p>
          </header>

          {step >= 2 && step <= 4 && (
            <details className={styles.mPreview}>
              <summary>
                <span className={styles.mThumb} aria-hidden="true">
                  <CoverPhoto d={d} sizes="48px" />
                </span>
                <span className={styles.mText}>
                  <span className={styles.mLabel}>Vista previa</span>
                  <span className={styles.mTitle}>
                    {t.title}
                    {t.price ? ` · ${t.price}` : ""}
                  </span>
                </span>
              </summary>
              <div className={styles.mBody} inert>
                <LivePreview d={d} catalog={catalog} now={now} />
              </div>
            </details>
          )}

          <div className={styles.card}>
            {step === 1 && (
              <StepPhotos
                photos={d.photos}
                processing={processing}
                live={live}
                onFiles={(f) => void addFiles(f)}
                onRemove={removePhoto}
                onMove={movePhoto}
                onLimit={() => toast(`Ya tienes ${MAX_PHOTOS} fotos, que es el máximo.`)}
              />
            )}
            {step === 2 && <StepBoard d={d} set={set} setD={setD} catalog={catalog} brands={brands} featuredBrands={featuredBrands} toast={toast} />}
            {step === 3 && <StepCondition d={d} set={set} setD={setD} />}
            {step === 4 && <StepPrice d={d} set={set} setD={setD} model={pm} refs={refs} dataIsDemo={dataIsDemo} live={live} />}
            {step === 5 && (
              <StepReview
                d={d}
                catalog={catalog}
                now={now}
                live={live}
                editing={!!editingId}
                pending={pending}
                needsLogin={needsLogin}
                account={account}
                busy={busy}
                progress={progress}
                error={error}
                turnstile={turnstile}
                onCaptcha={onCaptcha}
                onEdit={(n) => goTo(n, { fromReview: true })}
                onPublish={() => void publish()}
                onLogin={() => toast("Email confirmado. Ya puedes publicar.")}
              />
            )}
          </div>

          <div className={styles.bottomBar} data-final={step === 5 || undefined}>
            {step < 5 && error && !ready && (
              <p className={styles.stepError} role="alert">
                {error}
              </p>
            )}
            <div className={styles.navRow}>
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
                <button type="button" className={styles.nextBtn} data-ready={ready || undefined} onClick={next}>
                  {fromReview ? "Volver a revisar" : step === 4 ? "Revisar anuncio" : "Continuar"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className={styles.aside} aria-label="Vista previa">
          <div className={styles.asideInner}>
            <span className={styles.asideLabel}>Vista previa</span>
            <div inert>
              <LivePreview d={d} catalog={catalog} now={now} />
            </div>
            <p className={styles.small}>Así lo verán en las búsquedas. Se actualiza mientras escribes.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
