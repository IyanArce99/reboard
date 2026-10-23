import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteAccount, ProfileForm, SignOutButton } from "@/components/auth/AccountIslands";
import { authEnabled } from "@/lib/auth/config";
import { noindexRobots } from "@/lib/seo";
import { createUserClient } from "@/lib/supabase/server";
import ui from "@/styles/ui.module.css";
import styles from "@/components/auth/Account.module.css";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: noindexRobots(),
};

const SELLER_TYPE: Record<string, string> = { particular: "Particular", tienda: "Tienda", escuela: "Escuela" };

/** Iconos de trazo de 2 px de los accesos (docs/DESIGN_SYSTEM.md). */
function Icon({ name }: { name: "board" | "heart" | "bell" | "shield" | "plus" }) {
  const paths: Record<typeof name, React.ReactNode> = {
    board: <path d="M12 2c3.5 3 5 7 5 10s-1.5 7-5 10c-3.5-3-5-7-5-10s1.5-7 5-10zM12 6v12" />,
    heart: <path d="M12 20s-7-4.4-9.2-8.6A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 9.2 5.2C19 15.6 12 20 12 20z" />,
    bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 21h4" />,
    shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4" />,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Chevron() {
  return (
    <svg className={styles.chevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function Item({ href, icon, title, desc, staff = false }: { href: string; icon: Parameters<typeof Icon>[0]["name"]; title: string; desc: string; staff?: boolean }) {
  return (
    <Link href={href} className={`${styles.item} ${staff ? styles.itemStaff : ""}`}>
      <span className={styles.itemIcon}>
        <Icon name={icon} />
      </span>
      <span className={styles.itemText}>
        <span className={styles.itemTitle}>{title}</span>
        <span className={styles.itemDesc}>{desc}</span>
      </span>
      <Chevron />
    </Link>
  );
}

async function Account() {
  if (!authEnabled()) redirect("/entrar");
  // proxy.ts ya pide entrar sin sesión; aquí se comprueba de nuevo (defensa en profundidad).
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/entrar?siguiente=/cuenta");

  // Todo con la sesión del usuario (RLS: solo lo suyo). El rol del equipo lo decide la base de datos;
  // el enlace es solo un atajo y el panel vuelve a comprobarlo.
  const count = (status: "published" | "sold" | "expired") =>
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", status);
  const [{ data: profile }, { data: adminStatus }, { data: isModerator }, published, sold, expired, saved] = await Promise.all([
    supabase.from("profiles").select("display_name, seller_type").eq("id", user.id).maybeSingle(),
    supabase.rpc("admin_status"),
    supabase.rpc("is_moderator"),
    count("published"),
    count("sold"),
    count("expired"),
    supabase.from("favorites").select("listing_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const isAdmin = adminStatus === "admin" || adminStatus === "needs_mfa";
  const role = isAdmin ? "Administrador" : isModerator ? "Moderación" : null;
  const name = profile?.display_name ?? "Surfista";
  const sellerType = SELLER_TYPE[profile?.seller_type ?? "particular"] ?? "Particular";
  const n = (r: { count: number | null }) => r.count ?? 0;
  const expiredCount = n(expired);

  return (
    <>
      <header className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          {name.trim().charAt(0).toUpperCase() || "R"}
        </span>
        <div className={styles.headText}>
          <p className={styles.eyebrow}>Tu cuenta</p>
          <h1 className={styles.title}>Hola, {name}</h1>
          <p className={styles.email}>
            <span>{user.email}</span>
            {role && <span className={styles.role}>{role}</span>}
          </p>
        </div>
        <Link href="/vender/publicar" className={`${ui.btnPrimary} ${styles.headCta}`}>
          Publicar una tabla
        </Link>
      </header>

      {expiredCount > 0 && (
        <p className={styles.notice} role="status">
          <span>
            {expiredCount === 1 ? "Tienes 1 anuncio caducado." : `Tienes ${expiredCount} anuncios caducados.`} Si la tabla sigue a la venta, puedes volver a publicarlo.
          </span>
          <Link href="/panel">Ir a mis anuncios</Link>
        </p>
      )}

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <section aria-labelledby="resumen-title">
            <h2 id="resumen-title" className={styles.srOnly}>
              Resumen
            </h2>
            <div className={styles.stats}>
              <Link href="/panel" className={styles.stat}>
                <span className={styles.statValue}>{n(published)}</span>
                <span className={styles.statLabel}>{n(published) === 1 ? "Anuncio activo" : "Anuncios activos"}</span>
              </Link>
              <Link href="/panel" className={styles.stat}>
                <span className={styles.statValue}>{n(sold)}</span>
                <span className={styles.statLabel}>{n(sold) === 1 ? "Vendida" : "Vendidas"}</span>
              </Link>
              <Link href="/guardado" className={styles.stat}>
                <span className={styles.statValue}>{n(saved)}</span>
                <span className={styles.statLabel}>{n(saved) === 1 ? "Guardada" : "Guardadas"}</span>
              </Link>
            </div>
          </section>

          <nav aria-label="Accesos de tu cuenta" className={styles.list}>
            {isAdmin && <Item href="/admin" icon="shield" title="Panel de administración" desc="Usuarios, anuncios, reportes, catálogo y configuración." staff />}
            {!isAdmin && isModerator && <Item href="/moderacion" icon="shield" title="Moderación" desc="Anuncios reportados pendientes de revisar." staff />}
            <Item href="/panel" icon="board" title="Mis anuncios" desc="Editar, confirmar que siguen a la venta, bajar el precio o marcar como vendida." />
            <Item href="/guardado" icon="heart" title="Guardadas" desc="Las tablas que has guardado, en el móvil y en el ordenador." />
            <Item href="/alertas" icon="bell" title="Alertas" desc="Tus alertas de tablas nuevas. Se guardan solo en este dispositivo." />
          </nav>
        </div>

        <aside className={styles.side} aria-label="Ajustes de la cuenta">
          <section className={styles.card} aria-labelledby="perfil-title">
            <h2 id="perfil-title" className={styles.cardTitle}>
              Perfil público
            </h2>
            <p className={styles.cardText}>Lo que ve quien abre tus anuncios. Puede ser tu nombre o un apodo.</p>
            <div className={styles.preview} aria-hidden="true">
              <span className={styles.previewAvatar}>{name.trim().charAt(0).toUpperCase() || "R"}</span>
              <span>
                <span className={styles.previewName}>{name}</span>
                <span className={styles.previewType}>{sellerType}</span>
              </span>
            </div>
            <ProfileForm initialName={name} />
          </section>

          <section className={styles.card} aria-labelledby="sesion-title">
            <h2 id="sesion-title" className={styles.cardTitle}>
              Sesión
            </h2>
            <p className={styles.cardText}>Tus guardadas siguen en tu cuenta cuando sales.</p>
            <SignOutButton />
          </section>

          <details className={styles.danger}>
            <summary>Borrar la cuenta</summary>
            <div className={styles.dangerBody}>
              <p className={styles.cardText}>
                Se borran tu perfil, tus anuncios con sus fotos, tu teléfono de contacto, tus guardadas y tus reportes. No se puede deshacer.
              </p>
              <DeleteAccount />
            </div>
          </details>
        </aside>
      </div>
    </>
  );
}

export default function CuentaPage() {
  return (
    <main className="container">
      <div className={styles.page}>
        <Suspense fallback={<div className={styles.skeleton} />}>
          <Account />
        </Suspense>
      </div>
    </main>
  );
}
