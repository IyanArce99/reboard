import type { Metadata } from "next";
import Link from "next/link";
import { Empty, Notice, PageHeader, Pager, adminStyles as s, fmtDate, pageParam } from "@/components/admin/ui";
import { AuditDiff } from "@/components/admin/users/AuditDiff";
import { ENTITY_TYPES, actionLabel, entityHref, entityLabel, parseAuditFilters } from "@/components/admin/users/format";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Auditoría" };

const PAGE_SIZE = 50;

export default async function AdminAudit(props: PageProps<"/admin/auditoria">) {
  const { sb } = await requireAdminPage("/admin/auditoria");
  const sp = await props.searchParams;
  const f = parseAuditFilters(sp);
  const page = pageParam(sp.pagina);
  const from = (page - 1) * PAGE_SIZE;

  let query = sb
    .from("admin_audit_log")
    .select("id, actor_id, action, entity_type, entity_id, reason, before, after, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (f.tipo) query = query.eq("entity_type", f.tipo);
  if (f.accion) query = query.eq("action", f.accion);
  if (f.actor) query = query.eq("actor_id", f.actor);
  if (f.entidad) query = query.eq("entity_id", f.entidad);
  const res = await query.range(from, from + PAGE_SIZE - 1);
  // Página fuera de rango (PGRST103): se trata como «no hay más registros», no como error.
  const error = res.error?.code === "PGRST103" ? null : res.error;
  const rows = res.data ?? [];
  const count = res.count;

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => !!v))];
  const { data: emails } = actorIds.length ? await sb.rpc("admin_user_emails", { p_ids: actorIds }) : { data: [] };
  const emailOf = new Map((emails ?? []).map((e) => [e.id, e.email]));

  const params = { tipo: f.tipo, accion: f.accion, actor: f.actor, entidad: f.entidad };
  const filtered = Object.values(params).some(Boolean);

  return (
    <>
      <PageHeader
        title="Auditoría"
        subtitle="Registro de solo lectura de todo lo que se hace desde el panel: quién, cuándo, sobre qué y por qué. No se puede editar ni borrar."
      />

      <form className={s.filters} method="get" role="search" aria-label="Filtrar la auditoría">
        <label className={s.field}>
          Tipo
          <select name="tipo" defaultValue={f.tipo ?? ""}>
            <option value="">Todos</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Acción
          <input name="accion" defaultValue={f.accion ?? ""} maxLength={60} placeholder="suspend, set_role…" autoComplete="off" />
        </label>
        <label className={s.field}>
          Autor (ID)
          <input name="actor" defaultValue={f.actor ?? ""} maxLength={36} placeholder="UUID" autoComplete="off" spellCheck={false} />
        </label>
        <label className={`${s.field} ${s.fieldGrow}`}>
          Entidad (ID o slug)
          <input name="entidad" defaultValue={f.entidad ?? ""} maxLength={80} placeholder="UUID, a123, slug…" autoComplete="off" spellCheck={false} />
        </label>
        <div className={s.btnRow}>
          <button type="submit" className={s.btnPrimary}>
            Filtrar
          </button>
          {filtered && (
            <Link href="/admin/auditoria" className={s.btn}>
              Quitar filtros
            </Link>
          )}
        </div>
      </form>

      {f.invalid && (
        <Notice tone="warning">
          Algún filtro no tiene un formato válido y se ha ignorado (la acción solo admite minúsculas y «_»; el autor, un UUID).
        </Notice>
      )}

      {error ? (
        <Notice tone="error">{adminErrorText(error)}</Notice>
      ) : rows.length === 0 ? (
        <Empty title={filtered ? "Nada coincide con los filtros" : page > 1 ? "No hay más registros" : "Todavía no hay registros"}>
          {filtered || page > 1 ? <Link href="/admin/auditoria">Ver todo el registro</Link> : <p>Aparecerán aquí las acciones del panel.</p>}
        </Empty>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className="visually-hidden">Registro de auditoría, del más reciente al más antiguo</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Autor</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Entidad</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Cambios</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const href = entityHref(r.entity_type, r.entity_id);
                  return (
                    <tr key={r.id}>
                      <td data-label="Fecha" className={s.nowrap}>
                        {fmtDate(r.created_at, true)}
                      </td>
                      <td data-label="Autor">
                        {r.actor_id ? (
                          <Link href={`/admin/usuarios/${r.actor_id}`}>{emailOf.get(r.actor_id) ?? "Cuenta eliminada"}</Link>
                        ) : (
                          "Sistema"
                        )}
                      </td>
                      <td data-label="Acción">
                        {actionLabel(r.action)} <span className={s.small}>({r.action})</span>
                      </td>
                      <td data-label="Entidad">
                        {entityLabel(r.entity_type)}{" "}
                        {href ? (
                          <Link href={href} className={s.mono}>
                            {r.entity_id}
                          </Link>
                        ) : (
                          <span className={s.mono}>{r.entity_id}</span>
                        )}
                      </td>
                      <td data-label="Motivo">{r.reason || "—"}</td>
                      <td data-label="Cambios">
                        <AuditDiff before={r.before} after={r.after} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/auditoria" params={params} />
        </>
      )}
    </>
  );
}
