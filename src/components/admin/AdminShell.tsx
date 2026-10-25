"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useUserState } from "@/components/user/UserStateProvider";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import styles from "./Admin.module.css";
import { PageFlag } from "@/components/layout/PageFlag";

export interface AdminNavCounts {
  reports: number;
  shopsPending: number;
}

const NAV: { group: string; items: { href: string; label: string; count?: keyof AdminNavCounts }[] }[] = [
  { group: "General", items: [{ href: "/admin", label: "Panel" }] },
  {
    group: "Marketplace",
    items: [
      { href: "/admin/reportes", label: "Reportes", count: "reports" },
      { href: "/admin/anuncios", label: "Anuncios" },
      { href: "/admin/usuarios", label: "Usuarios" },
      { href: "/admin/tiendas", label: "Tiendas y escuelas", count: "shopsPending" },
      { href: "/admin/alertas", label: "Alertas" },
    ],
  },
  {
    group: "Contenido",
    items: [
      { href: "/admin/catalogo", label: "Marcas y modelos" },
      { href: "/admin/configuracion", label: "Configuración" },
    ],
  },
  {
    group: "Seguridad",
    items: [
      { href: "/admin/auditoria", label: "Auditoría" },
      { href: "/admin/seguridad", label: "Mi segundo factor" },
    ],
  },
];

/** Navegación del panel: barra lateral en escritorio y panel deslizante en móvil (< 1024 px). */
export function AdminShell({
  email,
  counts,
  minimal = false,
  children,
}: {
  email: string;
  counts: AdminNavCounts;
  /** Sin navegación (falta verificar el segundo factor). */
  minimal?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { signOut } = useUserState();
  const [open, setOpen] = useState(false);
  const sideRef = useRef<HTMLElement>(null);
  useDialogFocus(open, sideRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const exit = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className={styles.shell} data-admin-shell="">
      <PageFlag flag="admin" />
      <header className={styles.topbar}>
        <span className={styles.brand}>
          REBOARD <span>Admin</span>
        </span>
        {!minimal && (
          <button type="button" className={styles.menuBtn} aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen(true)}>
            Menú
          </button>
        )}
      </header>
      {open && <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside
        ref={sideRef}
        id="admin-nav"
        className={styles.sidebar}
        data-open={open || undefined}
        aria-label="Administración"
        {...(open ? { role: "dialog", "aria-modal": true } : {})}
      >
        <Link href="/admin" className={styles.brand} onClick={() => setOpen(false)}>
          REBOARD <span>Admin</span>
        </Link>
        {!minimal && (
          // La ruta actual (usePathname) es dato de la URL: en rutas dinámicas necesita su propio Suspense.
          <Suspense fallback={<Nav counts={counts} path={null} onNavigate={() => setOpen(false)} />}>
            <CurrentNav counts={counts} onNavigate={() => setOpen(false)} />
          </Suspense>
        )}
        <div className={styles.sideFoot}>
          <span>{email}</span>
          <Link href="/" onClick={() => setOpen(false)}>
            Ver la web
          </Link>
          <button type="button" onClick={() => void exit()}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className={styles.main} id="admin-main">
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

function CurrentNav({ counts, onNavigate }: { counts: AdminNavCounts; onNavigate: () => void }) {
  return <Nav counts={counts} path={usePathname()} onNavigate={onNavigate} />;
}

function Nav({ counts, path, onNavigate }: { counts: AdminNavCounts; path: string | null; onNavigate: () => void }) {
  const current = (href: string) =>
    path != null && (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
  return (
    <nav className={styles.nav} aria-label="Secciones del panel">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className={styles.navGroup}>{g.group}</p>
          {g.items.map((it) => {
            const n = it.count ? counts[it.count] : 0;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={styles.navLink}
                aria-current={current(it.href) ? "page" : undefined}
                onClick={onNavigate}
              >
                {it.label}
                {n > 0 && (
                  <span className={styles.navCount} aria-label={`${n} pendientes`}>
                    {n > 99 ? "99+" : n}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
