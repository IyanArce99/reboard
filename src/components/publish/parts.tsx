"use client";

// Piezas compartidas del asistente de publicación: textos de cada paso, chips y tipos.

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { CatalogModel } from "@/lib/domain/types";
import type { PublishDraft } from "@/lib/publish/draft";
import ui from "@/styles/ui.module.css";
import styles from "./Publish.module.css";

export const MAX_PHOTOS = 8;

/** Los 5 pasos: nombre corto (indicador de progreso) y titular natural del paso. */
export const STEPS = [
  { short: "Fotos", title: "Enséñanos tu tabla", lead: "Las fotos son lo primero que se mira. La primera será la portada." },
  { short: "La tabla", title: "Cuéntanos qué tabla es", lead: "Marca, medidas y tipo: así te encuentra quien busca por litros." },
  { short: "Estado", title: "¿En qué estado está?", lead: "Cuéntalo tal cual: da confianza y te ahorra visitas en balde." },
  { short: "Precio y ubicación", title: "¿Por cuánto la vendes?", lead: "Pon el precio, dónde está la tabla y cómo quieres que te contacten." },
  { short: "Revisar", title: "Así quedará tu anuncio", lead: "Comprueba que todo está bien. Puedes cambiar cualquier parte sin perder lo demás." },
] as const;

export interface StepProps {
  d: PublishDraft;
  set: (p: Partial<PublishDraft>) => void;
  setD: Dispatch<SetStateAction<PublishDraft>>;
}

export interface CatalogProps {
  catalog: CatalogModel[];
}

export function Chip({
  on,
  onClick,
  children,
  mono,
  label,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  mono?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`${ui.chip} ${styles.chip} ${mono ? ui.chipMono : ""}`}
    >
      {children}
    </button>
  );
}

/** Grupo de opciones con un título visible que lo nombra. */
export function Group({ id, title, hint, children }: { id: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.group} role="group" aria-labelledby={id}>
      <div className={styles.groupHead}>
        <span id={id} className={styles.groupTitle}>
          {title}
        </span>
        {hint && <span className={styles.groupHint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
