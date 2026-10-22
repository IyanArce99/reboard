"use client";

// Contacto directo por WhatsApp o teléfono. Reboard no tiene chat propio ni gestiona pagos.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUserState } from "@/components/user/UserStateProvider";
import styles from "./Ficha.module.css";

interface ContactData {
  sellerName: string;
  message: string;
  phone: string | null;
  unavailable: boolean;
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
              {wa ? (
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
              {data.phone ? (
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

export function ReportButton({ className }: { className: string }) {
  const { toast } = useUserState();
  return (
    <button type="button" className={className} onClick={() => toast("Demo: los reportes aún no llegan a moderación (pendiente).")}>
      Reportar anuncio
    </button>
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
