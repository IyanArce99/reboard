"use client";

// Paso 5 · Revisar y publicar: resumen por secciones (cada una se edita saltando a su paso, sin
// perder nada), qué pasa al publicar y, en modo real, el acceso con código por email (LoginForm
// incrustado), Turnstile y la publicación. En la demo no se publica nada.

import Image from "next/image";
import { useState, type ReactNode, type RefObject } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Turnstile, type TurnstileHandle } from "@/components/security/Turnstile";
import { CONDITION_LABEL, CONSTRUCTION_INFO, SHAPE_INFO, zoneBySlug } from "@/lib/domain/taxonomy";
import type { CatalogModel } from "@/lib/domain/types";
import type { PublishDraft } from "@/lib/publish/draft";
import { updateDisplayName } from "@/app/cuenta/actions";
import { useUserState } from "@/components/user/UserStateProvider";
import { cleanDisplayName } from "@/lib/auth/shared";
import { DEFAULT_SELLER_NAME } from "@/lib/listing/present";
import ui from "@/styles/ui.module.css";
import { LivePreview, previewTexts } from "./LivePreview";
import styles from "./Publish.module.css";
import { fmtIn, ftLabel, litres } from "@/lib/domain/format";
import { fieldToInches, parseLitres } from "@/lib/publish/parse";

interface Props {
  d: PublishDraft;
  catalog: CatalogModel[];
  now: Date;
  live: boolean;
  editing: boolean;
  pending: number;
  needsLogin: boolean;
  account: { name: string; email: string } | null;
  busy: boolean;
  progress: string;
  error: string;
  turnstile: RefObject<TurnstileHandle | null>;
  onCaptcha: (t: string | null) => void;
  onEdit: (step: number) => void;
  onPublish: () => void;
  onLogin: () => void;
}

function Row({ title, step, onEdit, children }: { title: string; step: number; onEdit: (n: number) => void; children: ReactNode }) {
  return (
    <section className={styles.sumRow} aria-label={title}>
      <div className={styles.sumHead}>
        <h2 className={styles.sumTitle}>{title}</h2>
        <button type="button" className={styles.editBtn} onClick={() => onEdit(step)} aria-label={`Editar ${title.toLowerCase()}`}>
          Editar
        </button>
      </div>
      <div className={styles.sumBody}>{children}</div>
    </section>
  );
}

// Solo los dos métodos que admite la base de datos (como draftToInput).
const CONTACT_LABEL = { whatsapp: "WhatsApp", phone: "Llamada" } as const;

export function StepReview({ d, catalog, now, live, editing, pending, needsLogin, account, busy, progress, error, turnstile, onCaptcha, onEdit, onPublish, onLogin }: Props) {
  const t = previewTexts(d, catalog, now);
  // Resumen en el formato de la ficha (6'4" × 20 1/2" × 2 5/8" · 34,5 L), no tal como se escribió.
  const canon = (k: "len" | "width" | "thick") => {
    const v = fieldToInches(k, d[k], d.unit);
    if (v == null) return d[k].trim();
    return k === "len" ? ftLabel(Math.round(v)) : fmtIn(v);
  };
  const measures = (["len", "width", "thick"] as const).filter((k) => d[k].trim()).map(canon).join(" × ");
  const vol = parseLitres(d.vol);
  const zone = zoneBySlug(d.zone)?.name ?? "";
  const { setAccountName } = useUserState();
  // Nombre que verán los compradores. Vacío si aún es el de por defecto («Surfista»).
  const known = account && account.name !== DEFAULT_SELLER_NAME ? account.name : "";
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? known;
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);

  const publish = async () => {
    if (live && account) {
      const clean = cleanDisplayName(name);
      if (!clean) {
        setNameError("Escribe tu nombre o un apodo (de 2 a 40 caracteres): es lo que verá quien abra tu anuncio.");
        return;
      }
      setNameError("");
      if (clean !== account.name) {
        setSavingName(true);
        const fd = new FormData();
        fd.set("displayName", clean);
        const r = await updateDisplayName({ ok: false, message: "" }, fd);
        setSavingName(false);
        if (!r.ok) {
          setNameError(r.message);
          return;
        }
        if (r.name) setAccountName(r.name);
      }
    }
    onPublish();
  };

  return (
    <div className={styles.stepBody}>
      {/* En móvil y tableta, la vista previa completa va arriba; en escritorio está en la columna derecha. */}
      <div className={styles.reviewPreview} inert>
        <LivePreview d={d} catalog={catalog} now={now} />
      </div>

      {(pending > 0 || !d.vol.trim()) && (
        <div className={styles.warn} role="note">
          <span>
            {pending > 0
              ? `Tienes ${pending} medida${pending > 1 ? "s" : ""} sin confirmar. ${
                  Object.values(d.src).includes("cat")
                    ? "Las del catálogo se mostrarán como «según el fabricante»: revisa que coinciden con tu tabla."
                    : "Revisa que las medidas rellenadas automáticamente son correctas."
                }`
              : "No has indicado los litros. El anuncio aparecerá como «litros sin indicar» y saldrá en menos búsquedas."}
          </span>
          <button type="button" className={styles.warnBtn} onClick={() => onEdit(2)}>
            Revisar medidas
          </button>
        </div>
      )}

      <div className={styles.summary}>
        <Row title="Fotos" step={1} onEdit={onEdit}>
          <div className={styles.sumThumbs}>
            {d.photos.map((ph, i) => (
              <span key={ph.url} className={styles.sumThumb} data-cover={i === 0 || undefined}>
                <Image src={ph.url} alt="" fill sizes="56px" className={styles.photoImg} unoptimized={ph.local} />
              </span>
            ))}
          </div>
          <span className={styles.sumMeta}>
            {d.photos.length} {d.photos.length === 1 ? "foto" : "fotos"} · la primera es la portada
          </span>
        </Row>
        <Row title="La tabla" step={2} onEdit={onEdit}>
          <span className={styles.sumMain}>{t.title}</span>
          {measures && <span className={styles.sumMono}>{measures}{vol != null ? ` · ${litres(vol)}` : ""}</span>}
          <span className={styles.sumMeta}>
            {[d.shape && SHAPE_INFO[d.shape].label, d.construction && CONSTRUCTION_INFO[d.construction].label].filter(Boolean).join(" · ")}
          </span>
        </Row>
        <Row title="Estado" step={3} onEdit={onEdit}>
          <span className={styles.sumMain}>{d.condition ? CONDITION_LABEL[d.condition] : "Sin indicar"}</span>
          {d.repairs.trim() && <span className={styles.sumMeta}>Reparaciones: {d.repairs.trim()}</span>}
          {d.description.trim() && <span className={styles.sumMeta}>{d.description.trim()}</span>}
        </Row>
        <Row title="Precio y ubicación" step={4} onEdit={onEdit}>
          <span className={styles.sumMain}>{t.price ?? "Sin precio"}</span>
          <span className={styles.sumMeta}>
            {d.town.trim() ? `${d.town.trim()}, ${zone}` : zone} · Contacto: {CONTACT_LABEL[d.contact === "phone" ? "phone" : "whatsapp"]} · {d.phone.trim() || "—"}
          </span>
        </Row>
      </div>

      <section className={styles.publishBox} aria-labelledby="pub-publish-title">
        <h2 id="pub-publish-title" className={styles.publishTitle}>
          {editing ? "Guardar los cambios" : "Publicar tu anuncio"}
        </h2>
        {live ? (
          <ul className={styles.facts}>
            {editing ? (
              <li>Los cambios se verán en el anuncio y en las búsquedas al momento.</li>
            ) : (
              <>
                <li>Sale en las búsquedas en cuanto lo publicas. Es gratis y sin comisiones.</li>
                <li>Tu teléfono no aparece escrito en el anuncio: solo lo ve quien lo pide desde tu anuncio.</li>
                <li>
                  Cada 14 días, entra en «Mis anuncios» y confirma que la tabla sigue a la venta. Si pasan 30 días sin confirmarlo, el
                  anuncio caduca. No enviamos recordatorios.
                </li>
              </>
            )}
          </ul>
        ) : (
          <p className={styles.demoNote}>
            Todavía no se puede publicar: al pulsar no se publica nada, no se guarda tu número y las fotos no salen de tu
            dispositivo.
          </p>
        )}

        {needsLogin ? (
          <div className={styles.loginBox}>
            <span className={styles.loginTitle}>Último paso: confirma tu email</span>
            <span className={styles.small}>
              Te mandamos un código de 6 cifras para entrar o crear tu cuenta. Con ella gestionas el anuncio: confirmarlo, bajar el
              precio o marcarlo como vendido. Mientras tanto, el anuncio se queda guardado.
            </span>
            <LoginForm onDone={onLogin} />
          </div>
        ) : (
          <>
            {live && account && (
              <div className={styles.nameField}>
                <label htmlFor="pub-name" className={ui.label}>
                  Tu nombre en el anuncio
                </label>
                <input
                  id="pub-name"
                  className={ui.input}
                  value={name}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Tu nombre o un apodo"
                  autoComplete="given-name"
                  maxLength={40}
                  aria-describedby="pub-name-help"
                  aria-invalid={nameError ? true : undefined}
                />
                <span id="pub-name-help" className={styles.small}>
                  Lo verá quien abra tu anuncio («Lo vende…») y aparecerá en el mensaje de WhatsApp. Publicas con la cuenta {account.email}.
                </span>
              </div>
            )}
            {live && <Turnstile ref={turnstile} action="publicar" onToken={onCaptcha} />}
            <button type="button" className={styles.publishBtn} onClick={() => void publish()} disabled={busy || savingName} aria-busy={busy || savingName || undefined}>
              {busy ? progress || "Publicando…" : !live ? "Terminar la prueba" : editing ? "Guardar cambios" : "Publicar gratis"}
            </button>
          </>
        )}
        <p className={styles.error} role="alert">
          {nameError || error}
        </p>
      </section>
    </div>
  );
}
