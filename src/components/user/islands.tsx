"use client";

// Pequeñas islas cliente que dependen del estado del usuario.

import { HeartIcon } from "@/components/icons";
import ui from "@/styles/ui.module.css";
import { useUserState } from "./UserStateProvider";

export function SaveButton({ id, className, size = 19 }: { id: string; className?: string; size?: number }) {
  const { saved, toggleSaved } = useUserState();
  const on = saved.includes(id);
  return (
    <button
      type="button"
      className={className}
      aria-label={on ? "Quitar de guardadas" : "Guardar"}
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

export function CompareButton({ id, label, className }: { id: string; label: string; className?: string }) {
  const { compare, toggleCompare } = useUserState();
  const on = compare.some((c) => c.id === id);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      data-on={on || undefined}
      onClick={() => toggleCompare({ id, label })}
    >
      {on ? "✓ Comparando" : "Comparar"}
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

export function SavedCount({ prefix = "" }: { prefix?: string }) {
  const { saved } = useUserState();
  return (
    <>
      {prefix}
      {saved.length}
    </>
  );
}
