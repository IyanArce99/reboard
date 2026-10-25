"use client";

// Formulario de contacto (/contacto). Motivo en tarjetas (radio accesible), email y mensaje con
// contador. Valida al enviar, marca el campo con el error y le lleva el foco. La comprobación
// anti-robots (Turnstile) no se ve salvo que Cloudflare tenga dudas.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { sendContactMessageAction } from "@/app/contacto/actions";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { CONTACT_TOPICS, ContactInput, MESSAGE_MAX, type ContactTopic } from "@/lib/contact/topics";
import ui from "@/styles/ui.module.css";
import styles from "./Contact.module.css";

type Field = "topic" | "email" | "message";

export function ContactForm() {
  const sp = useSearchParams();
  const initial = CONTACT_TOPICS.find((t) => t.value === sp.get("motivo"))?.value ?? null;
  const [topic, setTopic] = useState<ContactTopic | null>(initial);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captcha, setCaptchaState] = useState<string | null>(null);
  // El último token, también para quien está esperando a que llegue (enviar antes de que termine la comprobación).
  const tokenRef = useRef<string | null>(null);
  const setCaptcha = (t: string | null) => {
    tokenRef.current = t;
    setCaptchaState(t);
  };
  const waitForToken = async (ms = 10_000) => {
    for (let waited = 0; !tokenRef.current && waited < ms; waited += 200) await new Promise((r) => setTimeout(r, 200));
    return tokenRef.current;
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: Field } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const needsCaptcha = Boolean(TURNSTILE_SITE_KEY);

  const focusField = (f?: Field) => {
    if (f === "topic") radios.current[0]?.focus();
    else if (f) document.getElementById(`contact-${f}`)?.focus();
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const v = ContactInput.safeParse({ topic: topic ?? undefined, email, message });
    if (!v.success) {
      const issue = v.error.issues[0];
      const f = issue?.path[0] as Field | undefined;
      setError({ message: issue?.message ?? "Revisa el formulario.", field: f });
      focusField(f);
      return;
    }
    setBusy(true);
    setError(null);
    // Si la comprobación anti-robots aún no ha terminado, se espera un poco en vez de dar un error.
    const token = needsCaptcha ? (captcha ?? (await waitForToken())) : null;
    if (needsCaptcha && !token) {
      setBusy(false);
      setError({ message: "No hemos podido comprobar que no eres un robot. Recarga la página y vuelve a intentarlo." });
      return;
    }
    const r = await sendContactMessageAction({ ...v.data, token });
    turnstile.current?.reset();
    setCaptcha(null);
    setBusy(false);
    if (!r.ok) {
      setError({ message: r.message, field: r.field });
      focusField(r.field);
      return;
    }
    setSentTo(v.data.email);
    setMessage("");
  }

  // Flechas para moverse entre motivos (patrón radiogroup).
  const onRadioKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + CONTACT_TOPICS.length) % CONTACT_TOPICS.length;
    setTopic(CONTACT_TOPICS[n].value);
    radios.current[n]?.focus();
  };

  if (sentTo) {
    return (
      <div className={styles.sent} role="status">
        <span className={styles.sentIcon} aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h2 className={styles.sentTitle}>Mensaje enviado</h2>
        <p className={styles.sentText}>
          Gracias por escribirnos. Te responderemos a <strong>{sentTo}</strong>. Revisa también la carpeta de spam.
        </p>
        <button type="button" className={ui.btnOutline} onClick={() => setSentTo(null)}>
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  const err = (f: Field) => (error?.field === f ? error.message : null);
  const left = MESSAGE_MAX - message.length;
  const activeIndex = Math.max(0, CONTACT_TOPICS.findIndex((t) => t.value === topic));

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="contact-form-title">
      <h2 id="contact-form-title" className={styles.formTitle}>
        Escríbenos
      </h2>

      <div className={styles.group}>
        <span id="contact-topic-label" className={ui.label}>
          ¿Sobre qué es?
        </span>
        <div
          className={styles.topics}
          role="radiogroup"
          aria-labelledby="contact-topic-label"
          aria-describedby={err("topic") ? "contact-error" : undefined}
          aria-invalid={err("topic") ? true : undefined}
        >
          {CONTACT_TOPICS.map((t, i) => {
            const on = topic === t.value;
            return (
              <button
                key={t.value}
                ref={(el) => {
                  radios.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={i === activeIndex ? 0 : -1}
                className={styles.topic}
                onClick={() => {
                  setTopic(t.value);
                  if (error?.field === "topic") setError(null);
                }}
                onKeyDown={(e) => onRadioKey(e, i)}
              >
                <span className={styles.topicCheck} aria-hidden="true" />
                <span className={styles.topicText}>
                  <span className={styles.topicLabel}>{t.label}</span>
                  <span className={styles.topicHint}>{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.group}>
        <label htmlFor="contact-email" className={ui.label}>
          Tu email
        </label>
        <input
          id="contact-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          className={ui.input}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error?.field === "email") setError(null);
          }}
          placeholder="tu@email.com"
          aria-invalid={err("email") ? true : undefined}
          aria-describedby={err("email") ? "contact-error contact-email-help" : "contact-email-help"}
        />
        <span id="contact-email-help" className={styles.help}>
          Solo para responderte. No lo usamos para nada más.
        </span>
      </div>

      <div className={styles.group}>
        <label htmlFor="contact-message" className={ui.label}>
          Mensaje
        </label>
        <textarea
          id="contact-message"
          className={`${ui.input} ${styles.textarea}`}
          rows={6}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (error?.field === "message") setError(null);
          }}
          placeholder={topic === "anuncio" ? "Pega el enlace del anuncio y cuéntanos qué pasa." : "Cuéntanos en qué podemos ayudarte."}
          aria-invalid={err("message") ? true : undefined}
          aria-describedby={err("message") ? "contact-error contact-message-count" : "contact-message-count"}
        />
        <span id="contact-message-count" className={styles.count} data-low={left < 100 || undefined}>
          {left.toLocaleString("es-ES")} caracteres disponibles
        </span>
      </div>

      <Turnstile ref={turnstile} action="mensaje" onToken={setCaptcha} />

      {error && (
        <p id="contact-error" className={styles.error} role="alert">
          {error.message}
        </p>
      )}

      <button type="submit" className={`${ui.btnPrimary} ${styles.submit}`} disabled={busy}>
        {busy ? "Enviando…" : "Enviar mensaje"}
      </button>
      <p className={styles.legal}>
        Al enviarlo, tratamos tu email y tu mensaje para responderte y los borramos a los 12 meses. Más información en la{" "}
        <Link href="/legal/privacidad">Política de privacidad</Link>.
      </p>
    </form>
  );
}
