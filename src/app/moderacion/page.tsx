import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/brand/EmptyState";
import { ModerationRow } from "@/components/moderation/ModerationRow";
import { noindexRobots } from "@/lib/seo";
import { currentModerator } from "@/lib/moderation/auth";
import styles from "@/components/moderation/Moderation.module.css";

export const metadata: Metadata = { title: "Moderación", robots: noindexRobots() };

const REASON: Record<string, string> = {
  fraude: "Posible estafa",
  "datos-falsos": "Fotos o datos falsos",
  vendida: "Ya vendida",
  duplicado: "Duplicado",
  inapropiado: "Inapropiado",
  otro: "Otro",
};

async function Queue() {
  const mod = await currentModerator();
  if (!mod) {
    return (
      <EmptyState title="No tienes acceso" actions={<Link href="/">Volver al inicio</Link>}>
        Esta sección es solo para el equipo de moderación.
      </EmptyState>
    );
  }
  const { sb } = mod;
  const [{ data: reports }, { data: flagged }, { data: log }] = await Promise.all([
    sb.from("reports").select("listing_id, reason, details, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(500),
    sb.from("listings").select("id").eq("moderation", "flagged").limit(200),
    sb.from("moderation_actions").select("listing_id, action, reason, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const ids = [...new Set([...(flagged ?? []).map((l) => l.id), ...(reports ?? []).map((r) => r.listing_id)])];
  const { data: listings } = ids.length
    ? await sb.from("listings").select("id, public_id, slug, size_label, price_eur, moderation, status, town, brand_text, brand:brands!listings_brand_id_fkey(name)").in("id", ids)
    : { data: [] };

  const rows = (listings ?? [])
    .map((l) => {
      const rs = (reports ?? []).filter((r) => r.listing_id === l.id);
      return {
        publicId: l.public_id ?? `a${l.id}`,
        href: `/anuncio/${l.slug}-${l.public_id ?? `a${l.id}`}`,
        title: `${l.brand?.name ?? l.brand_text ?? "Artesanal"} ${l.size_label} · ${l.price_eur} € · ${l.town}`,
        moderation: l.moderation,
        status: l.status,
        reports: rs.map((r) => ({ reason: REASON[r.reason] ?? r.reason, details: r.details, at: r.created_at })),
      };
    })
    .sort((a, b) => Number(b.moderation === "flagged") - Number(a.moderation === "flagged") || b.reports.length - a.reports.length);

  return (
    <>
      <p className={styles.lead}>
        {rows.length ? `${rows.length} anuncio${rows.length > 1 ? "s" : ""} por revisar.` : "No hay nada pendiente."} Con tres
        reportes abiertos, un anuncio pasa a «en revisión» automáticamente (sigue visible hasta que decidas).
      </p>
      <div className={styles.rows}>
        {rows.map((r) => (
          <ModerationRow key={r.publicId} row={r} />
        ))}
      </div>
      <h2 className={styles.h2}>Últimas acciones</h2>
      <ul className={styles.log}>
        {(log ?? []).map((a) => (
          <li key={`${a.listing_id}-${a.created_at}`}>
            <time dateTime={a.created_at}>{new Date(a.created_at).toLocaleString("es-ES")}</time> · a{a.listing_id} · {a.action}
            {a.reason ? ` · ${a.reason}` : ""}
          </li>
        ))}
        {!log?.length && <li>Todavía no hay acciones.</li>}
      </ul>
    </>
  );
}

export default function ModeracionPage() {
  return (
    <main className={`container ${styles.page}`}>
      <p className={styles.eyebrow}>Equipo</p>
      <h1 className={styles.title}>Moderación</h1>
      <Suspense fallback={<div className={styles.skeleton} />}>
        <Queue />
      </Suspense>
    </main>
  );
}
