import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, Notice, PageHeader, Pager, adminStyles as s, fmtDate, pageParam, str } from "@/components/admin/ui";
import { ListingActions } from "@/components/admin/listings/ListingActions";
import ls from "@/components/admin/listings/Listings.module.css";
import {
  DB_STATUS_LABEL,
  DB_STATUS_TONE,
  MODERATION_VIEW,
  REPORT_GROUPS_PAGE_SIZE,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL,
  groupReports,
  moderationView,
  type DbReportStatus,
} from "@/components/admin/listings/model";
import { lastHideOrRemove, listingTitle } from "@/components/admin/listings/queries";
import { REPORT_REASONS, REPORT_REASON_LABEL, type ReportReason } from "@/components/moderation/labels";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Reportes" };

// Se leen como mucho los últimos MAX reportes del estado elegido y se agrupan por anuncio.
const MAX = 1000;

export default async function AdminReportsPage(props: PageProps<"/admin/reportes">) {
  const { sb } = await requireAdminPage("/admin/reportes");
  const sp = await props.searchParams;
  const estado = (REPORT_STATUSES as readonly string[]).includes(str(sp.estado) ?? "") ? (str(sp.estado) as DbReportStatus) : "open";
  const motivo = REPORT_REASONS.some(([v]) => v === str(sp.motivo)) ? (str(sp.motivo) as ReportReason) : undefined;
  const page = pageParam(sp.pagina);

  // Una sola consulta: reportes + su anuncio (embebido).
  let q = sb
    .from("reports")
    .select(
      "id, listing_id, reason, details, status, created_at, reporter_id, listing:listings!reports_listing_id_fkey(id, public_id, slug, size_label, price_eur, status, moderation, seller_id, town, brand_text, brand:brands!listings_brand_id_fkey(name), seller:profiles!listings_seller_id_fkey(display_name))",
    )
    .eq("status", estado);
  if (motivo) q = q.eq("reason", motivo);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(MAX);
  if (error) return <Notice tone="error">{adminErrorText(error)}</Notice>;

  const groups = groupReports(data ?? []);
  const pageGroups = groups.slice((page - 1) * REPORT_GROUPS_PAGE_SIZE, page * REPORT_GROUPS_PAGE_SIZE);
  const hr = await lastHideOrRemove(
    sb,
    pageGroups.filter((g) => g.reports[0].listing?.moderation === "removed").map((g) => g.listingId),
  );
  const params = { estado: estado === "open" ? undefined : estado, motivo };

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Agrupados por anuncio, primero los más reportados. Ocultar o retirar no borra fotos ni datos. Para suspender una cuenta, entra en la ficha del vendedor."
      />

      <form className={s.filters} method="get" action="/admin/reportes" aria-label="Filtrar reportes">
        <label className={s.field}>
          Estado
          <select name="estado" defaultValue={estado}>
            {REPORT_STATUSES.map((v) => (
              <option key={v} value={v}>
                {REPORT_STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Motivo
          <select name="motivo" defaultValue={motivo ?? ""}>
            <option value="">Todos</option>
            {REPORT_REASONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={s.btnPrimary}>
          Filtrar
        </button>
      </form>

      {(data?.length ?? 0) >= MAX && (
        <Notice tone="warning">Se muestran los {MAX} reportes más recientes. Filtra por motivo para ver el resto.</Notice>
      )}

      {pageGroups.length === 0 ? (
        <Empty title={estado === "open" ? "No hay reportes pendientes" : `No hay reportes ${REPORT_STATUS_LABEL[estado].toLowerCase()}`}>
          {estado === "open" ? "Cuando alguien reporte un anuncio, aparecerá aquí." : null}
        </Empty>
      ) : (
        pageGroups.map((g) => {
          const l = g.reports[0].listing;
          const pid = l?.public_id ?? `a${g.listingId}`;
          const view = l ? moderationView(l.moderation, hr.get(g.listingId)) : "visible";
          const mv = MODERATION_VIEW[view];
          const byReason = new Map<string, number>();
          for (const r of g.reports) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
          return (
            <article key={g.listingId} className={`${s.card} ${ls.group}`} aria-labelledby={`r-${g.listingId}`}>
              <div className={ls.groupHead}>
                <h2 id={`r-${g.listingId}`} className={ls.groupTitle}>
                  <Link href={`/admin/anuncios/${pid}`}>{l ? `${listingTitle(l)} · ${l.price_eur.toLocaleString("es-ES")} € · ${l.town}` : pid}</Link>{" "}
                  <span className={s.mono}>{pid}</span>
                </h2>
                <span className={s.btnRow}>
                  {l && <Badge tone={DB_STATUS_TONE[l.status]}>{DB_STATUS_LABEL[l.status]}</Badge>}
                  <Badge tone={mv.tone}>{mv.label}</Badge>
                </span>
              </div>
              <div className={ls.reasons} aria-label="Motivos">
                <Badge tone="warning">
                  {g.reports.length} reporte{g.reports.length > 1 ? "s" : ""}
                </Badge>
                {[...byReason].map(([reason, n]) => (
                  <Badge key={reason}>
                    {REPORT_REASON_LABEL[reason] ?? reason}
                    {n > 1 ? ` × ${n}` : ""}
                  </Badge>
                ))}
              </div>
              <ul className={ls.list}>
                {g.reports.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <strong>{REPORT_REASON_LABEL[r.reason] ?? r.reason}</strong>
                    {r.details && <span className={ls.quote}>{r.details}</span>}
                    <span className={ls.meta}>
                      {fmtDate(r.created_at, true)} · por <Link href={`/admin/usuarios/${r.reporter_id}`}>usuario {r.reporter_id.slice(0, 8)}…</Link>
                    </span>
                  </li>
                ))}
              </ul>
              {g.reports.length > 5 && (
                <p className={s.small}>
                  Y {g.reports.length - 5} más en la <Link href={`/admin/anuncios/${pid}`}>ficha del anuncio</Link>.
                </p>
              )}
              <div className={s.btnRow}>
                <Link href={`/admin/anuncios/${pid}`} className={s.btn}>
                  Ver anuncio
                </Link>
                {l && (
                  <Link href={`/admin/usuarios/${l.seller_id}`} className={s.btn}>
                    Vendedor: {l.seller?.display_name ?? `${l.seller_id.slice(0, 8)}…`}
                  </Link>
                )}
                {l && estado === "open" && <ListingActions publicId={pid} view={view} status={l.status} openReports={g.reports.length} quick />}
              </div>
            </article>
          );
        })
      )}

      <Pager page={page} pageSize={REPORT_GROUPS_PAGE_SIZE} total={groups.length} basePath="/admin/reportes" params={params} />
    </>
  );
}
