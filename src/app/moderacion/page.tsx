import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/brand/EmptyState";
import { ModerationRow } from "@/components/moderation/ModerationRow";
import { MODERATION_ACTION_LABEL, REPORT_REASON_LABEL } from "@/components/moderation/labels";
import { moderationView } from "@/components/admin/listings/model";
import { lastHideOrRemove } from "@/components/admin/listings/queries";
import { noindexRobots } from "@/lib/seo";
import { currentModerator } from "@/lib/moderation/auth";
import styles from "@/components/moderation/Moderation.module.css";

export const metadata: Metadata = { title: "Moderación", robots: noindexRobots() };

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
  const [{ data: reports }, { data: flagged }, { data: log }, { data: isAdmin }] = await Promise.all([
    sb.from("reports").select("listing_id, reason, details, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(500),
    sb.from("listings").select("id").eq("moderation", "flagged").limit(200),
    sb.from("moderation_actions").select("listing_id, action, reason, created_at").order("created_at", { ascending: false }).limit(20),
    sb.rpc("is_admin"),
  ]);
  const ids = [...new Set([...(flagged ?? []).map((l) => l.id), ...(reports ?? []).map((r) => r.listing_id)])];
  const { data: listings } = ids.length
    ? await sb.from("listings").select("id, public_id, slug, size_label, price_eur, moderation, status, town, brand_text, brand:brands!listings_brand_id_fkey(name)").in("id", ids)
    : { data: [] };
  // Oculto y retirado comparten moderation = 'removed': los distingue la última acción hide/remove.
  const removedIds = (listings ?? []).filter((l) => l.moderation === "removed").map((l) => l.id);
  const lastHr = await lastHideOrRemove(sb, removedIds);

  const rows = (listings ?? [])
    .map((l) => {
      const rs = (reports ?? []).filter((r) => r.listing_id === l.id);
      return {
        publicId: l.public_id ?? `a${l.id}`,
        href: `/anuncio/${l.slug}-${l.public_id ?? `a${l.id}`}`,
        title: `${l.brand?.name ?? l.brand_text ?? "Sin marca"} ${l.size_label} · ${l.price_eur} € · ${l.town}`,
        view: moderationView(l.moderation, lastHr.get(l.id)),
        status: l.status,
        reports: rs.map((r) => ({ reason: REPORT_REASON_LABEL[r.reason] ?? r.reason, details: r.details, at: r.created_at })),
      };
    })
    .sort((a, b) => Number(b.view === "flagged") - Number(a.view === "flagged") || b.reports.length - a.reports.length);

  return (
    <>
      {isAdmin === true && (
        <p className={styles.lead}>
          Eres administrador: en el <Link href="/admin/reportes">panel de reportes</Link> también tienes el historial, la ficha completa y
          las cuentas de los vendedores.
        </p>
      )}
      <p className={styles.lead}>
        {rows.length ? `${rows.length} anuncio${rows.length > 1 ? "s" : ""} por revisar.` : "No hay nada pendiente."} Cuando un
        anuncio acumula suficientes reportes abiertos, pasa solo a «en revisión» y sigue visible hasta que decidas. Ocultar o
        retirar no borra fotos ni datos: siempre se puede restaurar.
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
            <time dateTime={a.created_at}>{new Date(a.created_at).toLocaleString("es-ES")}</time> · a{a.listing_id} · {MODERATION_ACTION_LABEL[a.action] ?? a.action}
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
