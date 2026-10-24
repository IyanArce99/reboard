"use client";

// Contacto directo por WhatsApp o teléfono. Reboard no tiene chat propio ni gestiona pagos.
// Con datos reales (`live`) el número no está en el HTML: se pide al servidor al pulsar
// «Mostrar contacto», con Turnstile y límite por IP (src/app/anuncio/actions.ts).

import { CloseIcon } from "@/components/icons";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { reportListingAction, revealContactAction } from "@/app/anuncio/actions";
import { REPORT_REASONS, type ReportReason } from "@/components/moderation/labels";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { useUserState } from "@/components/user/UserStateProvider";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import type { PriceBand } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import ui from "@/styles/ui.module.css";
import styles from "./Ficha.module.css";

interface ContactData {
  sellerName: string;
  message: string;
  phone: string | null;
  /** Método que eligió el vendedor al publicar. */
  method: "whatsapp" | "phone";
  /** Estado del anuncio no activo («Vendida», «Caducada», «Retirada»); null si se puede contactar. */
  unavailable: string | null;
  /** Id público del anuncio («a123»). */
  listingId: string;
  /** Datos reales: contacto y reportes van al servidor. */
  live: boolean;
  /** Reservada por el vendedor: se puede preguntar por si la reserva no sale adelante. */
  reserved?: boolean;
  /** Categorías del anuncio para la analítica del embudo de contacto (sin ids ni datos personales). */
  analytics: { shape: string; island: string; price_band: PriceBand };
}

/** «+34 600 000 000» a partir de «34600000000». */
function prettyPhone(phone: string) {
  const m = phone.match(/^34(\d{3})(\d{3})(\d{3})$/);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : `+${phone}`;
}

function RevealContact({ data, onClose }: { data: ContactData; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [contact, setContact] = useState<{ method: "whatsapp" | "phone"; phone: string } | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  // El contacto se pide solo en cuanto pasa la comprobación anti-robots: «Contactar» → «Abrir WhatsApp»,
  // sin un toque intermedio. El botón queda para reintentar si algo falla.
  const tried = useRef(false);
  const reveal = async (tok: string | null) => {
    setBusy(true);
    setError("");
    const r = await revealContactAction({ publicId: data.listingId, token: tok });
    turnstile.current?.reset();
    setBusy(false);
    if (r.ok) {
      setContact({ method: r.method, phone: r.phone });
      track("contact_revealed", { method: r.method });
    } else setError(r.message);
  };
  const onToken = (t: string | null) => {
    setToken(t);
    if (t && !tried.current) {
      tried.current = true;
      void reveal(t);
    }
  };
  // Sin Turnstile configurado (local), se pide al abrir.
  const revealRef = useRef(reveal);
  useEffect(() => {
    if (TURNSTILE_SITE_KEY || tried.current) return;
    tried.current = true;
    void revealRef.current(null);
  }, []);

  if (contact) {
    const wa = `https://wa.me/${contact.phone}?text=${encodeURIComponent(data.message)}`;
    return (
      <>
        {contact.method === "whatsapp" && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.waBtn}
            onClick={() => {
              track("contact_link_clicked", { channel: "whatsapp" });
              onClose();
            }}
          >
            Abrir WhatsApp
          </a>
        )}
        <a
          href={`tel:+${contact.phone}`}
          className={contact.method === "whatsapp" ? styles.callBtn : styles.waBtn}
          onClick={() => track("contact_link_clicked", { channel: "llamada" })}
        >
          Llamar al {prettyPhone(contact.phone)}
        </a>
      </>
    );
  }
  const waiting = !!TURNSTILE_SITE_KEY && !token;
  return (
    <>
      <Turnstile ref={turnstile} action="contacto" onToken={onToken} />
      <button type="button" className={styles.waBtn} disabled={busy || waiting} onClick={() => void reveal(token)}>
        {busy ? "Un momento…" : waiting ? "Comprobando que no eres un robot…" : data.method === "whatsapp" ? "Ver teléfono y WhatsApp" : "Ver teléfono"}
      </button>
      <p className={styles.modalError} role="alert">
        {error}
      </p>
    </>
  );
}

const Ctx = createContext<{ open: () => void; data: ContactData } | null>(null);

export function ContactProvider({ data, children }: { data: ContactData; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const { toast } = useUserState();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Foco dentro del modal (el primero es «Cerrar»), atrapado con Tab y devuelto al botón al cerrar.
  useDialogFocus(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const wa = data.phone ? `https://wa.me/${data.phone}?text=${encodeURIComponent(data.message)}` : null;
  const byWhatsApp = data.method === "whatsapp";

  return (
    <Ctx.Provider value={{ open: () => !data.unavailable && setOpen(true), data }}>
      {children}
      {isOpen &&
        createPortal(
          <>
            <div className={styles.modalOverlay} onClick={() => setOpen(false)} aria-hidden="true" />
            <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="contact-title">
              <div className={styles.modalHead}>
                <span id="contact-title">Contactar con {data.sellerName || "el vendedor"}</span>
                <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              {data.reserved && (
                <p className={styles.modalNote} role="note">
                  El vendedor la ha reservado para alguien. Pregúntale si la reserva sigue en pie.
                </p>
              )}
              <div className={styles.modalHint}>{byWhatsApp ? "Mensaje sugerido (puedes editarlo en WhatsApp):" : "Puedes preguntarle esto:"}</div>
              <div className={styles.modalMsg}>{data.message}</div>
              {data.live ? (
                <RevealContact data={data} onClose={() => setOpen(false)} />
              ) : !byWhatsApp ? null : wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
                  Abrir WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  className={styles.waBtn}
                  onClick={() => {
                    setOpen(false);
                    toast("Demo: aquí se abriría WhatsApp con este mensaje.");
                  }}
                >
                  Abrir WhatsApp
                </button>
              )}
              {data.live ? null : data.phone ? (
                <a href={`tel:+${data.phone}`} className={byWhatsApp ? styles.callBtn : styles.waBtn}>
                  Llamar
                </a>
              ) : (
                <button
                  type="button"
                  className={byWhatsApp ? styles.callBtn : styles.waBtn}
                  onClick={() => {
                    setOpen(false);
                    toast("Demo: aquí verías el teléfono del vendedor.");
                  }}
                >
                  Llamar
                </button>
              )}
              <div className={styles.modalNote}>
                Antes de pagar, mírala en persona y en un sitio público. No pagues por adelantado, ni una señal, ni por un enlace que te
                manden por WhatsApp: Reboard no gestiona pagos ni envíos.
              </div>
            </div>
          </>,
          document.body,
        )}
    </Ctx.Provider>
  );
}

const useContact = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContact debe usarse dentro de ContactProvider");
  return v;
};

export function ContactButton({ className }: { className: string }) {
  const { open, data } = useContact();
  return (
    <button
      type="button"
      className={className}
      disabled={!!data.unavailable}
      onClick={() => {
        track("contact_opened", { method: data.method, surface: "ficha", ...data.analytics });
        open();
      }}
    >
      {data.unavailable ?? (data.reserved ? "Preguntar si queda libre" : data.method === "whatsapp" ? "Contactar por WhatsApp" : "Llamar al vendedor")}
    </button>
  );
}

/** Barra fija abajo en la ficha móvil: precio + «Contactar». */
export function ContactBar({ price, specs, offLink }: { price: string; specs: string; offLink?: { href: string; label: string } }) {
  const { open, data } = useContact();
  // Ya no está a la venta: la barra lleva a las alternativas en vez de un botón gris muerto.
  if (data.unavailable && offLink) {
    return (
      <aside className={styles.contactBar} aria-label="Alternativas">
        <div>
          <div className={styles.barPrice}>{price}</div>
          <div className={styles.barSpecs}>{data.unavailable}</div>
        </div>
        <a href={offLink.href} className={styles.barBtn}>
          {offLink.label}
        </a>
      </aside>
    );
  }
  return (
    <aside className={styles.contactBar} aria-label="Contacto">
      <div>
        <div className={styles.barPrice}>{price}</div>
        <div className={styles.barSpecs}>{specs}</div>
      </div>
      <button
        type="button"
        className={styles.barBtn}
        disabled={!!data.unavailable}
        onClick={() => {
          track("contact_opened", { method: data.method, surface: "barra_movil", ...data.analytics });
          open();
        }}
      >
        {data.unavailable ?? (data.reserved ? "Preguntar" : data.method === "whatsapp" ? "WhatsApp" : "Llamar")}
      </button>
    </aside>
  );
}

/** Compartir la ficha: ahora vive en islands.tsx (también lo usa el comparador). */
export { ShareButton } from "@/components/user/islands";

// Motivos y etiquetas compartidos con moderación y el panel (enum report_reason).
const REASONS = REPORT_REASONS;
type Reason = ReportReason;

export function ReportButton({ className }: { className: string }) {
  const { toast, account } = useUserState();
  const { data } = useContact();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [details, setDetails] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const start = () => {
    if (!data.live) {
      toast("Demo: con anuncios reales, el reporte llegaría a moderación.");
      return;
    }
    // Reportar requiere sesión (decisión aprobada): sin ella, el modal lo explica antes de ir a /entrar.
    setOpen(true);
  };

  const send = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason) {
      setError("Elige un motivo.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await reportListingAction({ publicId: data.listingId, reason, details, token });
    turnstile.current?.reset();
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      toast("Gracias. Vamos a revisar el anuncio.");
    } else setError(r.message);
  };

  return (
    <>
      <button type="button" className={className} onClick={start}>
        Reportar anuncio
      </button>
      {open &&
        createPortal(
          <>
            <div className={styles.modalOverlay} onClick={() => setOpen(false)} aria-hidden="true" />
            <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="report-title">
              <div className={styles.modalHead}>
                <span id="report-title">Reportar anuncio</span>
                <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              {!account ? (
                <>
                  <p className={styles.modalHint}>Para reportar un anuncio tienes que entrar en tu cuenta. Después volverás aquí.</p>
                  <button
                    type="button"
                    className={styles.waBtn}
                    onClick={() => router.push(`/entrar?siguiente=${encodeURIComponent(pathname)}`)}
                  >
                    Entrar
                  </button>
                </>
              ) : (
              <form onSubmit={send} className={styles.reportForm}>
                <fieldset>
                  <legend className={styles.modalHint}>¿Qué pasa con este anuncio?</legend>
                  {REASONS.map(([v, l]) => (
                    <label key={v} className={styles.reportOption}>
                      <input type="radio" name="reason" value={v} checked={reason === v} onChange={() => setReason(v)} />
                      {l}
                    </label>
                  ))}
                </fieldset>
                <label className={styles.modalHint}>
                  Detalles (opcional)
                  <textarea className={ui.input} maxLength={1000} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
                </label>
                <Turnstile ref={turnstile} action="reportar" onToken={setToken} />
                <button type="submit" className={styles.waBtn} disabled={busy || (!!TURNSTILE_SITE_KEY && !token)}>
                  {busy ? "Enviando…" : "Enviar reporte"}
                </button>
                <p className={styles.modalError} role="alert">
                  {error}
                </p>
              </form>
              )}
              <div className={styles.modalNote}>Cuando un anuncio acumula tres reportes, pasa a revisión y lo mira una persona.</div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

/** «Te encaja» o «Fuera de tu rango», según el perfil de surfista. */
export function FitNotice({ volume }: { volume: number | null }) {
  const { profile } = useUserState();
  if (!profile) return null;
  const range = `${profile.lo}–${profile.hi} L`;
  if (volume != null && volume >= profile.lo && volume <= profile.hi)
    return (
      <div className={styles.fit}>
        <strong>Te encaja.</strong> Sus litros entran en tu rango orientativo ({range}). Mira también la longitud y para qué olas es.
      </div>
    );
  return (
    <div className={styles.noFit}>
      {volume == null
        ? "No sabemos si te encaja: el vendedor no ha indicado los litros."
        : `Fuera de tu rango orientativo (${range}).`}
    </div>
  );
}

export function BackLink({ fallback, className }: { fallback: string; className: string }) {
  return (
    <a
      href={fallback}
      className={className}
      onClick={(e) => {
        // Como «Volver» del prototipo: a la pantalla anterior; sin historial, a la búsqueda.
        if (window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
      }}
    >
      ← Volver
    </a>
  );
}
