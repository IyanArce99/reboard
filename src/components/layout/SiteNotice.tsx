"use client";

import { useEffect, useState } from "react";
import type { SiteNotice as Notice } from "@/components/admin/settings/schema";

const TONES = {
  info: { background: "var(--rb-teal-tint)", color: "var(--rb-teal-ink)", label: "Aviso" },
  warning: { background: "var(--rb-warning-tint)", color: "var(--rb-warning-ink)", label: "Aviso importante" },
} as const;

/**
 * Banda del aviso de la web. Se pide a /api/aviso después de cargar la página (respuesta cacheada en
 * el servidor), para no añadir datos al HTML estático de todas las páginas. Sin aviso, no ocupa sitio.
 */
export function SiteNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/aviso", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((n: Notice | null) => {
        if (alive && n?.active && n.text) setNotice(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!notice) return null;
  const t = TONES[notice.tone] ?? TONES.info;
  return (
    <aside
      aria-label={t.label}
      style={{
        background: t.background,
        color: t.color,
        padding: "8px 16px",
        fontSize: 14,
        lineHeight: 1.4,
        textAlign: "center",
        fontWeight: 600,
        borderBottom: "1px solid var(--rb-line)",
      }}
    >
      <p style={{ margin: "0 auto", maxWidth: 960 }}>{notice.text}</p>
    </aside>
  );
}
