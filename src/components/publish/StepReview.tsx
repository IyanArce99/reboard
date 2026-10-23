"use client";

// Paso 5 · Revisar y publicar: resumen por secciones (cada una se edita saltando a su paso, sin
// perder nada), qué pasa al publicar y, en modo real, el acceso con código por email (LoginForm
// incrustado), Turnstile y la publicación. En la demo no se publica nada.

import Image from "next/image";
import type { ReactNode, RefObject } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Turnstile, type TurnstileHandle } from "@/components/security/Turnstile";
import { CONDITION_LABEL, CONSTRUCTION_INFO, SHAPE_INFO, zoneBySlug } from "@/lib/domain/taxonomy";
import type { CatalogModel } from "@/lib/domain/types";
import type { PublishDraft } from "@/lib/publish/draft";
import { LivePreview, previewTexts } from "./LivePreview";
import styles from "./Publish.module.css";

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
  const measures = [d.len, d.width, d.thick].filter((x) => x.trim()).join(" × ");
  const zone = zoneBySlug(d.zone)?.name ?? "";

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
                    ? "Las del catálogo se mostrarán «según fabricante»: revisa que coinciden con tu tabla."
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
          {measures && <span className={styles.sumMono}>{measures}{d.vol.trim() ? ` · ${d.vol.trim()} L` : ""}</span>}
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
                <li>Aparece en las búsquedas en cuanto lo publiques. Es gratis y sin comisiones.</li>
                <li>Tu teléfono no se muestra: solo lo ve quien pulsa «Mostrar contacto».</li>
                <li>Confirma cada 14 días en «Mis anuncios» que sigue disponible; si no, caduca a los 30 días.</li>
              </>
            )}
          </ul>
        ) : (
          <p className={styles.demoNote}>
            La publicación todavía no está abierta: al pulsar no se publica nada, no se guarda tu número y las fotos no salen de tu
            dispositivo.
          </p>
        )}

        {needsLogin ? (
          <div className={styles.loginBox}>
            <span className={styles.loginTitle}>Último paso: confirma tu email</span>
            <span className={styles.small}>
              Te enviamos un código de 6 cifras. Con esa cuenta gestionas el anuncio: confirmarlo, bajar el precio o marcarlo como
              vendido. Tu anuncio se queda guardado mientras tanto.
            </span>
            <LoginForm onDone={onLogin} />
          </div>
        ) : (
          <>
            {live && account && (
              <p className={styles.small}>
                Publicas como <strong>{account.name}</strong> ({account.email}).
              </p>
            )}
            {live && <Turnstile ref={turnstile} action="publicar" onToken={onCaptcha} />}
            <button type="button" className={styles.publishBtn} onClick={onPublish} disabled={busy} aria-busy={busy || undefined}>
              {busy ? progress || "Publicando…" : !live ? "Terminar la prueba" : editing ? "Guardar cambios" : "Publicar gratis"}
            </button>
          </>
        )}
        <p className={styles.error} role="alert">
          {error}
        </p>
      </section>
    </div>
  );
}
