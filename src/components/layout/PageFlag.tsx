"use client";

// Marcas de página para ajustar la cabecera y el pie desde CSS (globals.css):
// - focus: publicar en modo enfocado (sin pie ni «Vender» de la cabecera);
// - cta-sell: la página ya es la de vender (sin «Vender» en la cabecera);
// - cta-other: la página tiene su propia acción principal («Vender» en contorno);
// - admin: panel de administración (sin la cabecera ni el pie del marketplace).
//
// Por qué así y no solo con `body:has([data-…])`: Next deja montada (oculta) la página anterior al
// navegar, así que su marca seguía en el DOM y, por ejemplo, al volver de «Publicar» a la portada
// desaparecían el pie y el botón «Vender». Ahora la marca vive en <html> mientras la página está
// activa (efecto con limpieza; una página oculta desmonta sus efectos). El <span> solo cuenta antes
// de hidratar, para que la primera carga no parpadee.

import { useEffect } from "react";

export type PageFlagName = "focus" | "cta-sell" | "cta-other" | "admin";

// Contador por marca: al ir de una página a otra con la misma marca, la nueva puede montarse antes
// de que se limpie la anterior.
const counts = new Map<PageFlagName, number>();

export function PageFlag({ flag }: { flag: PageFlagName }) {
  useEffect(() => {
    const html = document.documentElement;
    counts.set(flag, (counts.get(flag) ?? 0) + 1);
    html.classList.add(`pf-${flag}`);
    return () => {
      const n = (counts.get(flag) ?? 1) - 1;
      counts.set(flag, n);
      if (n <= 0) html.classList.remove(`pf-${flag}`);
    };
  }, [flag]);
  return <span data-page-flag={flag} hidden />;
}

/** Marca <html> como hidratado: desde ahí mandan las clases pf-*, no los <span> del DOM. */
export function HydrationMark() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "");
  }, []);
  return null;
}
