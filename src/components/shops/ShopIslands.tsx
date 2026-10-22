"use client";

// Islas cliente del directorio y del perfil de tienda o escuela.

import { useState } from "react";
import { useUserState } from "@/components/user/UserStateProvider";
import ui from "@/styles/ui.module.css";
import styles from "./Shops.module.css";

type ShopType = "tienda" | "escuela";

const FILTERS: [ShopType | "", string][] = [
  ["", "Todas"],
  ["tienda", "Tiendas"],
  ["escuela", "Escuelas"],
];

/** Directorio con filtro Todas / Tiendas / Escuelas. Las tarjetas llegan renderizadas del servidor. */
export function ShopDirectory({ cards }: { cards: { key: string; type: ShopType; node: React.ReactNode }[] }) {
  const [type, setType] = useState<ShopType | "">("");
  const shown = cards.filter((c) => !type || c.type === type);
  return (
    <>
      <div className={styles.filters} role="group" aria-label="Tipo de perfil">
        {FILTERS.map(([v, label]) => (
          <button
            key={label}
            type="button"
            className={`${ui.chip} ${styles.filter}`}
            aria-pressed={type === v}
            onClick={() => setType(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.cards}>
        {shown.map((c) => (
          <div key={c.key} style={{ display: "contents" }}>
            {c.node}
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Botón que solo informa con un aviso. Se usa donde aún no hay servicio real
 * (alta profesional, contacto de tiendas DEMO sin teléfono, web externa).
 */
export function ToastButton({ text, className, children }: { text: string; className?: string; children: React.ReactNode }) {
  const { toast } = useUserState();
  return (
    <button type="button" className={className} onClick={() => toast(text)}>
      {children}
    </button>
  );
}
