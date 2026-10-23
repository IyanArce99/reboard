import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAction } from "@/components/admin/AdminAction";
import { Badge, Empty, Notice, PageHeader, adminStyles as s, fmtDate } from "@/components/admin/ui";
import { AuditDiff } from "@/components/admin/users/AuditDiff";
import {
  LISTING_STATUS,
  MODERATION,
  ROLES,
  ROLE_LABEL,
  ROLE_TONE,
  actionLabel,
  banState,
  entityLabel,
  isUuid,
} from "@/components/admin/users/format";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { eur } from "@/lib/domain/format";
import { reactivateUser, setUserRole, suspendUser } from "./actions";

export const metadata: Metadata = { title: "Usuario" };

const LISTINGS_LIMIT = 100;
const HISTORY_LIMIT = 100;

interface HistoryEntry {
  key: string;
  at: string;
  actorId: string | null;
  action: string;
  subject: React.ReactNode;
  reason: string | null;
  before?: unknown;
  after?: unknown;
}

export default async function AdminUser(props: PageProps<"/admin/usuarios/[id]">) {
  const { id } = await props.params;
  const { sb, user: me } = await requireAdminPage(`/admin/usuarios/${id}`);
  if (!isUuid(id)) notFound();

  const { data: found, error } = await sb.rpc("admin_get_user", { p_user: id });
  if (error) return <Notice tone="error">{adminErrorText(error)}</Notice>;
  const u = found?.[0];
  if (!u) notFound();

  const [listingsRes, auditRes] = await Promise.all([
    sb
      .from("listings")
      .select("id, public_id, slug, status, moderation, size_label, price_eur, created_at, brand_text, brand:brands!listings_brand_id_fkey(name)", {
        count: "exact",
      })
      .eq("seller_id", id)
      .order("created_at", { ascending: false })
      .limit(LISTINGS_LIMIT),
    sb
      .from("admin_audit_log")
      .select("id, actor_id, action, entity_type, reason, before, after, created_at")
      .in("entity_type", ["user", "role"])
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);
  const listings = listingsRes.data ?? [];
  const byId = new Map(listings.map((l) => [l.id, l]));
  const { data: modActions } = listings.length
    ? await sb
        .from("moderation_actions")
        .select("id, listing_id, moderator_id, action, reason, created_at")
        .in("listing_id", listings.map((l) => l.id))
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT)
    : { data: [] };

  const title = (l: (typeof listings)[number]) => `${l.brand?.name ?? l.brand_text ?? "Sin marca"} ${l.size_label}`;

  const history: HistoryEntry[] = [
    ...(auditRes.data ?? []).map((a) => ({
      key: `a${a.id}`,
      at: a.created_at,
      actorId: a.actor_id,
      action: actionLabel(a.action),
      subject: entityLabel(a.entity_type),
      reason: a.reason,
      before: a.before,
      after: a.after,
    })),
    ...(modActions ?? []).map((m) => {
      const l = byId.get(m.listing_id);
      return {
        key: `m${m.id}`,
        at: m.created_at,
        actorId: m.moderator_id,
        action: actionLabel(m.action),
        subject: l?.public_id ? <Link href={`/admin/anuncios/${l.public_id}`}>Anuncio {title(l)}</Link> : "Anuncio",
        reason: m.reason,
      };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const actorIds = [...new Set(history.map((h) => h.actorId).filter((v): v is string => !!v))];
  const { data: emails } = actorIds.length ? await sb.rpc("admin_user_emails", { p_ids: actorIds }) : { data: [] };
  const emailOf = new Map((emails ?? []).map((e) => [e.id, e.email]));

  const isMe = u.id === me.id;
  const suspended = !!u.suspended_at;
  const { blocked: authBlocked, forever: bannedForever } = banState(u.banned_until);

  return (
    <>
      <PageHeader
        title={u.display_name || u.email || "Usuario"}
        subtitle={u.display_name ? u.email : undefined}
        crumbs={[{ href: "/admin/usuarios", label: "Usuarios" }]}
        actions={
          <>
            <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
            {suspended ? <Badge tone="error">Suspendida</Badge> : <Badge tone="success">Activa</Badge>}
          </>
        }
      />

      {suspended && !authBlocked && (
        <Notice tone="warning">
          La cuenta está suspendida en la base de datos (no puede publicar, reportar ni subir fotos), pero el inicio de sesión no está
          bloqueado. Usa «Reintentar bloqueo de acceso».
        </Notice>
      )}
      {!suspended && authBlocked && (
        <Notice tone="warning">
          La cuenta está activa, pero el inicio de sesión sigue bloqueado. Usa «Reintentar desbloqueo de acceso».
        </Notice>
      )}

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="h-data">
          <h2 id="h-data" className={s.cardTitle}>
            Datos de la cuenta
          </h2>
          <dl className={s.dl}>
            <dt>Email</dt>
            <dd>
              {u.email || "—"} {u.email_confirmed ? null : <Badge tone="warning">Sin confirmar</Badge>}
            </dd>
            <dt>Nombre</dt>
            <dd>{u.display_name || "—"}</dd>
            <dt>ID</dt>
            <dd className={s.mono}>{u.id}</dd>
            <dt>Tipo de vendedor</dt>
            <dd>{u.seller_type ?? "—"}</dd>
            <dt>Registro</dt>
            <dd>{fmtDate(u.created_at, true)}</dd>
            <dt>Último acceso</dt>
            <dd>{u.last_sign_in_at ? fmtDate(u.last_sign_in_at, true) : "Nunca"}</dd>
            <dt>Segundo factor</dt>
            <dd>{u.has_mfa ? "Sí" : "No"}</dd>
          </dl>
        </section>

        <section className={s.card} aria-labelledby="h-status">
          <h2 id="h-status" className={s.cardTitle}>
            Estado
          </h2>
          <dl className={s.dl}>
            <dt>Estado</dt>
            <dd>{suspended ? `Suspendida desde ${fmtDate(u.suspended_at, true)}` : "Activa"}</dd>
            {suspended && (
              <>
                <dt>Motivo</dt>
                <dd>{u.suspension_reason || "—"}</dd>
              </>
            )}
            <dt>Inicio de sesión</dt>
            <dd>{authBlocked ? (bannedForever ? "Bloqueado (indefinido)" : `Bloqueado hasta ${fmtDate(u.banned_until, true)}`) : "Permitido"}</dd>
          </dl>

          <div className={s.btnRow} style={{ marginTop: 14 }}>
            {isMe ? (
              <p className={s.small}>Es tu cuenta: otro administrador debe suspenderla o cambiar su rol.</p>
            ) : suspended ? (
              <>
                <AdminAction
                  label="Reactivar cuenta"
                  title="Reactivar la cuenta"
                  description="Podrá volver a entrar, publicar y reportar. Sus anuncios ocultos siguen ocultos: restáuralos uno a uno desde Anuncios."
                  action={reactivateUser.bind(null, u.id)}
                  tone="primary"
                />
                {!authBlocked && (
                  <AdminAction
                    label="Reintentar bloqueo de acceso"
                    title="Bloquear el inicio de sesión"
                    description="La cuenta ya está suspendida. Esto vuelve a intentar bloquear el inicio de sesión y la renovación de sesiones."
                    action={suspendUser.bind(null, u.id)}
                    tone="danger"
                    confirmLabel="Bloquear acceso"
                  />
                )}
              </>
            ) : (
              <>
                <AdminAction
                  label="Suspender cuenta"
                  title="Suspender la cuenta"
                  description="No podrá entrar, publicar, reportar ni subir fotos. No se borra nada. Puedes reactivarla después."
                  action={suspendUser.bind(null, u.id)}
                  tone="danger"
                  confirmLabel="Suspender"
                  option={{ label: "Ocultar también sus anuncios publicados" }}
                />
                {authBlocked && (
                  <AdminAction
                    label="Reintentar desbloqueo de acceso"
                    title="Desbloquear el inicio de sesión"
                    description="La cuenta está activa. Esto vuelve a intentar desbloquear el inicio de sesión."
                    action={reactivateUser.bind(null, u.id)}
                    confirmLabel="Desbloquear acceso"
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {!isMe && (
        <section className={s.card} aria-labelledby="h-role">
          <h2 id="h-role" className={s.cardTitle}>
            Rol
          </h2>
          <p className={s.muted}>
            Rol actual: <strong>{ROLE_LABEL[u.role]}</strong>. Moderación revisa reportes y anuncios; Administración tiene acceso a todo
            el panel. Debe quedar al menos un administrador activo: el último no se puede degradar.
          </p>
          <div className={s.btnRow} style={{ marginTop: 10 }}>
            {ROLES.filter((r) => r !== u.role).map((r) => (
              <AdminAction
                key={r}
                label={r === "user" ? "Quitar rol del equipo" : `Hacer ${ROLE_LABEL[r].toLowerCase()}`}
                title={`Cambiar el rol a «${ROLE_LABEL[r]}»`}
                description={
                  r === "admin"
                    ? "Tendrá acceso completo al panel, incluidas cuentas, roles y configuración."
                    : r === "moderator"
                      ? "Podrá revisar reportes y moderar anuncios."
                      : "Perderá el acceso a moderación y administración."
                }
                action={setUserRole.bind(null, u.id, r)}
                tone={r === "user" || u.role === "admin" ? "danger" : "default"}
                confirmLabel="Cambiar rol"
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="h-listings">
        <h2 id="h-listings" className={s.cardTitle}>
          Anuncios ({(listingsRes.count ?? listings.length).toLocaleString("es-ES")})
        </h2>
        {listingsRes.error ? (
          <Notice tone="error">{adminErrorText(listingsRes.error)}</Notice>
        ) : listings.length === 0 ? (
          <Empty title="Sin anuncios">Esta cuenta no ha creado ningún anuncio.</Empty>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className="visually-hidden">Anuncios de la cuenta, del más reciente al más antiguo</caption>
              <thead>
                <tr>
                  <th scope="col">Anuncio</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Moderación</th>
                  <th scope="col" className={s.num}>
                    Precio
                  </th>
                  <th scope="col">Creado</th>
                  <th scope="col">Pública</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const st = LISTING_STATUS[l.status];
                  const mod = MODERATION[l.moderation];
                  return (
                    <tr key={l.id}>
                      <td data-label="Anuncio">
                        {l.public_id ? <Link href={`/admin/anuncios/${l.public_id}`}>{title(l)}</Link> : title(l)}{" "}
                        <span className={s.mono}>{l.public_id}</span>
                      </td>
                      <td data-label="Estado">
                        <Badge tone={st?.tone}>{st?.label ?? l.status}</Badge>
                      </td>
                      <td data-label="Moderación">
                        <Badge tone={mod?.tone}>{mod?.label ?? l.moderation}</Badge>
                      </td>
                      <td data-label="Precio" className={s.num}>
                        {eur(l.price_eur)}
                      </td>
                      <td data-label="Creado" className={s.nowrap}>
                        {fmtDate(l.created_at)}
                      </td>
                      <td data-label="Pública">
                        {l.public_id && l.status !== "draft" ? (
                          <Link href={`/anuncio/${l.slug}-${l.public_id}`} target="_blank" rel="noopener">
                            Ver<span className="visually-hidden"> anuncio público (se abre en otra pestaña)</span>
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {(listingsRes.count ?? 0) > LISTINGS_LIMIT && (
          <p className={s.small}>Se muestran los {LISTINGS_LIMIT} más recientes.</p>
        )}
      </section>

      <section aria-labelledby="h-history">
        <h2 id="h-history" className={s.cardTitle}>
          Historial de moderación
        </h2>
        {auditRes.error ? (
          <Notice tone="error">{adminErrorText(auditRes.error)}</Notice>
        ) : history.length === 0 ? (
          <Empty title="Sin historial">No hay acciones de moderación ni de administración sobre esta cuenta.</Empty>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className="visually-hidden">Acciones sobre la cuenta y sus anuncios, de la más reciente a la más antigua</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Sobre</th>
                  <th scope="col">Quién</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Cambios</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.key}>
                    <td data-label="Fecha" className={s.nowrap}>
                      {fmtDate(h.at, true)}
                    </td>
                    <td data-label="Acción">{h.action}</td>
                    <td data-label="Sobre">{h.subject}</td>
                    <td data-label="Quién">
                      {h.actorId ? (
                        <Link href={`/admin/usuarios/${h.actorId}`}>{emailOf.get(h.actorId) ?? "Cuenta eliminada"}</Link>
                      ) : (
                        "Sistema"
                      )}
                    </td>
                    <td data-label="Motivo">{h.reason || "—"}</td>
                    <td data-label="Cambios">
                      <AuditDiff before={h.before} after={h.after} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={s.small}>
          <Link href={`/admin/auditoria?entidad=${u.id}`}>Ver en la auditoría completa</Link>
        </p>
      </section>
    </>
  );
}
