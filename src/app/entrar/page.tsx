import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Photo } from "@/components/brand/Photo";
import { LoginForm } from "@/components/auth/LoginForm";
import { authEnabled } from "@/lib/auth/config";
import { noindexRobots } from "@/lib/seo";
import ui from "@/styles/ui.module.css";
import styles from "@/components/auth/Auth.module.css";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra en Reboard con tu email: te enviamos un código de 6 cifras. Sin contraseñas.",
  robots: noindexRobots(),
};

export default function EntrarPage() {
  const enabled = authEnabled();
  return (
    <main className={styles.wrap}>
      <div className={styles.photo}>
        <Photo slug="tablas-orilla" sizes="45vw" position="50% 50%" decorative />
      </div>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Tu cuenta</p>
        <h1 className={styles.title}>Entrar en Reboard</h1>
        {enabled ? (
          <>
            <p className={styles.lead}>
              Sin contraseñas: te enviamos un código de 6 cifras a tu email. Si es la primera vez, la cuenta se crea al confirmarlo.
            </p>
            <Suspense fallback={<div className={styles.formSkeleton} />}>
              <LoginForm />
            </Suspense>
            <p className={styles.fine}>
              Con la cuenta, tus tablas guardadas se sincronizan entre dispositivos y puedes gestionar tus anuncios. Solo usamos
              tu email para que entres en tu cuenta.
            </p>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              Las cuentas todavía no están activas. Tus tablas guardadas, alertas y comparaciones
              se guardan en este dispositivo.
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
