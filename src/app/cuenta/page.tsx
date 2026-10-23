import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteAccount, ProfileForm, SignOutButton } from "@/components/auth/AccountIslands";
import { authEnabled } from "@/lib/auth/config";
import { noindexRobots } from "@/lib/seo";
import { createUserClient } from "@/lib/supabase/server";
import styles from "@/components/auth/Auth.module.css";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: noindexRobots(),
};

async function Account() {
  if (!authEnabled()) redirect("/entrar");
  // proxy.ts ya pide entrar sin sesión; aquí se comprueba de nuevo (defensa en profundidad).
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/entrar?siguiente=/cuenta");
  // Rol del equipo (lo decide la base de datos; el enlace solo es un atajo, el panel vuelve a comprobarlo).
  const [{ data: profile }, { data: adminStatus }, { data: isModerator }] = await Promise.all([
    supabase.from("profiles").select("display_name, seller_type").eq("id", user.id).maybeSingle(),
    supabase.rpc("admin_status"),
    supabase.rpc("is_moderator"),
  ]);
  const isAdmin = adminStatus === "admin" || adminStatus === "needs_mfa";
  const name = profile?.display_name ?? "Surfista";

  return (
    <>
      <h1 className={styles.title}>Hola, {name}</h1>
      <p className={styles.meta}>
        Entras con <strong>{user.email}</strong>.
      </p>

      <section className={styles.card} aria-labelledby="perfil-title">
        <h2 id="perfil-title">Tu nombre</h2>
        <p className={styles.meta}>Es lo que ve quien abre tus anuncios. Puede ser tu nombre o un apodo.</p>
        <ProfileForm initialName={name} />
      </section>

      <section className={styles.card} aria-labelledby="atajos-title">
        <h2 id="atajos-title">Accesos rápidos</h2>
        <div className={styles.links}>
          <Link href="/guardado">
            Guardadas<span>Sincronizadas con tu cuenta.</span>
          </Link>
          <Link href="/panel">
            Mis anuncios<span>Confirmar, bajar precio o marcar vendida.</span>
          </Link>
          <Link href="/alertas">
            Alertas<span>Guardadas en este dispositivo, no en tu cuenta.</span>
          </Link>
          {isAdmin && (
            <Link href="/admin">
              Panel de administración<span>Usuarios, anuncios, reportes, catálogo y configuración.</span>
            </Link>
          )}
          {!isAdmin && isModerator && (
            <Link href="/moderacion">
              Moderación<span>Anuncios reportados pendientes de revisar.</span>
            </Link>
          )}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="sesion-title">
        <h2 id="sesion-title">Sesión</h2>
        <p className={styles.meta}>Al salir, tus guardadas siguen en tu cuenta y desaparecen de este dispositivo.</p>
        <SignOutButton />
      </section>

      <section className={styles.card} aria-labelledby="borrar-title">
        <h2 id="borrar-title">Borrar la cuenta</h2>
        <p className={styles.meta}>
          Se borran tu perfil, tus anuncios con sus fotos, tu teléfono de contacto, tus guardados y tus reportes. No se puede deshacer.
        </p>
        <DeleteAccount />
      </section>
    </>
  );
}

export default function CuentaPage() {
  return (
    <main className="container">
      <div className={styles.account}>
        <p className={styles.eyebrow}>Tu cuenta</p>
        <Suspense fallback={<div className={styles.formSkeleton} />}>
          <Account />
        </Suspense>
      </div>
    </main>
  );
}
