import type { Metadata } from "next";
import Link from "next/link";
import { ShopForm, catalogStyles as c } from "@/components/admin/catalog/forms";
import { SHOP_STATUSES, SHOP_STATUS_INFO, isShopStatus, normalizeName } from "@/components/admin/catalog/schema";
import { Badge, Empty, Notice, PageHeader, Stat, adminStyles as s, fmtDate, str } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { createShop } from "./actions";

export const metadata: Metadata = { title: "Tiendas y escuelas" };

export default async function AdminShops(props: PageProps<"/admin/tiendas">) {
  const { sb } = await requireAdminPage("/admin/tiendas");
  const sp = await props.searchParams;
  const estadoRaw = str(sp.estado);
  const estado = isShopStatus(estadoRaw) ? estadoRaw : undefined;
  const q = str(sp.q)?.slice(0, 80);

  const [shopsRes, zonesRes] = await Promise.all([
    sb.from("shops").select("id, slug, name, type, zone_slug, town, status, status_reason, reviewed_at, profile_id, created_at").order("name").limit(2000),
    sb.from("zones").select("slug, name").order("sort_order"),
  ]);
  if (shopsRes.error) return <Notice tone="error">{adminErrorText(shopsRes.error)}</Notice>;
  const all = shopsRes.data ?? [];
  const zones = zonesRes.data ?? [];
  const zoneName = new Map(zones.map((z) => [z.slug, z.name]));
  const counts = Object.fromEntries(SHOP_STATUSES.map((st) => [st, all.filter((x) => x.status === st).length])) as Record<string, number>;
  const nq = q ? normalizeName(q) : "";
  const rows = all.filter(
    (x) => (!estado || x.status === estado) && (!nq || normalizeName(x.name).includes(nq) || normalizeName(x.town).includes(nq)),
  );
  const filtered = Boolean(estado || q);

  return (
    <>
      <PageHeader
        title="Tiendas y escuelas"
        subtitle="Directorio público: solo se muestran las aprobadas (lo impone la base de datos). Las demás solo las ve el equipo."
      />
      <Notice>
        Las tiendas todavía no pueden darse de alta por su cuenta: las fichas las crea el equipo aquí con datos que la tienda haya
        confirmado. No inventes horarios, direcciones ni inventario.
      </Notice>

      <nav className={s.stats} aria-label="Filtrar por estado">
        {SHOP_STATUSES.map((st) => (
          <Stat
            key={st}
            label={SHOP_STATUS_INFO[st].label}
            value={counts[st] ?? 0}
            href={estado === st ? "/admin/tiendas" : `/admin/tiendas?estado=${st}`}
            tone={st === "pending" && counts[st] > 0 ? "warning" : undefined}
            hint={estado === st ? "Filtro aplicado · quitar" : undefined}
          />
        ))}
      </nav>

      <details className={`${s.card} ${c.disclosure}`}>
        <summary>Nueva tienda o escuela</summary>
        <p className={s.muted}>Se crea como pendiente: no es pública hasta que la apruebes.</p>
        <ShopForm action={createShop} zones={zones} submitLabel="Crear" />
      </details>

      <form className={s.filters} method="get" role="search" aria-label="Filtrar tiendas">
        <label className={`${s.field} ${s.fieldGrow}`}>
          Buscar
          <input type="search" name="q" defaultValue={q ?? ""} maxLength={80} placeholder="Nombre o localidad" autoComplete="off" />
        </label>
        <label className={s.field}>
          Estado
          <select name="estado" defaultValue={estado ?? ""}>
            <option value="">Todos</option>
            {SHOP_STATUSES.map((st) => (
              <option key={st} value={st}>
                {SHOP_STATUS_INFO[st].label}
              </option>
            ))}
          </select>
        </label>
        <div className={s.btnRow}>
          <button type="submit" className={s.btnPrimary}>
            Filtrar
          </button>
          {filtered && (
            <Link href="/admin/tiendas" className={s.btn}>
              Quitar filtros
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty title={filtered ? "Ninguna coincide" : "Todavía no hay tiendas ni escuelas"}>
          {filtered ? <p>Prueba con otro filtro.</p> : <p>Cuando una tienda real confirme sus datos, créala con «Nueva tienda o escuela».</p>}
        </Empty>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className="visually-hidden">Tiendas y escuelas por nombre</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Tipo</th>
                <th scope="col">Zona</th>
                <th scope="col">Estado</th>
                <th scope="col">Cuenta</th>
                <th scope="col">Revisada</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const info = isShopStatus(x.status) ? SHOP_STATUS_INFO[x.status] : { label: x.status, tone: "neutral" as const };
                return (
                  <tr key={x.id}>
                    <td data-label="Nombre">
                      <Link href={`/admin/tiendas/${x.id}`}>{x.name}</Link>
                      <div className={s.mono}>{x.slug}</div>
                    </td>
                    <td data-label="Tipo">{x.type === "escuela" ? "Escuela" : "Tienda"}</td>
                    <td data-label="Zona">
                      {x.town} · {zoneName.get(x.zone_slug) ?? x.zone_slug}
                    </td>
                    <td data-label="Estado">
                      <Badge tone={info.tone}>{info.label}</Badge>
                    </td>
                    <td data-label="Cuenta">{x.profile_id ? "Vinculada" : "Sin cuenta"}</td>
                    <td data-label="Revisada" className={s.nowrap}>
                      {fmtDate(x.reviewed_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
