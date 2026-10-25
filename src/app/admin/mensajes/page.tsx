import type { Metadata } from "next";
import { Badge, Empty, Notice, PageHeader, Pager, adminStyles as s, fmtDate, pageParam, str } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { contactTopicLabel } from "@/lib/contact/topics";
import { setContactMessageStatus } from "./actions";

export const metadata: Metadata = { title: "Mensajes" };

const PAGE_SIZE = 20;

export default async function AdminMessagesPage(props: PageProps<"/admin/mensajes">) {
  const { sb } = await requireAdminPage("/admin/mensajes");
  const sp = await props.searchParams;
  const estado = str(sp.estado) === "atendidos" ? "done" : "new";
  const page = pageParam(sp.pagina);

  const { data, error, count } = await sb
    .from("contact_messages")
    .select("id, topic, email, message, status, created_at, handled_at, user_id", { count: "exact" })
    .eq("status", estado)
    .order("created_at", { ascending: estado === "new" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) return <Notice tone="error">{adminErrorText(error)}</Notice>;

  return (
    <>
      <PageHeader
        title="Mensajes"
        subtitle="Lo que llega por el formulario de /contacto. Responde por email y márcalo como atendido. Se borran solos a los 12 meses."
      />

      <form className={s.filters} method="get" action="/admin/mensajes" aria-label="Filtrar mensajes">
        <label className={s.field}>
          Estado
          <select name="estado" defaultValue={estado === "done" ? "atendidos" : "pendientes"}>
            <option value="pendientes">Pendientes</option>
            <option value="atendidos">Atendidos</option>
          </select>
        </label>
        <button type="submit" className={s.btnPrimary}>
          Filtrar
        </button>
      </form>

      {!data?.length ? (
        <Empty title={estado === "new" ? "No hay mensajes pendientes" : "No hay mensajes atendidos"}>
          {estado === "new" ? "Cuando alguien escriba desde /contacto, aparecerá aquí (y te llegará un aviso por email)." : null}
        </Empty>
      ) : (
        data.map((m) => {
          const reply = `mailto:${m.email}?subject=${encodeURIComponent("Re: tu mensaje a Reboard")}`;
          return (
            <article key={m.id} className={s.card} aria-labelledby={`m-${m.id}`}>
              <div className={s.cardHead}>
                <h2 id={`m-${m.id}`} className={s.cardTitle}>
                  {contactTopicLabel(m.topic)}
                </h2>
                <span className={s.btnRow}>
                  {m.user_id && <Badge>Con cuenta</Badge>}
                  <Badge tone={m.status === "new" ? "warning" : "success"}>{m.status === "new" ? "Pendiente" : "Atendido"}</Badge>
                </span>
              </div>
              <p className={s.small}>
                {fmtDate(m.created_at, true)} · <a href={reply}>{m.email}</a>
                {m.handled_at ? ` · atendido el ${fmtDate(m.handled_at, true)}` : ""}
              </p>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5 }}>{m.message}</p>
              <div className={s.btnRow}>
                <a href={reply} className={s.btnPrimary}>
                  Responder por email
                </a>
                <form action={setContactMessageStatus}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={m.status === "new" ? "done" : "new"} />
                  <button type="submit" className={s.btnGhost}>
                    {m.status === "new" ? "Marcar como atendido" : "Volver a pendientes"}
                  </button>
                </form>
              </div>
            </article>
          );
        })
      )}

      <Pager page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/mensajes" params={{ estado: estado === "done" ? "atendidos" : undefined }} />
    </>
  );
}
