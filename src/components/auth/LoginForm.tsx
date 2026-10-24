"use client";

// Acceso con código de un solo uso por email (Supabase Auth) o, para cuentas que ya tienen una, con
// contraseña. El cliente del navegador guarda la sesión en cookies y la refresca; las rutas privadas
// la refrescan también en proxy.ts. Las dos vías pasan el CAPTCHA (Turnstile) a Supabase.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Turnstile, TURNSTILE_SITE_KEY, type TurnstileHandle } from "@/components/security/Turnstile";
import { enabledProviders, type OAuthProvider } from "@/lib/auth/providers";
import { authErrorText, safeNext } from "@/lib/auth/shared";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { SIGNED_IN_EVENT } from "@/lib/supabase/session-hint";
import { track } from "@/lib/analytics/track";
import ui from "@/styles/ui.module.css";
import styles from "./Auth.module.css";

const RESEND_AFTER = 60;
const PROVIDERS = enabledProviders();
const PROVIDER_NAME: Record<OAuthProvider, string> = { google: "Google", apple: "Apple" };
const START_ERROR: Record<string, string> = {
  enlace: "Ese enlace ya no vale: ha caducado o ya se ha usado. Pide un código nuevo.",
  social: "No has podido entrar con esa cuenta. Prueba otra vez o entra con tu email.",
};

/** `onDone`: acceso incrustado (p. ej., al final de publicar); sin él, se navega a `siguiente`. */
export function LoginForm({ onDone }: { onDone?: () => void } = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("siguiente"));
  // Entrar con contraseña solo lo usa la administración: no se ofrece en el formulario, se llega con
  // /entrar?contrasena (el resto entra con el código por email).
  const [step, setStep] = useState<"email" | "code" | "password">(params.has("contrasena") ? "password" : "email");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(START_ERROR[params.get("error") ?? ""] ?? "");
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
    // La app carga la sesión (supabase-js) solo cuando hace falta: se le avisa de que ya hay una.
    window.dispatchEvent(new Event(SIGNED_IN_EVENT));
    track("login_completed", { context: onDone ? "publicar" : "entrar" });
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

  // Google / Apple: se sale a la página del proveedor y se vuelve por /auth/confirm (?code=, PKCE).
  // Incrustado (al publicar) se vuelve a la misma página: el borrador sigue guardado en el dispositivo.
  async function signInWith(provider: OAuthProvider) {
    if (busy) return;
    setBusy(true);
    setError("");
    const back = onDone ? `${window.location.pathname}${window.location.search}` : next;
    const { error: err } = await getBrowserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/confirm?siguiente=${encodeURIComponent(back)}` },
    });
    if (err) {
      setBusy(false);
      setError(authErrorText(err));
    }
  }

  const toggle = (to: "email" | "password") => {
    setError("");
    setPassword("");
    setStep(to);
  };

  return (
    <div className={styles.form}>
      {step === "email" && PROVIDERS.length > 0 && (
        <>
          <div className={styles.social}>
            {PROVIDERS.map((p) => (
              <button key={p} type="button" className={styles.socialBtn} data-provider={p} onClick={() => void signInWith(p)} disabled={busy}>
                <ProviderLogo provider={p} />
                Continuar con {PROVIDER_NAME[p]}
              </button>
            ))}
          </div>
          <p className={styles.divider}>
            <span>o con tu email</span>
          </p>
        </>
      )}
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
            Te hemos enviado un código a <strong>{email.trim()}</strong>. Si no te llega en un par de minutos, mira en spam o en promociones.
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

function ProviderLogo({ provider }: { provider: OAuthProvider }) {
  if (provider === "apple") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.37 12.75c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65zM14.1 6c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}
