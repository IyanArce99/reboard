"use client";

// Acceso con código de un solo uso por email (Supabase Auth). El cliente del navegador guarda la
// sesión en cookies y la refresca; las rutas privadas la refrescan también en proxy.ts.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { authErrorText, safeNext } from "@/lib/auth/shared";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import ui from "@/styles/ui.module.css";
import styles from "./Auth.module.css";

const RESEND_AFTER = 60;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("siguiente"));
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "enlace" ? "El enlace no es válido o ha caducado. Pide un código nuevo." : "");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const turnstile = useRef<TurnstileHandle>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const needsCaptcha = Boolean(TURNSTILE_SITE_KEY);

  async function sendCode(e?: React.SubmitEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (busy) return;
    if (needsCaptcha && !captcha) {
      setError("Espera un momento: estamos comprobando que no eres un robot.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await getBrowserSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, captchaToken: captcha ?? undefined },
    });
    turnstile.current?.reset();
    setBusy(false);
    if (err) {
      setError(authErrorText(err));
      return;
    }
    setStep("code");
    setCode("");
    setWait(RESEND_AFTER);
  }

  async function verify(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await getBrowserSupabase().auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    if (err) {
      setBusy(false);
      setError(authErrorText(err));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className={styles.form}>
      {step === "email" ? (
        <form onSubmit={sendCode} noValidate={false}>
          <label htmlFor="login-email" className={ui.label}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={ui.input}
            placeholder="tu@email.com"
          />
          <Turnstile ref={turnstile} action="login" onToken={setCaptcha} />
          <button
            type="submit"
            className={`${ui.btnPrimary} ${styles.submit}`}
            disabled={busy || !email.includes("@") || (needsCaptcha && !captcha)}
          >
            {busy ? "Enviando…" : needsCaptcha && !captcha ? "Comprobando conexión…" : "Enviarme el código"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p className={styles.sent}>
            Te hemos enviado un código a <strong>{email.trim()}</strong>. Mira también en spam o promociones.
          </p>
          <label htmlFor="login-code" className={ui.label}>
            Código de 6 cifras
          </label>
          <input
            ref={codeRef}
            id="login-code"
            name="code"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${ui.input} ${styles.code}`}
            placeholder="000000"
          />
          <button type="submit" className={`${ui.btnPrimary} ${styles.submit}`} disabled={busy || code.length !== 6}>
            {busy ? "Comprobando…" : "Entrar"}
          </button>
          <div className={styles.secondary}>
            <button type="button" className={styles.linkBtn} onClick={() => setStep("email")}>
              Cambiar email
            </button>
            {/* El reenvío necesita un CAPTCHA nuevo si está activo: se muestra aquí también. */}
            <Turnstile ref={turnstile} action="login" onToken={setCaptcha} />
            <button type="button" className={styles.linkBtn} onClick={() => sendCode()} disabled={busy || wait > 0}>
              {wait > 0 ? `Reenviar código (${wait} s)` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}
      <p className={styles.error} role="alert">
        {error}
      </p>
    </div>
  );
}
