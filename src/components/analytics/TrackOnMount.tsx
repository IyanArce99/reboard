"use client";

// Para medir desde un Server Component (ficha, resultados): se pinta como nada y, al montarse, manda el
// evento una sola vez por `id` en esta pestaña (doble render de React, volver atrás).

import { useEffect } from "react";
import { trackOnce } from "@/lib/analytics/track";
import type { AnalyticsEvent, EventProps } from "@/lib/analytics/events";

export function TrackOnMount<E extends AnalyticsEvent>({ id, event, props }: { id: string; event: E; props: EventProps[E] }) {
  useEffect(() => {
    trackOnce(id, event, props);
    // `props` se deriva de `id` (misma ficha o misma búsqueda): basta con depender de `id`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, event]);
  return null;
}
