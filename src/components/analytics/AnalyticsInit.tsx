"use client";

// Arranca la analítica (src/lib/analytics/track.ts) y manda UNA página vista por ruta: al cargar y en
// cada navegación a otra ruta. Los cambios de filtros dentro de /buscar no son páginas nuevas (eso lo
// mide `search_performed`). La URL que se envía va saneada (sin query salvo UTM).

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { startAnalytics, track } from "@/lib/analytics/track";

export function AnalyticsInit() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    startAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    track("$pageview", {});
  }, [pathname]);

  return null;
}
