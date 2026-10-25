import type { Metadata } from "next";
import Link from "next/link";
import { BarChart, Notice, PageHeader, Stat, adminStyles as s, str } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Panel" };

interface Stats {
  days: number;
  users_total: number;
  users_new: number;
  users_suspended: number;
  listings_active: number;
  listings_flagged: number;
  listings_hidden: number;
  listings_sold: number;
  listings_new: number;
  reports_open: number;
  shops_pending: number;
  listings_per_day: { day: string; n: number }[];
  users_per_day: { day: string; n: number }[];
}

const PERIODS = [7, 30, 90] as const;

/** Rellena los días sin datos con 0 para que el gráfico muestre el periodo completo. */
function fillDays(rows: { day: string; n: number }[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day.slice(0, 10), r.n]));
  const out: { day: string; n: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, n: byDay.get(key) ?? 0 });
  }
  return out;
}

export default async function AdminDashboard(props: PageProps<"/admin">) {
  const { sb } = await requireAdminPage("/admin");
  const sp = await props.searchParams;
  const days = PERIODS.find((p) => String(p) === str(sp.dias)) ?? 30;
  const [{ data, error }, msgs] = await Promise.all([
    sb.rpc("admin_stats", { p_days: days }),
    sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  if (error || !data) return <Notice tone="error">{adminErrorText(error)}</Notice>;
  const messagesNew = msgs.count ?? 0;
  const st = data as unknown as Stats;
  const period = `en los últimos ${days} días`;

  return (
    <>
      <PageHeader
        title="Panel"
        subtitle="Datos reales de la base de datos. No se muestran las conversaciones entre usuarios ni las ventas cerradas: no hay forma fiable de medirlas."
        actions={
          <nav className={s.btnRow} aria-label="Periodo">
            {PERIODS.map((p) => (
              <Link key={p} href={`/admin?dias=${p}`} className={p === days ? s.btnPrimary : s.btn} aria-current={p === days ? "true" : undefined}>
                {p} días
              </Link>
            ))}
          </nav>
        }
      />

      {(messagesNew > 0 || st.reports_open > 0 || st.listings_flagged > 0 || st.shops_pending > 0) && (
        <div className={s.stats}>
          {messagesNew > 0 && <Stat label="Mensajes sin responder" value={messagesNew} href="/admin/mensajes" tone="warning" />}
          {st.reports_open > 0 && <Stat label="Reportes pendientes" value={st.reports_open} href="/admin/reportes" tone="warning" />}
          {st.listings_flagged > 0 && (
            <Stat label="Anuncios en revisión" value={st.listings_flagged} href="/admin/anuncios?moderacion=flagged" tone="warning" />
          )}
          {st.shops_pending > 0 && <Stat label="Tiendas por aprobar" value={st.shops_pending} href="/admin/tiendas?estado=pending" tone="warning" />}
        </div>
      )}

      <section aria-labelledby="h-users">
        <h2 id="h-users" className={s.cardTitle}>
          Usuarios
        </h2>
        <div className={s.stats}>
          <Stat label="Usuarios totales" value={st.users_total} href="/admin/usuarios" />
          <Stat label="Nuevos" value={st.users_new} hint={period} />
          <Stat label="Suspendidos" value={st.users_suspended} href="/admin/usuarios?estado=suspended" />
        </div>
      </section>

      <section aria-labelledby="h-listings">
        <h2 id="h-listings" className={s.cardTitle}>
          Anuncios
        </h2>
        <div className={s.stats}>
          <Stat label="Activos" value={st.listings_active} hint="Publicados y visibles" href="/admin/anuncios?estado=published" />
          <Stat label="Nuevos" value={st.listings_new} hint={`Publicados ${period}`} />
          <Stat label="Pendientes de revisión" value={st.listings_flagged} href="/admin/anuncios?moderacion=flagged" />
          <Stat label="Ocultos o retirados" value={st.listings_hidden} href="/admin/anuncios?moderacion=removed" />
          <Stat label="Vendidos" value={st.listings_sold} hint="Marcados como vendidos" href="/admin/anuncios?estado=sold" />
          <Stat label="Reportes pendientes" value={st.reports_open} href="/admin/reportes" />
        </div>
      </section>

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="h-chart-l">
          <h2 id="h-chart-l" className={s.cardTitle}>
            Anuncios publicados por día
          </h2>
          {st.listings_per_day.length ? (
            <BarChart data={fillDays(st.listings_per_day, days)} label={`Anuncios publicados por día ${period}`} />
          ) : (
            <p className={s.muted}>Todavía no hay anuncios publicados en este periodo.</p>
          )}
        </section>
        <section className={s.card} aria-labelledby="h-chart-u">
          <h2 id="h-chart-u" className={s.cardTitle}>
            Altas de usuarios por día
          </h2>
          {st.users_per_day.length ? (
            <BarChart data={fillDays(st.users_per_day, days)} label={`Altas de usuarios por día ${period}`} />
          ) : (
            <p className={s.muted}>Todavía no hay altas en este periodo.</p>
          )}
        </section>
      </div>

      <section className={s.card} aria-labelledby="h-alerts">
        <h2 id="h-alerts" className={s.cardTitle}>
          Alertas creadas
        </h2>
        <p className={s.muted}>
          Sin datos: hoy las alertas se guardan solo en el dispositivo de cada persona y no llegan al servidor. Ver{" "}
          <Link href="/admin/alertas">Alertas</Link>.
        </p>
      </section>
    </>
  );
}
