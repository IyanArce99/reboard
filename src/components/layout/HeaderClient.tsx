"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/Logo";
import { HeartIcon, MenuIcon, UserIcon } from "@/components/icons";
import { useUserState } from "@/components/user/UserStateProvider";
import styles from "./Header.module.css";

/** Secciones principales. «Explorar» también se marca en las landings de /tablas. */
const NAV: { label: string; href: string; match: (p: string) => boolean }[] = [
  { label: "Explorar tablas", href: "/buscar", match: (p) => p.startsWith("/buscar") || p.startsWith("/tablas") },
  // TablaFinder es el nombre de la herramienta; la URL y el SEO siguen siendo /calculadora-litros.
  { label: "TablaFinder", href: "/calculadora-litros", match: (p) => p.startsWith("/calculadora-litros") },
  { label: "Guías", href: "/guias", match: (p) => p.startsWith("/guias") },
];

export function MainNav({ className, linkClassName }: { className: string; linkClassName: string }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="Principal">
      {NAV.map((n) => {
        const active = n.match(pathname);
        return (
          <Link key={n.href} href={n.href} className={linkClassName} data-active={active || undefined} aria-current={active ? "page" : undefined}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Corazón con contador (solo si hay guardadas). Tooltip visual y nombre accesible con el número. */
export function SavedButton() {
  const { saved } = useUserState();
  const active = usePathname().startsWith("/guardado");
  const n = saved.length;
  const label = n ? `Guardadas (${n})` : "Guardadas";
  return (
    <Link
      href="/guardado"
      aria-label={label}
      data-tip="Guardadas"
      className={styles.iconBtn}
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
    >
      <HeartIcon filled={n > 0} />
      {n > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}

/**
 * Cuenta: sin sesión, enlace a /entrar. Con sesión, inicial del nombre y un menú breve
 * (panel, cuenta, guardadas y salir).
 */
export function AccountButton() {
  const { authEnabled, account, signOut } = useUserState();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btnRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Al navegar, el menú se cierra.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  if (!authEnabled || !account) {
    const active = pathname.startsWith("/entrar");
    return (
      <Link href="/entrar" aria-label="Entrar" data-tip="Entrar" className={styles.iconBtn} data-active={active || undefined}>
        <UserIcon />
      </Link>
    );
  }

  const initial = account.name.trim().charAt(0).toUpperCase() || "R";
  return (
    <div ref={wrapRef} className={styles.accountWrap}>
      <button
        ref={btnRef}
        type="button"
        className={styles.iconBtn}
        aria-label={`Tu cuenta: ${account.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={open ? undefined : "Tu cuenta"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
      </button>
      {open && (
        <div className={styles.accountMenu} role="menu" aria-label="Tu cuenta">
          <div className={styles.accountHead}>
            <strong>{account.name}</strong>
            <span>{account.email}</span>
          </div>
          <Link href="/panel" role="menuitem" className={styles.accountItem}>
            Mis anuncios
          </Link>
          <Link href="/guardado" role="menuitem" className={styles.accountItem}>
            Guardadas
          </Link>
          <Link href="/cuenta" role="menuitem" className={styles.accountItem}>
            Mi cuenta
          </Link>
          <button
            type="button"
            role="menuitem"
            className={styles.accountItem}
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.replace("/");
              router.refresh();
            }}
          >
            Salir
          </button>
        </div>
      )}
    </div>
  );
}

/** Panel lateral derecho (86 %, o 360 px en tablet). Solo por debajo de 1024 px. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { saved, alerts, authEnabled, account } = useUserState();
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  const main: [string, string, string, boolean][] = NAV.map((n) => [
    n.label,
    n.href,
    n.href === "/calculadora-litros" ? "Calcula tus litros" : "",
    n.match(pathname),
  ]);
  const more: [string, string, string][] = [
    ["Guardadas", "/guardado", saved.length ? String(saved.length) : ""],
    ["Alertas", "/alertas", alerts.length ? String(alerts.length) : ""],
    ["Tiendas y escuelas", "/tiendas", ""],
    ["Mis anuncios", "/panel", ""],
  ];
  if (authEnabled) more.push(account ? ["Mi cuenta", "/cuenta", ""] : ["Entrar", "/entrar", ""]);

  return (
    <>
      <button ref={triggerRef} type="button" aria-label="Menú" aria-expanded={open} className={`${styles.iconBtn} ${styles.menuBtn}`} onClick={() => setOpen(true)}>
        <MenuIcon />
      </button>
      {open &&
        createPortal(
          <>
            <div className={styles.menuOverlay} onClick={() => setOpen(false)} aria-hidden="true" />
            <div className={styles.menu} role="dialog" aria-modal="true" aria-label="Menú">
              <div className={styles.menuHead}>
                <Logo size={26} />
                <button ref={closeRef} type="button" aria-label="Cerrar" className={styles.menuClose} onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>
              <nav className={styles.menuList} aria-label="Principal">
                {main.map(([label, href, hint, active]) => (
                  <Link
                    key={href}
                    href={href}
                    className={styles.menuMain}
                    data-active={active || undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                    {hint && <span>{hint}</span>}
                  </Link>
                ))}
              </nav>
              <nav className={styles.menuList} aria-label="Tu actividad">
                {more.map(([label, href, n]) => (
                  <Link key={href} href={href} className={styles.menuItem} onClick={() => setOpen(false)}>
                    {label}
                    {n && <span className={styles.menuCount}>{n}</span>}
                  </Link>
                ))}
              </nav>
              <div className={styles.menuFoot}>
                <Link href="/vender/publicar" className={styles.menuPublish} onClick={() => setOpen(false)}>
                  Publicar tabla
                </Link>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
