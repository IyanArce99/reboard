"use client";

// Contacto directo por WhatsApp o teléfono. Reboard no tiene chat propio ni gestiona pagos.
// Con datos reales (`live`) el número no está en el HTML: se pide al servidor al pulsar
// «Mostrar contacto», con Turnstile y límite por IP (src/app/anuncio/actions.ts).

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { reportListingAction, revealContactAction } from "@/app/anuncio/actions";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { useUserState } from "@/components/user/UserStateProvider";
import ui from "@/styles/ui.module.css";
import styles from "./Ficha.module.css";

interface ContactData {
  sellerName: string;
  message: string;
  phone: string | null;
  unavailable: boolean;
  /** Id público del anuncio («a123»). */
  listingId: string;
  /** Datos reales: contacto y reportes van al servidor. */
  live: boolean;
}

function RevealContact({ data, onClose }: { data: ContactData; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [contact, setContact] = useState<{ method: "whatsapp" | "phone"; phone: string } | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  if (contact) {
    const wa = `https://wa.me/${contact.phone}?text=${encodeURIComponent(data.message)}`;
    return (
      <>
        {contact.method === "whatsapp" && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={styles.waBtn} onClick={onClose}>
            Abrir WhatsApp
          </a>
        )}
        <a href={`tel:+${contact.phone}`} className={contact.method === "whatsapp" ? styles.callBtn : styles.waBtn}>
          Llamar · +{contact.phone}
        </a>
      </>
    );
  }
  const waiting = !!TURNSTILE_SITE_KEY && !token;
  return (
    <>
      <Turnstile ref={turnstile} action="contacto" onToken={setToken} />
      <button
        type="button"
        className={styles.waBtn}
        disabled={busy || waiting}
        onClick={async () => {
          setBusy(true);
          setError("");
          const r = await revealContactAction({ publicId: data.listingId, token });
          turnstile.current?.reset();
          setBusy(false);
          if (r.ok) setContact({ method: r.method, phone: r.phone });
          else setError(r.message);
        }}
      >
        {busy ? "Un momento…" : waiting ? "Comprobando conexión…" : "Mostrar contacto"}
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const wa = data.phone ? `https://wa.me/${data.phone}?text=${encodeURIComponent(data.message)}` : null;

  return (
    <Ctx.Provider value={{ open: () => !data.unavailable && setOpen(true), data }}>
      {children}
      {isOpen &&
        createPortal(
          <>
            <div className={styles.modalOverlay} onClick={() => setOpen(false)} aria-hidden="true" />
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="contact-title">
              <div className={styles.modalHead}>
                <span id="contact-title">Contactar con {data.sellerName}</span>
                <button ref={closeRef} type="button" aria-label="Cerrar" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>
              <div className={styles.modalHint}>Mensaje sugerido (puedes editarlo en WhatsApp):</div>
              <div className={styles.modalMsg}>{data.message}</div>
              {data.live ? (
                <RevealContact data={data} onClose={() => setOpen(false)} />
              ) : wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
                  Abrir WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  className={styles.waBtn}
                  onClick={() => {
                    setOpen(false);
                    toast("Demo: se abriría WhatsApp con el mensaje. No hay chat propio.");
                  }}
                >
                  Abrir WhatsApp
                </button>
              )}
              {data.live ? null : data.phone ? (
                <a href={`tel:+${data.phone}`} className={styles.callBtn}>
                  Llamar
                </a>
              ) : (
                <button
                  type="button"
                  className={styles.callBtn}
                  onClick={() => {
                    setOpen(false);
                    toast("Demo: se mostraría el teléfono del vendedor.");
                  }}
                >
                  Llamar
                </button>
              )}
              <div className={styles.modalNote}>Nunca pagues señales ni por adelantado. Reboard no intermedia en pagos ni envíos.</div>
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
    <button type="button" className={className} disabled={data.unavailable} onClick={open}>
      {data.unavailable ? "No disponible" : "Contactar por WhatsApp"}
    </button>
  );
}

/** Barra fija abajo en la ficha móvil: precio + «Contactar con el vendedor». */
export function ContactBar({ price, specs }: { price: string; specs: string }) {
  const { open, data } = useContact();
  return (
    <div className={styles.contactBar}>
      <div>
        <div className={styles.barPrice}>{price}</div>
        <div className={styles.barSpecs}>{specs}</div>
      </div>
      <button type="button" className={styles.barBtn} disabled={data.unavailable} onClick={open}>
        {data.unavailable ? "No disponible" : "Contactar con el vendedor"}
      </button>
    </div>
  );
}

export function ShareButton({ url, className }: { url: string; className: string }) {
  const { toast } = useUserState();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ url });
          else {
            await navigator.clipboard.writeText(url);
            toast(`Enlace copiado: ${url}`);
          }
        } catch {
          // El usuario canceló el diálogo de compartir.
        }
      }}
    >
      Compartir
    </button>
  );
}

const REASONS: [string, string][] = [
  ["fraude", "Posible estafa (pide señal, envío o pago por adelantado)"],
  ["datos-falsos", "Las fotos o los datos no son reales"],
  ["vendida", "Ya está vendida"],
  ["duplicado", "Anuncio duplicado"],
  ["inapropiado", "Contenido inapropiado"],
  ["otro", "Otro motivo"],
];

type Reason = "fraude" | "datos-falsos" | "vendida" | "duplicado" | "inapropiado" | "otro";

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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const start = () => {
    if (!data.live) {
      toast("Demo: con datos reales, el reporte llega a moderación.");
      return;
    }
    if (!account) {
      // Reportar requiere sesión (decisión aprobada).
      router.push(`/entrar?siguiente=${encodeURIComponent(pathname)}`);
      return;
    }
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
      toast("Gracias. Revisaremos el anuncio.");
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
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="report-title">
              <div className={styles.modalHead}>
                <span id="report-title">Reportar anuncio</span>
                <button ref={closeRef} type="button" aria-label="Cerrar" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>
              <form onSubmit={send} className={styles.reportForm}>
                <fieldset>
                  <legend className={styles.modalHint}>¿Qué pasa con este anuncio?</legend>
                  {REASONS.map(([v, l]) => (
                    <label key={v} className={styles.reportOption}>
                      <input type="radio" name="reason" value={v} checked={reason === v} onChange={() => setReason(v as Reason)} />
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
              <div className={styles.modalNote}>Con tres reportes, el anuncio pasa a revisión. Lo revisa una persona.</div>
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
        <strong>Te encaja.</strong> Esta tabla está dentro de tu rango orientativo de volumen ({range}). Revisa también la longitud y el tipo de ola.
      </div>
    );
  return (
    <div className={styles.noFit}>
      {volume == null
        ? "No podemos indicar si te encaja: el vendedor no ha indicado los litros."
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
