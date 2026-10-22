"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/Logo";
import { HeartIcon, MenuIcon, SearchIcon } from "@/components/icons";
import { useUserState } from "@/components/user/UserStateProvider";
import { alertText, type CatalogNames } from "@/lib/search/describe";
import { hasVolumeFilter, parseFilters } from "@/lib/search/filters";
import styles from "./Header.module.css";

export function BuyLink({ className }: { className: string }) {
  const active = usePathname().startsWith("/buscar");
  return (
    <Link href="/buscar" className={className} data-active={active || undefined} aria-current={active ? "page" : undefined}>
      Comprar tablas
    </Link>
  );
}

/** Buscador compacto de las páginas interiores (≥ 1180 px). */
export function CompactSearch({ names, className }: { names: CatalogNames; className: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname === "/") return null;
  const f = parseFilters(Object.fromEntries(params.entries()));
  const text =
    pathname.startsWith("/buscar") && (f.zone || hasVolumeFilter(f) || f.shapes.length)
      ? alertText(f, names).replace(", en ", " · ")
      : "Buscar tablas por litros y zona";
  return (
    <Link href="/buscar" className={className}>
      <SearchIcon size={16} />
      <span>{text}</span>
    </Link>
  );
}

/** «Entrar» o el nombre del usuario. Solo con cuentas activas (base de datos real). */
export function AccountLink({ className }: { className: string }) {
  const { authEnabled, account } = useUserState();
  if (!authEnabled) return null;
  return account ? (
    <Link href="/cuenta" className={className} title="Mi cuenta">
      {account.name}
    </Link>
  ) : (
    <Link href="/entrar" className={className}>
      Entrar
    </Link>
  );
}

export function MobileSavedLink({ className, badgeClassName }: { className: string; badgeClassName: string }) {
  const { saved } = useUserState();
  return (
    <Link href="/guardado" aria-label={`Guardado (${saved.length})`} className={className}>
      <HeartIcon />
      {saved.length > 0 && <span className={badgeClassName}>{saved.length}</span>}
    </Link>
  );
}

/** Panel lateral derecho (86 %, o 360 px en tablet). No hay megamenú. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { saved, alerts, authEnabled, account } = useUserState();
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

  const items: [string, string, string][] = [
    ["Comprar tablas", "/buscar", ""],
    ["¿Qué tabla necesito?", "/calculadora-litros", ""],
    ["Guías", "/guias", ""],
    ["Guardado", "/guardado", String(saved.length)],
    ["Alertas", "/alertas", String(alerts.length)],
    ["Tiendas y escuelas", "/tiendas", ""],
    ["Mi panel de vendedor", "/panel", ""],
  ];
  if (authEnabled) items.push(account ? ["Mi cuenta", "/cuenta", ""] : ["Entrar", "/entrar", ""]);

  return (
    <>
      <button ref={triggerRef} type="button" aria-label="Menú" aria-expanded={open} className={styles.iconBtn} onClick={() => setOpen(true)}>
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
              <nav className={styles.menuList}>
                {items.map(([label, href, n]) => (
                  <Link key={href} href={href} className={styles.menuItem} onClick={() => setOpen(false)}>
                    {label}
                    <span>{n}</span>
                  </Link>
                ))}
              </nav>
              <div className={styles.menuFoot}>
                <Link href="/vender/publicar" className={styles.menuSell} onClick={() => setOpen(false)}>
                  Vender gratis
                </Link>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
