import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAction } from "@/components/admin/AdminAction";
import { ShopForm } from "@/components/admin/catalog/forms";
import { SHOP_STATUS_INFO, idSchema, isShopStatus, type ShopStatus } from "@/components/admin/catalog/schema";
import { Badge, Notice, PageHeader, adminStyles as s, fmtDate } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { setShopStatus, updateShop } from "../actions";

export const metadata: Metadata = { title: "Tienda o escuela" };

const LISTING_STATUS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  sold: "Vendido",
  expired: "Caducado",
  withdrawn: "Retirado",
};

/** Botones de estado según el actual: aprobar, rechazar, suspender, reactivar o volver a pendiente. */
const TRANSITIONS: Record<ShopStatus, { to: ShopStatus; label: string; tone: "primary" | "danger" | "default"; reason: "required" | "optional" }[]> = {
  pending: [
    { to: "approved", label: "Aprobar", tone: "primary", reason: "optional" },
    { to: "rejected", label: "Rechazar", tone: "danger", reason: "required" },
  ],
  approved: [{ to: "suspended", label: "Suspender", tone: "danger", reason: "required" }],
  rejected: [
    { to: "approved", label: "Aprobar", tone: "primary", reason: "optional" },
    { to: "pending", label: "Volver a pendiente", tone: "default", reason: "optional" },
  ],
  suspended: [{ to: "approved", label: "Reactivar", tone: "primary", reason: "optional" }],
};

const DESCRIPTION: Record<ShopStatus, string> = {
  approved: "Será pública en el directorio y en las fichas de sus anuncios.",
  rejected: "No será pública. El motivo queda en la auditoría.",
  suspended: "Dejará de ser pública de inmediato. Sus anuncios no se ocultan (se gestionan en Anuncios).",
  pending: "No será pública hasta que la apruebes.",
};

export default async function AdminShop(props: PageProps<"/admin/tiendas/[id]">) {
  const { id: raw } = await props.params;
  const { sb } = await requireAdminPage(`/admin/tiendas/${encodeURIComponent(raw)}`);
  const id = idSchema.safeParse(raw);
  if (!id.success) notFound();

  const [shopRes, zonesRes] = await Promise.all([
    sb.from("shops").select("*").eq("id", id.data).maybeSingle(),
    sb.from("zones").select("slug, name").order("sort_order"),
  ]);
  if (shopRes.error) return <Notice tone="error">{adminErrorText(shopRes.error)}</Notice>;
  const shop = shopRes.data;
  if (!shop) notFound();
  const status: ShopStatus = isShopStatus(shop.status) ? shop.status : "pending";
  const info = SHOP_STATUS_INFO[status];

  // Anuncios de la cuenta vinculada (shops.profile_id → listings.seller_id), en cualquier estado.
  const listings = shop.profile_id
    ? await sb
        .from("listings")
        .select("public_id, slug, status, moderation, price_eur, size_label, created_at, brand:brands!listings_brand_id_fkey(name), model:board_models!listings_model_id_fkey(name), brand_text, model_text")
        .eq("seller_id", shop.profile_id)
        .order("created_at", { ascending: false })
        .limit(100)
    : null;

  return (
    <>
      <PageHeader
        title={shop.name}
        crumbs={[
          { href: "/admin", label: "Panel" },
          { href: "/admin/tiendas", label: "Tiendas y escuelas" },
        ]}
        subtitle={
          <>
            <span className={s.mono}>{shop.slug}</span> · {shop.type === "escuela" ? "Escuela" : "Tienda"} · creada el {fmtDate(shop.created_at)}
          </>
        }
        actions={
          <span className={s.btnRow}>
            {TRANSITIONS[status].map((t) => (
              <AdminAction
                key={t.to}
                label={t.label}
                title={`${t.label}: ${shop.name}`}
                description={DESCRIPTION[t.to]}
                action={setShopStatus.bind(null, shop.id, t.to)}
                reason={t.reason}
                tone={t.tone}
              />
            ))}
          </span>
        }
      />

      <section className={s.card} aria-labelledby="h-status">
        <h2 id="h-status" className={s.cardTitle}>
          Estado
        </h2>
        <dl className={s.dl}>
          <dt>Estado</dt>
          <dd>
            <Badge tone={info.tone}>{info.label}</Badge> {status === "approved" ? "· pública" : "· no pública"}
          </dd>
          <dt>Motivo</dt>
          <dd>{shop.status_reason ?? "—"}</dd>
          <dt>Revisada</dt>
          <dd>{fmtDate(shop.reviewed_at, true)}</dd>
          <dt>Cuenta vinculada</dt>
          <dd>{shop.profile_id ? <span className={s.mono}>{shop.profile_id}</span> : "Sin cuenta (no publica anuncios propios)"}</dd>
        </dl>
        {status === "approved" && (
          <p className={s.small}>
            <Link href={`/tiendas/${shop.slug}`}>Ver la ficha pública</Link>
          </p>
        )}
      </section>

      <section className={s.card} aria-labelledby="h-edit">
        <h2 id="h-edit" className={s.cardTitle}>
          Datos públicos
        </h2>
        <ShopForm
          action={updateShop.bind(null, shop.id)}
          zones={zonesRes.data ?? []}
          submitLabel="Guardar cambios"
          values={{
            name: shop.name,
            slug: shop.slug,
            type: shop.type,
            zone_slug: shop.zone_slug,
            town: shop.town,
            address: shop.address,
            hours: shop.hours,
            inventory_source: shop.inventory_source,
          }}
        />
      </section>

      <section className={s.card} aria-labelledby="h-listings">
        <h2 id="h-listings" className={s.cardTitle}>
          Anuncios de la cuenta
        </h2>
        {!shop.profile_id ? (
          <p className={s.muted}>Sin cuenta vinculada: no tiene anuncios propios.</p>
        ) : listings?.error ? (
          <Notice tone="error">{adminErrorText(listings.error)}</Notice>
        ) : !listings?.data?.length ? (
          <p className={s.muted}>La cuenta todavía no tiene anuncios.</p>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className="visually-hidden">Anuncios de la tienda, del más reciente al más antiguo</caption>
              <thead>
                <tr>
                  <th scope="col">Anuncio</th>
                  <th scope="col">Estado</th>
                  <th scope="col" className={s.num}>
                    Precio
                  </th>
                  <th scope="col">Creado</th>
                </tr>
              </thead>
              <tbody>
                {listings.data.map((l) => (
                  <tr key={l.public_id}>
                    <td data-label="Anuncio">
                      <Link href={`/admin/anuncios/${l.public_id}`}>
                        {[l.brand?.name ?? l.brand_text, l.model?.name ?? l.model_text].filter(Boolean).join(" ") || "Sin marca"} · {l.size_label}
                      </Link>
                    </td>
                    <td data-label="Estado">
                      <span className={s.btnRow}>
                        <Badge>{LISTING_STATUS[l.status] ?? l.status}</Badge>
                        {l.moderation === "flagged" && <Badge tone="warning">En revisión</Badge>}
                        {l.moderation === "removed" && <Badge tone="error">Oculto</Badge>}
                      </span>
                    </td>
                    <td data-label="Precio" className={s.num}>
                      {l.price_eur.toLocaleString("es-ES")} €
                    </td>
                    <td data-label="Creado" className={s.nowrap}>
                      {fmtDate(l.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
