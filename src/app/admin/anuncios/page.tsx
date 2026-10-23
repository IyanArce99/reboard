import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, Notice, PageHeader, Pager, adminStyles as s, fmtDate, pageParam } from "@/components/admin/ui";
import {
  DB_STATUS_LABEL,
  DB_STATUS_TONE,
  LISTINGS_PAGE_SIZE,
  LISTING_STATUSES,
  MODERATION_FILTERS,
  MODERATION_FILTER_LABEL,
  MODERATION_VIEW,
  SHAPE_OPTIONS,
  filtersToParams,
  hasFilters,
  moderationView,
  nextDay,
  parseListingFilters,
  parseSearch,
  textSearchOr,
} from "@/components/admin/listings/model";
import { lastHideOrRemove, listingTitle, openReportCounts } from "@/components/admin/listings/queries";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Anuncios" };

const eur = (n: number) => `${n.toLocaleString("es-ES")} €`;

export default async function AdminListingsPage(props: PageProps<"/admin/anuncios">) {
  const { sb } = await requireAdminPage("/admin/anuncios");
  const sp = await props.searchParams;
  const f = parseListingFilters(sp);
  const page = pageParam(sp.pagina);
  const search = parseSearch(f.q);

  // Búsqueda por marca del catálogo: una consulta previa a brands (sin N+1).
  let brandIds: number[] = [];
  if (search?.kind === "text") {
    const { data } = await sb.from("brands").select("id").ilike("name", `%${search.text}%`).limit(200);
    brandIds = (data ?? []).map((b) => b.id);
  }

  let q = sb
    .from("listings")
    .select(
      "id, public_id, slug, status, moderation, size_label, price_eur, zone_slug, town, created_at, seller_id, brand_text, brand:brands!listings_brand_id_fkey(name), zone:zones!listings_zone_slug_fkey(name), seller:profiles!listings_seller_id_fkey(display_name)",
      { count: "exact" },
    );
  if (f.estado) q = q.eq("status", f.estado);
  if (f.moderacion) q = q.eq("moderation", f.moderacion);
  if (f.tipo) q = q.eq("shape", f.tipo);
  if (f.zona) q = q.eq("zone_slug", f.zona);
  if (f.desde) q = q.gte("created_at", `${f.desde}T00:00:00Z`);
  if (f.hasta) q = q.lt("created_at", `${nextDay(f.hasta)}T00:00:00Z`);
  if (f.vendedor) q = q.eq("seller_id", f.vendedor);
  if (search?.kind === "id") q = q.eq("id", search.id);
  if (search?.kind === "text") q = q.or(textSearchOr(search.text, brandIds));

  const from = (page - 1) * LISTINGS_PAGE_SIZE;
  const [{ data: rows, count, error }, { data: zones }] = await Promise.all([
    q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, from + LISTINGS_PAGE_SIZE - 1),
    sb.from("zones").select("slug, name").order("sort_order").order("name"),
  ]);
  if (error) return <Notice tone="error">{adminErrorText(error)}</Notice>;

  const list = rows ?? [];
  const ids = list.map((l) => l.id);
  const [reports, hr] = await Promise.all([
    openReportCounts(sb, ids),
    lastHideOrRemove(
      sb,
      list.filter((l) => l.moderation === "removed").map((l) => l.id),
    ),
  ]);
  const params = filtersToParams(f);

  return (
    <>
      <PageHeader title="Anuncios" subtitle="Todos los anuncios, también borradores, ocultos y retirados. Las medidas no se editan desde aquí." />

      <form className={s.filters} method="get" action="/admin/anuncios" role="search" aria-label="Filtrar anuncios">
        <label className={`${s.field} ${s.fieldGrow}`}>
          Buscar
          <input type="search" name="q" defaultValue={f.q ?? ""} placeholder="a100123, marca o texto" maxLength={60} />
        </label>
        <label className={s.field}>
          Estado
          <select name="estado" defaultValue={f.estado ?? ""}>
            <option value="">Todos</option>
            {LISTING_STATUSES.map((v) => (
              <option key={v} value={v}>
                {DB_STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Moderación
          <select name="moderacion" defaultValue={f.moderacion ?? ""}>
            <option value="">Cualquiera</option>
            {MODERATION_FILTERS.map((v) => (
              <option key={v} value={v}>
                {MODERATION_FILTER_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Tipo
          <select name="tipo" defaultValue={f.tipo ?? ""}>
            <option value="">Todos</option>
            {SHAPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Zona
          <select name="zona" defaultValue={f.zona ?? ""}>
            <option value="">Todas</option>
            {(zones ?? []).map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Creado desde
          <input type="date" name="desde" defaultValue={f.desde ?? ""} />
        </label>
        <label className={s.field}>
          Hasta
          <input type="date" name="hasta" defaultValue={f.hasta ?? ""} />
        </label>
        {f.vendedor && <input type="hidden" name="vendedor" value={f.vendedor} />}
        <div className={s.btnRow}>
          <button type="submit" className={s.btnPrimary}>
            Filtrar
          </button>
          {hasFilters(f) && (
            <Link href="/admin/anuncios" className={s.btn}>
              Quitar filtros
            </Link>
          )}
        </div>
      </form>

      {f.vendedor && (
        <Notice>
          Solo anuncios del vendedor <Link href={`/admin/usuarios/${f.vendedor}`}>{f.vendedor.slice(0, 8)}…</Link>.
        </Notice>
      )}

      {list.length === 0 ? (
        <Empty title={hasFilters(f) ? "Ningún anuncio coincide con los filtros" : "Todavía no hay anuncios"}>
          {hasFilters(f) ? <Link href="/admin/anuncios">Ver todos los anuncios</Link> : "Aparecerán aquí en cuanto alguien publique."}
        </Empty>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className="visually-hidden">Anuncios</caption>
            <thead>
              <tr>
                <th scope="col">Id</th>
                <th scope="col">Tabla</th>
                <th scope="col">Estado</th>
                <th scope="col" className={s.num}>
                  Precio
                </th>
                <th scope="col">Zona</th>
                <th scope="col">Creado</th>
                <th scope="col" className={s.num}>
                  Reportes
                </th>
                <th scope="col">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const pid = l.public_id ?? `a${l.id}`;
                const view = MODERATION_VIEW[moderationView(l.moderation, hr.get(l.id))];
                const open = reports.get(l.id) ?? 0;
                return (
                  <tr key={l.id}>
                    <td data-label="Id" className={s.mono}>
                      <Link href={`/admin/anuncios/${pid}`}>{pid}</Link>
                    </td>
                    <td data-label="Tabla">
                      <Link href={`/admin/anuncios/${pid}`}>{listingTitle(l)}</Link>
                    </td>
                    <td data-label="Estado">
                      <span className={s.btnRow}>
                        <Badge tone={DB_STATUS_TONE[l.status]}>{DB_STATUS_LABEL[l.status]}</Badge>
                        {l.moderation !== "visible" && <Badge tone={view.tone}>{view.label}</Badge>}
                      </span>
                    </td>
                    <td data-label="Precio" className={s.num}>
                      {eur(l.price_eur)}
                    </td>
                    <td data-label="Zona">
                      {l.zone?.name ?? l.zone_slug} · {l.town}
                    </td>
                    <td data-label="Creado" className={s.nowrap}>
                      {fmtDate(l.created_at)}
                    </td>
                    <td data-label="Reportes" className={s.num}>
                      {open > 0 ? <Badge tone="warning">{open}</Badge> : "0"}
                    </td>
                    <td data-label="Vendedor">
                      <Link href={`/admin/usuarios/${l.seller_id}`}>{l.seller?.display_name ?? `${l.seller_id.slice(0, 8)}…`}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pageSize={LISTINGS_PAGE_SIZE} total={count ?? 0} basePath="/admin/anuncios" params={params} />
    </>
  );
}
