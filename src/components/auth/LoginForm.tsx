"use client";

// Acceso con código de un solo uso por email (Supabase Auth) o, para cuentas que ya tienen una, con
// contraseña. El cliente del navegador guarda la sesión en cookies y la refresca; las rutas privadas
// la refrescan también en proxy.ts. Las dos vías pasan el CAPTCHA (Turnstile) a Supabase.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { authErrorText, safeNext } from "@/lib/auth/shared";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import ui from "@/styles/ui.module.css";
import styles from "./Auth.module.css";

const RESEND_AFTER = 60;

/** `onDone`: acceso incrustado (p. ej., al final de publicar); sin él, se navega a `siguiente`. */
export function LoginForm({ onDone }: { onDone?: () => void } = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("siguiente"));
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [password, setPassword] = useState("");
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
      options: {
        shouldCreateUser: true,
        captchaToken: captcha ?? undefined,
        // Si el correo trae un enlace en vez del código, que vuelva aquí y no a la Site URL de Supabase.
        emailRedirectTo: `${window.location.origin}/auth/confirm?siguiente=${encodeURIComponent(next)}`,
      },
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

  async function finish() {
    if (onDone) {
      setBusy(false);
      onDone();
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function signInPassword(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (needsCaptcha && !captcha) {
      setError("Espera un momento: estamos comprobando que no eres un robot.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await getBrowserSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken: captcha ?? undefined },
    });
    turnstile.current?.reset();
    if (err) {
      setBusy(false);
      setError(authErrorText(err));
      return;
    }
    setPassword("");
    await finish();
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
    await finish();
  }

  const toggle = (to: "email" | "password") => {
    setError("");
    setPassword("");
    setStep(to);
  };

  return (
    <div className={styles.form}>
      {step === "email" ? (
        <form onSubmit={sendCode}>
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
            {busy ? "Enviando…" : needsCaptcha && !captcha ? "Comprobando que no eres un robot…" : "Enviarme el código"}
          </button>
          <div className={styles.secondary}>
            <button type="button" className={styles.linkBtn} onClick={() => toggle("password")}>
              Tengo contraseña
            </button>
          </div>
        </form>
      ) : step === "password" ? (
        <form onSubmit={signInPassword}>
          <label htmlFor="login-email-pw" className={ui.label}>
            Email
          </label>
          <input
            id="login-email-pw"
            type="email"
            name="email"
            required
            autoComplete="username"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={ui.input}
            placeholder="tu@email.com"
          />
          <label htmlFor="login-password" className={ui.label}>
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={ui.input}
          />
          <Turnstile ref={turnstile} action="login" onToken={setCaptcha} />
          <button
            type="submit"
            className={`${ui.btnPrimary} ${styles.submit}`}
            disabled={busy || !email.includes("@") || !password || (needsCaptcha && !captcha)}
          >
            {busy ? "Comprobando…" : needsCaptcha && !captcha ? "Comprobando que no eres un robot…" : "Entrar"}
          </button>
          <div className={styles.secondary}>
            <button type="button" className={styles.linkBtn} onClick={() => toggle("email")}>
              Prefiero un código por email
            </button>
          </div>
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
