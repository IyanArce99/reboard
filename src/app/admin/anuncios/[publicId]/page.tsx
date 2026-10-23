import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Badge, Empty, Notice, PageHeader, adminStyles as s, fmtDate } from "@/components/admin/ui";
import { EditTextsForm } from "@/components/admin/listings/EditTextsForm";
import { ListingActions } from "@/components/admin/listings/ListingActions";
import ls from "@/components/admin/listings/Listings.module.css";
import {
  DB_STATUS_LABEL,
  DB_STATUS_TONE,
  MODERATION_VIEW,
  REPORT_STATUS_ONE,
  moderationView,
  lastHideOrRemoveByListing,
} from "@/components/admin/listings/model";
import { listingTitle, publicListingPath, userEmails } from "@/components/admin/listings/queries";
import { MODERATION_ACTION_LABEL, REPORT_REASON_LABEL } from "@/components/moderation/labels";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { listingDbId } from "@/lib/auth/shared";
import { CONDITION_LABEL, CONSTRUCTION_INFO, SELLER_LABEL, SHAPE_INFO } from "@/lib/domain/taxonomy";
import { photoUrl } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Anuncio" };

const SOURCE: Record<string, string> = { seller: "vendedor", manufacturer: "fabricante" };
const CONTACT: Record<string, string> = { whatsapp: "WhatsApp", phone: "Llamada de teléfono" };

const inches = (n: number | null) => (n == null ? null : `${Number(n).toLocaleString("es-ES", { maximumFractionDigits: 3 })}″`);

export default async function AdminListingPage(props: PageProps<"/admin/anuncios/[publicId]">) {
  const { publicId } = await props.params;
  const { sb } = await requireAdminPage(`/admin/anuncios/${encodeURIComponent(publicId)}`);
  const id = listingDbId(publicId);
  if (id == null) notFound();

  const [{ data: l, error }, { data: photos }, { data: reports }, { data: history }] = await Promise.all([
    sb
      .from("listings")
      .select(
        "*, brand:brands!listings_brand_id_fkey(name, slug), model:board_models!listings_model_id_fkey(name), zone:zones!listings_zone_slug_fkey(name), seller:profiles!listings_seller_id_fkey(display_name, seller_type)",
      )
      .eq("id", id)
      .maybeSingle(),
    sb.from("listing_photos").select("id, storage_path, position, label, width, height").eq("listing_id", id).order("position"),
    sb
      .from("reports")
      .select("id, reason, details, status, created_at, reporter_id, resolved_at, resolved_by")
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("moderation_actions")
      .select("id, action, reason, created_at, moderator_id")
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (error) return <Notice tone="error">{adminErrorText(error)}</Notice>;
  if (!l) notFound();

  const pid = l.public_id ?? publicId;
  const emails = await userEmails(sb, [...(history ?? []).map((h) => h.moderator_id), ...(reports ?? []).map((r) => r.resolved_by)]);
  const view = moderationView(l.moderation, lastHideOrRemoveByListing((history ?? []).map((h) => ({ listing_id: id, action: h.action }))).get(id));
  const v = MODERATION_VIEW[view];
  const openReports = (reports ?? []).filter((r) => r.status === "open").length;
  const isPublic = ["published", "sold", "expired"].includes(l.status) && l.moderation !== "removed";
  const title = listingTitle(l);
  const who = (uid: string | null) => (uid ? (emails.get(uid) ?? `${uid.slice(0, 8)}…`) : "—");

  const tech: [string, string | null, string | null][] = [
    ["Medida", l.size_label, null],
    ["Largo", inches(l.length_in), l.length_source],
    ["Ancho", inches(l.width_in), l.width_source],
    ["Grosor", inches(l.thickness_in), l.thickness_source],
    ["Volumen", l.volume_l == null ? null : `${Number(l.volume_l).toLocaleString("es-ES")} L`, l.volume_source],
    ["Forma", SHAPE_INFO[l.shape]?.label ?? l.shape, l.shape_source],
    ["Construcción", CONSTRUCTION_INFO[l.construction]?.label ?? l.construction, l.construction_source],
    ["Estado de la tabla", CONDITION_LABEL[l.condition] ?? l.condition, null],
    ["Quillas", l.fins, null],
    ["Accesorios", l.accessories, null],
  ];

  return (
    <>
      <PageHeader
        title={`${title} · ${pid}`}
        crumbs={[
          { href: "/admin", label: "Panel" },
          { href: "/admin/anuncios", label: "Anuncios" },
        ]}
        actions={
          isPublic ? (
            <Link href={publicListingPath(l)} className={s.btn} target="_blank" rel="noopener">
              Ver en la web ↗
            </Link>
          ) : undefined
        }
      />

      <section className={s.card} aria-labelledby="h-state">
        <h2 id="h-state" className={s.cardTitle}>
          Estado
        </h2>
        <div className={ls.state}>
          <Badge tone={DB_STATUS_TONE[l.status]}>{DB_STATUS_LABEL[l.status]}</Badge>
          <Badge tone={v.tone}>{v.label}</Badge>
          {openReports > 0 && (
            <Badge tone="warning">
              {openReports} reporte{openReports > 1 ? "s" : ""} abierto{openReports > 1 ? "s" : ""}
            </Badge>
          )}
          <p className={ls.stateHelp}>{v.help}</p>
        </div>
        <div className={`${s.btnRow} ${ls.stateActions}`}>
          <ListingActions publicId={pid} view={view} status={l.status} openReports={openReports} />
        </div>
      </section>

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="h-info">
          <h2 id="h-info" className={s.cardTitle}>
            Anuncio
          </h2>
          <dl className={s.dl}>
            <dt>Vendedor</dt>
            <dd>
              <Link href={`/admin/usuarios/${l.seller_id}`}>{l.seller?.display_name ?? `${l.seller_id.slice(0, 8)}…`}</Link>
              {l.seller?.seller_type ? ` · ${SELLER_LABEL[l.seller.seller_type]}` : ""} ·{" "}
              <Link href={`/admin/anuncios?vendedor=${l.seller_id}`}>sus anuncios</Link>
            </dd>
            <dt>Marca</dt>
            <dd>
              {l.brand?.name ?? "—"}
              {l.brand_text ? ` (texto libre: ${l.brand_text})` : ""}
            </dd>
            <dt>Modelo</dt>
            <dd>
              {l.model?.name ?? "—"}
              {l.model_text ? ` (texto libre: ${l.model_text})` : ""}
            </dd>
            <dt>Precio</dt>
            <dd>
              {l.price_eur.toLocaleString("es-ES")} €
              {l.previous_price_eur ? ` (antes ${l.previous_price_eur.toLocaleString("es-ES")} €)` : ""}
            </dd>
            <dt>Ubicación</dt>
            <dd>
              {l.town} · {l.zone?.name ?? l.zone_slug}
            </dd>
            <dt>Contacto</dt>
            <dd>{CONTACT[l.contact_method] ?? l.contact_method} (el número no se muestra en el panel)</dd>
            <dt>Creado</dt>
            <dd>{fmtDate(l.created_at, true)}</dd>
            <dt>Publicado</dt>
            <dd>{fmtDate(l.published_at, true)}</dd>
            <dt>Confirmado</dt>
            <dd>{fmtDate(l.confirmed_at, true)}</dd>
            {l.sold_at && (
              <>
                <dt>Vendido</dt>
                <dd>{fmtDate(l.sold_at, true)}</dd>
              </>
            )}
            <dt>Actualizado</dt>
            <dd>{fmtDate(l.updated_at, true)}</dd>
          </dl>
        </section>

        <section className={s.card} aria-labelledby="h-tech">
          <h2 id="h-tech" className={s.cardTitle}>
            Datos técnicos
          </h2>
          <dl className={s.dl}>
            {tech.map(([k, val, src]) => (
              <Fragment key={k}>
                <dt>{k}</dt>
                <dd>
                  {val ?? "—"}
                  {val && src ? <span className={s.small}> · dato del {SOURCE[src] ?? src}</span> : null}
                </dd>
              </Fragment>
            ))}
          </dl>
          <p className={`${s.small} ${ls.note}`}>
            Las medidas no se editan desde el panel: son del vendedor (o de la tabla del fabricante si las vinculó al catálogo).
          </p>
        </section>
      </div>

      <section className={s.card} aria-labelledby="h-photos">
        <h2 id="h-photos" className={s.cardTitle}>
          Fotos ({photos?.length ?? 0})
        </h2>
        {photos?.length ? (
          <div className={s.photos}>
            {photos.map((p, i) => (
              <figure key={p.id}>
                <a href={photoUrl(p.storage_path)} target="_blank" rel="noopener" className={ls.photoLink}>
                  {/* Revisión interna: la imagen original de Storage, sin optimizar (no es una página pública). */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p.storage_path)} alt={`Foto ${i + 1}${p.label ? `: ${p.label}` : ""}`} loading="lazy" width={p.width ?? undefined} height={p.height ?? undefined} />
                </a>
                <figcaption className={ls.photoCaption}>
                  {i + 1}. {p.label ?? "Sin etiqueta"}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className={s.muted}>Sin fotos.</p>
        )}
      </section>

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="h-desc">
          <h2 id="h-desc" className={s.cardTitle}>
            Descripción
          </h2>
          <p className={ls.quote}>{l.description ?? <span className={s.muted}>Sin descripción.</span>}</p>
        </section>
        <section className={s.card} aria-labelledby="h-rep">
          <h2 id="h-rep" className={s.cardTitle}>
            Reparaciones
          </h2>
          <p className={ls.quote}>{l.repairs ?? <span className={s.muted}>Sin reparaciones declaradas.</span>}</p>
        </section>
      </div>

      <EditTextsForm
        publicId={pid}
        initial={{
          brand_text: l.brand_text,
          model_text: l.model_text,
          town: l.town,
          fins: l.fins,
          accessories: l.accessories,
          repairs: l.repairs,
          description: l.description,
        }}
      />

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="h-reports">
          <h2 id="h-reports" className={s.cardTitle}>
            Reportes ({reports?.length ?? 0})
          </h2>
          {reports?.length ? (
            <ul className={ls.list}>
              {reports.map((r) => (
                <li key={r.id}>
                  <span>
                    <strong>{REPORT_REASON_LABEL[r.reason] ?? r.reason}</strong>{" "}
                    <Badge tone={r.status === "open" ? "warning" : "neutral"}>{REPORT_STATUS_ONE[r.status]}</Badge>
                  </span>
                  {r.details && <span className={ls.quote}>{r.details}</span>}
                  <span className={ls.meta}>
                    {fmtDate(r.created_at, true)} · por <Link href={`/admin/usuarios/${r.reporter_id}`}>usuario {r.reporter_id.slice(0, 8)}…</Link>
                    {r.resolved_at ? ` · cerrado el ${fmtDate(r.resolved_at)} por ${who(r.resolved_by)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Sin reportes" />
          )}
        </section>

        <section className={s.card} aria-labelledby="h-history">
          <h2 id="h-history" className={s.cardTitle}>
            Historial de moderación
          </h2>
          {history?.length ? (
            <ul className={ls.list}>
              {history.map((h) => (
                <li key={h.id}>
                  <strong>{MODERATION_ACTION_LABEL[h.action] ?? h.action}</strong>
                  {h.reason && <span className={ls.quote}>{h.reason}</span>}
                  <span className={ls.meta}>
                    {fmtDate(h.created_at, true)} · {who(h.moderator_id)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Sin acciones de moderación" />
          )}
        </section>
      </div>
    </>
  );
}
