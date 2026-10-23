import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, Notice, PageHeader, Pager, adminStyles as s, fmtDate, pageParam } from "@/components/admin/ui";
import { ROLE_LABEL, ROLE_TONE, USER_STATUSES, parseUserFilters } from "@/components/admin/users/format";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Usuarios" };

const PAGE_SIZE = 25;

export default async function AdminUsers(props: PageProps<"/admin/usuarios">) {
  const { sb } = await requireAdminPage("/admin/usuarios");
  const sp = await props.searchParams;
  const { q, estado } = parseUserFilters(sp);
  const page = pageParam(sp.pagina);

  const { data, error } = await sb.rpc("admin_list_users", {
    p_search: q,
    p_status: estado,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  const total = rows[0]?.total_count ?? 0;
  const filtered = !!(q || estado);

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas registradas. Solo se muestran los datos necesarios para gestionarlas: nunca teléfonos."
      />

      <form className={s.filters} method="get" role="search" aria-label="Filtrar usuarios">
        <label className={`${s.field} ${s.fieldGrow}`}>
          Email o ID
          <input type="search" name="q" defaultValue={q ?? ""} maxLength={200} placeholder="nombre@correo.com o UUID" autoComplete="off" />
        </label>
        <label className={s.field}>
          Estado
          <select name="estado" defaultValue={estado ?? ""}>
            {USER_STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className={s.btnRow}>
          <button type="submit" className={s.btnPrimary}>
            Filtrar
          </button>
          {filtered && (
            <Link href="/admin/usuarios" className={s.btn}>
              Quitar filtros
            </Link>
          )}
        </div>
      </form>

      {error ? (
        <Notice tone="error">{adminErrorText(error)}</Notice>
      ) : rows.length === 0 ? (
        <Empty title={filtered ? "Ningún usuario coincide" : page > 1 ? "No hay más usuarios" : "Todavía no hay usuarios"}>
          {filtered ? <p>Prueba con otro email o quita los filtros.</p> : page > 1 ? <Link href="/admin/usuarios">Volver a la primera página</Link> : null}
        </Empty>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className="visually-hidden">Usuarios, del más reciente al más antiguo</caption>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Registro</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col" className={s.num}>
                    Anuncios
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Email">
                      <Link href={`/admin/usuarios/${u.id}`}>{u.email || "(sin email)"}</Link>
                    </td>
                    <td data-label="Nombre">{u.display_name || <span className={s.small}>—</span>}</td>
                    <td data-label="Rol">
                      <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td data-label="Estado">
                      {u.suspended_at ? <Badge tone="error">Suspendida</Badge> : <Badge tone="success">Activa</Badge>}
                    </td>
                    <td data-label="Registro" className={s.nowrap}>
                      {fmtDate(u.created_at)}
                    </td>
                    <td data-label="Último acceso" className={s.nowrap}>
                      {u.last_sign_in_at ? fmtDate(u.last_sign_in_at, true) : "Nunca"}
                    </td>
                    <td data-label="Anuncios" className={s.num}>
                      <span title="Activos / total">
                        {u.listings_active} / {u.listings_total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/usuarios" params={{ q, estado }} />
        </>
      )}
    </>
  );
}
