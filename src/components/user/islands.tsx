"use client";

// Pequeñas islas cliente que dependen del estado del usuario.

import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import ui from "@/styles/ui.module.css";
import { useUserState, type CompareItem } from "./UserStateProvider";

/** `name`: título del anuncio, para que en una lista no se oigan N «Guardar» iguales. */
export function SaveButton({ id, name, className, size = 19 }: { id: string; name?: string; className?: string; size?: number }) {
  const { saved, toggleSaved } = useUserState();
  const on = saved.includes(id);
  const label = on ? (name ? `Quitar ${name} de guardadas` : "Quitar de guardadas") : name ? `Guardar ${name}` : "Guardar";
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={on}
      onClick={() => toggleSaved(id)}
      style={{ color: on ? "var(--rb-teal)" : "var(--rb-petrol)" }}
    >
      <HeartIcon size={size} filled={on} />
    </button>
  );
}

export function SaveTextButton({ id, className }: { id: string; className?: string }) {
  const { saved, toggleSaved } = useUserState();
  const on = saved.includes(id);
  return (
    <button type="button" className={className} aria-pressed={on} onClick={() => toggleSaved(id)}>
      {on ? "♥ Guardada" : "Guardar"}
    </button>
  );
}

/**
 * Añadir o quitar una tabla de la comparación. `item` lleva la etiqueta corta, la miniatura y la
 * silueta para la barra de comparación; `name`, el título completo para lectores de pantalla.
 */
export function CompareButton({ item, name, className }: { item: CompareItem; name?: string; className?: string }) {
  const { compare, toggleCompare } = useUserState();
  const on = compare.some((c) => c.id === item.id);
  return (
    <button type="button" className={className} aria-pressed={on} data-on={on || undefined} onClick={() => toggleCompare(item)}>
      <CompareIcon on={on} />
      {on ? "Comparando" : "Comparar"}
      <span className="visually-hidden">: {name ?? item.label}</span>
    </button>
  );
}

function CompareIcon({ on }: { on: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {on ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}

/**
 * Acceso al comparador donde no se muestra la barra de comparación (ficha en móvil, que ya tiene su
 * barra de contacto fija, y el resultado de TablaFinder). Solo aparece con alguna tabla elegida.
 */
export function CompareLink({ className }: { className?: string }) {
  const { compare } = useUserState();
  const n = compare.length;
  if (!n) return null;
  return (
    <Link href="/comparar" className={className}>
      {n >= 2 ? `Ver comparación (${n})` : "1 tabla en comparación · añade otra"}
    </Link>
  );
}

/**
 * Compartir un enlace: en el móvil abre el menú del sistema (WhatsApp, Telegram…) con un título y un
 * texto; donde no existe (la mayoría de navegadores de escritorio), copia el enlace y lo avisa.
 */
export function ShareButton({
  url,
  className,
  title,
  text,
  label = "Compartir",
}: {
  /** Absoluta o relativa a la web (se completa con el dominio actual). */
  url: string;
  className?: string;
  title?: string;
  text?: string;
  label?: string;
}) {
  const { toast } = useUserState();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const href = new URL(url, window.location.origin).toString();
        try {
          if (navigator.share) await navigator.share({ title, text, url: href });
          else {
            await navigator.clipboard.writeText(href);
            toast("Enlace copiado: pégalo donde quieras compartirlo.");
          }
        } catch (e) {
          // Cancelar el menú de compartir no es un error; si falla el portapapeles, se avisa.
          if ((e as Error)?.name !== "AbortError") toast("No hemos podido copiar el enlace. Cópialo de la barra de direcciones.");
        }
      }}
    >
      {label}
    </button>
  );
}

/** «Te encaja»: el volumen está dentro del rango orientativo del perfil de surfista. */
export function FitBadge({ volume, text = "Te encaja · en tu rango de litros", className = ui.fitBadge }: { volume: number | null; text?: string; className?: string }) {
  const { profile } = useUserState();
  if (!profile || volume == null || volume < profile.lo || volume > profile.hi) return null;
  return <div className={className}>{text}</div>;
}

export function AlertButton({
  text,
  query,
  className,
  children = "Crear alerta",
}: {
  text: string;
  query: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { addAlert } = useUserState();
  return (
    <button type="button" className={className} onClick={() => addAlert(text, query)}>
      {children}
    </button>
  );
}
