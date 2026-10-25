import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Photo } from "@/components/brand/Photo";
import { LoginForm } from "@/components/auth/LoginForm";
import { authEnabled } from "@/lib/auth/config";
import { enabledProviders } from "@/lib/auth/providers";
import { noindexRobots } from "@/lib/seo";
import ui from "@/styles/ui.module.css";
import styles from "@/components/auth/Auth.module.css";
import { PageFlag } from "@/components/layout/PageFlag";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra en Reboard con tu email y el código de 6 cifras que te enviamos. No necesitas contraseña.",
  robots: noindexRobots(),
};

const PROVIDER_NAME = { google: "Google", apple: "Apple" } as const;

export default function EntrarPage() {
  const enabled = authEnabled();
  // «Google», «Apple» o «Google o Apple», según los proveedores activos.
  const social = enabledProviders().map((p) => PROVIDER_NAME[p]).join(" o ");
  return (
    <main className={styles.wrap}>
      {/* Esta página tiene su propia acción principal: «Vender» de la cabecera pasa a contorno. */}
      <PageFlag flag="cta-other" />
      <div className={styles.photo}>
        <Photo slug="tablas-orilla" sizes="45vw" position="50% 50%" decorative />
      </div>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Tu cuenta</p>
        <h1 className={styles.title}>Entrar en Reboard</h1>
        {enabled ? (
          <>
            <p className={styles.lead}>
              {social
                ? `Entra con ${social} o con tu email: te mandamos un código de 6 cifras, no necesitas contraseña. Si es tu primera vez, la cuenta se crea al poner el código.`
                : "Escribe tu email y te mandamos un código de 6 cifras para entrar. No necesitas contraseña. Si es tu primera vez, la cuenta se crea al poner el código."}
            </p>
            <Suspense fallback={<div className={styles.formSkeleton} />}>
              <LoginForm />
            </Suspense>
            <p className={styles.fine}>
              Con una cuenta, tus guardadas te siguen en el móvil y en el ordenador, y gestionas tus anuncios. Tu email solo lo
              usamos para que entres{social && `; si entras con ${social}, también tu nombre de pila para el perfil (puedes cambiarlo)`}.
            </p>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              Todavía no se pueden crear cuentas. Mientras tanto, tus tablas guardadas, búsquedas guardadas y comparaciones
              se quedan en este dispositivo.
            </p>
            <div className={styles.actions}>
              <Link href="/guardado" className={ui.btnPrimary}>
                Ver mis guardadas
              </Link>
              <Link href="/buscar" className={ui.btnNeutral}>
                Buscar tablas
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
