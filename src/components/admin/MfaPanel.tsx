"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useUserState } from "@/components/user/UserStateProvider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import styles from "./Admin.module.css";

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
}

/**
 * Segundo factor TOTP con Supabase Auth MFA. Se ejecuta en el navegador con la sesión del usuario:
 * no hay claves privilegiadas. Al verificar, la sesión pasa a aal2 y la base de datos lo exige
 * (admin_status) a los administradores con un factor activo o cuando la configuración lo pide.
 */
export function MfaPanel({ pending, required }: { pending: boolean; required: boolean }) {
  const router = useRouter();
  const { toast } = useUserState();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await getBrowserSupabase().auth.mfa.listFactors();
    if (err) {
      setError("No se han podido cargar tus factores. Recarga la página.");
      setFactors([]);
      return;
    }
    setFactors((data?.totp ?? []) as Factor[]);
  }, []);

  // Carga inicial (el estado se fija al resolver la promesa; se ignora si el componente ya no está).
  useEffect(() => {
    let alive = true;
    void getBrowserSupabase()
      .auth.mfa.listFactors()
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError("No se han podido cargar tus factores. Recarga la página.");
        setFactors(err ? [] : ((data?.totp ?? []) as Factor[]));
      });
    return () => {
      alive = false;
    };
  }, []);

  const verified = (factors ?? []).filter((f) => f.status === "verified");

  const start = async () => {
    setBusy(true);
    setError("");
    const sb = getBrowserSupabase();
    // Factores sin verificar de un intento anterior: se eliminan para empezar limpio.
    for (const f of factors ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: err } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Reboard ${new Date().toLocaleDateString("es-ES")}` });
    setBusy(false);
    if (err || !data) {
      setError("No se ha podido iniciar el alta del segundo factor. ¿Está activado TOTP en Supabase (Authentication → MFA)?");
      return;
    }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async (factorId: string) => {
    if (!/^\d{6}$/.test(code)) {
      setError("Escribe los 6 dígitos que muestra tu app.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await getBrowserSupabase().auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (err) {
      setError("El código no es correcto o ha caducado. Prueba con el siguiente.");
      return;
    }
    setCode("");
    setEnroll(null);
    toast("Segundo factor verificado.");
    await load();
    router.refresh();
  };

  if (factors === null) return <div className={styles.skeleton} aria-busy="true" />;

  return (
    <div className={styles.card}>
      {required && (
        <p className={styles.notice} data-tone="warning">
          El segundo factor es obligatorio para todos los administradores.
        </p>
      )}

      {pending && verified.length > 0 ? (
        <form
          className={styles.dialogBody}
          onSubmit={(e) => {
            e.preventDefault();
            void verify(verified[0].id);
          }}
        >
          <h2 className={styles.cardTitle}>Verifica tu segundo factor para entrar al panel</h2>
          <CodeField code={code} setCode={setCode} />
          {error && <p className={styles.dialogError} role="alert">{error}</p>}
          <div className={styles.btnRow}>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? "Comprobando…" : "Verificar"}
            </button>
          </div>
        </form>
      ) : enroll ? (
        <form
          className={styles.dialogBody}
          onSubmit={(e) => {
            e.preventDefault();
            void verify(enroll.id);
          }}
        >
          <h2 className={styles.cardTitle}>Escanea el código con tu app de autenticación</h2>
          {/* El QR lo genera Supabase (SVG en data URL); no sale a ningún servicio externo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="Código QR para añadir Reboard a tu app de autenticación" width={200} height={200} />
          <p className={styles.small}>
            ¿No puedes escanearlo? Escribe esta clave en la app: <span className={styles.mono}>{enroll.secret}</span>
          </p>
          <CodeField code={code} setCode={setCode} />
          {error && <p className={styles.dialogError} role="alert">{error}</p>}
          <div className={styles.btnRow}>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? "Comprobando…" : "Activar"}
            </button>
            <button type="button" className={styles.btn} onClick={() => setEnroll(null)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.dialogBody}>
          {verified.length > 0 ? (
            <>
              <h2 className={styles.cardTitle}>Segundo factor activo</h2>
              <ul className={styles.muted}>
                {verified.map((f) => (
                  <li key={f.id}>{f.friendly_name || "App de autenticación"}</li>
                ))}
              </ul>
              <p className={styles.small}>
                Al entrar al panel se te pedirá el código. Si pierdes el móvil, otro administrador puede retirarte el rol y
                volver a dártelo cuando configures uno nuevo.
              </p>
            </>
          ) : (
            <>
              <h2 className={styles.cardTitle}>Sin segundo factor</h2>
              <p className={styles.muted}>
                Ahora mismo basta con el código por email para entrar al panel. Añade una app de autenticación: a partir de
                entonces se te pedirá también su código.
              </p>
              <div className={styles.btnRow}>
                <button type="button" className={styles.btnPrimary} onClick={() => void start()} disabled={busy}>
                  {busy ? "Preparando…" : "Añadir app de autenticación"}
                </button>
              </div>
            </>
          )}
          {error && <p className={styles.dialogError} role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}

function CodeField({ code, setCode }: { code: string; setCode: (v: string) => void }) {
  return (
    <label className={styles.field}>
      Código de 6 dígitos
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
    </label>
  );
}
