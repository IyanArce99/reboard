"use client";

// «Enviar mensaje al vendedor» (dentro del modal de contacto de la ficha). El comprador escribe su
// nombre, su email y el mensaje; el vendedor lo recibe en el email de su cuenta, que nunca se ve.
// Validación al enviar con foco en el campo, Turnstile invisible salvo duda, un solo envío a la vez
// y confirmación solo cuando el servidor de correo ha aceptado el mensaje.

import Link from "next/link";
import { useRef, useState } from "react";
import { sendSellerEmailAction } from "@/app/anuncio/actions";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { track } from "@/lib/analytics/track";
import { BUYER_MESSAGE_MAX, BUYER_NAME_MAX, SellerEmailInput, suggestedBuyerMessage } from "@/lib/contact/seller-email-schema";
import styles from "./Ficha.module.css";

type Field = "name" | "email" | "message";

export function EmailContact({ listingId, title, sellerName, onClose }: { listingId: string; title: string; sellerName: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(() => suggestedBuyerMessage(title));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: Field } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const tokenRef = useRef<string | null>(null);
  const needsCaptcha = Boolean(TURNSTILE_SITE_KEY);
  const who = sellerName || "El vendedor";

  const waitForToken = async (ms = 10_000) => {
    for (let waited = 0; !tokenRef.current && waited < ms; waited += 200) await new Promise((r) => setTimeout(r, 200));
    return tokenRef.current;
  };
  const focusField = (f?: Field) => f && document.getElementById(`buyer-${f}`)?.focus();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const v = SellerEmailInput.safeParse({ name, email, message });
    if (!v.success) {
      const issue = v.error.issues[0];
      const f = issue?.path[0] as Field | undefined;
      setError({ message: issue?.message ?? "Revisa el formulario.", field: f });
      focusField(f);
      track("contact_email_failed", { reason: "validacion" });
      return;
    }
    setBusy(true);
    setError(null);
    track("contact_email_submitted", {});
    const token = needsCaptcha ? (tokenRef.current ?? (await waitForToken())) : null;
    if (needsCaptcha && !token) {
      setBusy(false);
      setError({ message: "No hemos podido comprobar que no eres un robot. Recarga la página y vuelve a intentarlo." });
      track("contact_email_failed", { reason: "error" });
      return;
    }
    const r = await sendSellerEmailAction({ publicId: listingId, ...v.data, token });
    turnstile.current?.reset();
    tokenRef.current = null;
    setBusy(false);
    if (!r.ok) {
      setError({ message: r.message, field: r.field });
      focusField(r.field);
      track("contact_email_failed", {
        reason: r.field ? "validacion" : /muchos|Ya le has escrito/.test(r.message) ? "limite" : /no acepta|ya no está/.test(r.message) ? "no_disponible" : "error",
      });
      return;
    }
    track("contact_email_sent", {});
    setSentTo(v.data.email);
  }

  if (sentTo) {
    return (
      <div className={styles.emailSent} role="status">
        <span className={styles.emailSentIcon} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <p className={styles.emailSentTitle}>Mensaje enviado</p>
        <p className={styles.emailSentText}>
          {who} lo ha recibido por email y te responderá a <strong>{sentTo}</strong>. Revisa también la carpeta de spam.
        </p>
        <button type="button" className={`${styles.waBtn} ${styles.sheetBtn}`} onClick={onClose}>
          Hecho
        </button>
      </div>
    );
  }

  const err = (f: Field) => (error?.field === f ? error.message : null);
  const describedBy = (f: Field, extra?: string) => [err(f) ? "buyer-error" : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <form className={styles.emailForm} onSubmit={submit} noValidate aria-label={`Escribir a ${who}`}>
      <div className={styles.emailField}>
        <label htmlFor="buyer-name">Tu nombre</label>
        <input
          id="buyer-name"
          className={styles.emailInput}
          autoComplete="name"
          maxLength={BUYER_NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={err("name") ? true : undefined}
          aria-describedby={describedBy("name")}
        />
      </div>
      <div className={styles.emailField}>
        <label htmlFor="buyer-email">Tu email</label>
        <input
          id="buyer-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          className={styles.emailInput}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={err("email") ? true : undefined}
          aria-describedby={describedBy("email", "buyer-email-help")}
        />
        <span id="buyer-email-help" className={styles.emailHelp}>
          {who} te responderá aquí.
        </span>
      </div>
      <div className={styles.emailField}>
        <label htmlFor="buyer-message">Mensaje</label>
        <textarea
          id="buyer-message"
          className={`${styles.emailInput} ${styles.emailTextarea}`}
          rows={4}
          maxLength={BUYER_MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={err("message") ? true : undefined}
          aria-describedby={describedBy("message")}
        />
      </div>

      <Turnstile ref={turnstile} action="email" onToken={(t) => (tokenRef.current = t)} />

      {error && (
        <p id="buyer-error" className={styles.emailError} role="alert">
          {error.message}
        </p>
      )}

      <button type="submit" className={`${styles.waBtn} ${styles.sheetBtn}`} disabled={busy}>
        {busy ? "Enviando…" : "Enviar mensaje"}
      </button>
      <p className={styles.emailLegal}>
        Enviaremos tu nombre, tu email y tu mensaje a {sellerName || "quien vende"} para que pueda responderte. Su dirección no se muestra y no
        guardamos el texto de tu mensaje. Más información en la <Link href="/legal/privacidad">Política de privacidad</Link>.
      </p>
    </form>
  );
}
