import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAction } from "@/components/admin/AdminAction";
import { ActionForm } from "@/components/admin/catalog/ActionForm";
import { BrandForm, catalogStyles as c } from "@/components/admin/catalog/forms";
import { idSchema } from "@/components/admin/catalog/schema";
import { Badge, Notice, PageHeader, adminStyles as s, fmtDate } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { SHAPE_INFO } from "@/lib/domain/taxonomy";
import { mergeBrand, setBrandActive, updateBrand } from "../../actions";

export const metadata: Metadata = { title: "Marca" };

export default async function AdminBrand(props: PageProps<"/admin/catalogo/marcas/[id]">) {
  const { id: raw } = await props.params;
  const { sb } = await requireAdminPage(`/admin/catalogo/marcas/${encodeURIComponent(raw)}`);
  const id = idSchema.safeParse(raw);
  if (!id.success) notFound();

  const [brandRes, others, models, listings] = await Promise.all([
    sb.from("brands").select("*").eq("id", id.data).maybeSingle(),
    sb.from("brands").select("id, name, merged_into").neq("id", id.data).is("merged_into", null).order("name"),
    sb.from("board_models").select("id, name, slug, shape, active, verification").eq("brand_id", id.data).order("name"),
    sb.from("listings").select("id", { count: "exact", head: true }).eq("brand_id", id.data),
  ]);
  if (brandRes.error) return <Notice tone="error">{adminErrorText(brandRes.error)}</Notice>;
  const b = brandRes.data;
  if (!b) notFound();
  const into = b.merged_into != null ? (await sb.from("brands").select("id, name").eq("id", b.merged_into).maybeSingle()).data : null;
  const nListings = listings.count ?? 0;
  const nModels = models.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title={b.name}
        crumbs={[
          { href: "/admin", label: "Panel" },
          { href: "/admin/catalogo", label: "Marcas" },
        ]}
        subtitle={
          <>
            <span className={s.mono}>{b.slug}</span> · {nListings.toLocaleString("es-ES")} anuncios · {nModels} modelos · actualizada el {fmtDate(b.updated_at)}
          </>
        }
        actions={
          b.merged_into == null &&
          (b.active ? (
            <AdminAction
              label="Desactivar"
              title={`Desactivar ${b.name}`}
              description="Dejará de aparecer al publicar y en los filtros. Los anuncios existentes la conservan. Puedes volver a activarla."
              action={setBrandActive.bind(null, b.id, false)}
              reason="none"
              tone="danger"
              confirmLabel="Sí, desactivar"
            />
          ) : (
            <AdminAction
              label="Activar"
              title={`Activar ${b.name}`}
              description="Volverá a aparecer al publicar y en los filtros."
              action={setBrandActive.bind(null, b.id, true)}
              reason="none"
              tone="primary"
            />
          ))
        }
      />

      {into && (
        <Notice tone="warning">
          Fusionada en <Link href={`/admin/catalogo/marcas/${into.id}`}>{into.name}</Link>: sus anuncios y modelos pasaron a esa marca.
        </Notice>
      )}
      {!b.active && !into && <Notice tone="warning">Inactiva: no aparece al publicar ni en los filtros.</Notice>}
      <div className={s.btnRow}>
        {b.active && <Badge tone="success">Activa</Badge>}
        {b.featured && b.active && <Badge tone="info">Destacada al publicar (orden {b.sort_order})</Badge>}
      </div>

      <section className={s.card} aria-labelledby="h-edit">
        <h2 id="h-edit" className={s.cardTitle}>
          Datos de la marca
        </h2>
        <BrandForm
          action={updateBrand.bind(null, b.id)}
          submitLabel="Guardar cambios"
          values={{
            name: b.name,
            slug: b.slug,
            intro: b.intro,
            logo_path: b.logo_path,
            aliases: b.aliases,
            featured: b.featured,
            sort_order: b.sort_order,
          }}
        />
      </section>

      <section className={s.card} aria-labelledby="h-models">
        <div className={s.cardHead}>
          <h2 id="h-models" className={s.cardTitle}>
            Modelos de {b.name}
          </h2>
          <Link href={`/admin/catalogo/modelos?marca=${b.id}`} className={s.btnGhost}>
            Ver en Modelos
          </Link>
        </div>
        {nModels === 0 ? (
          <p className={s.muted}>Sin modelos en el catálogo.</p>
        ) : (
          <ul className={c.dupes}>
            {models.data!.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/catalogo/modelos/${m.id}`}>{m.name}</Link> · {SHAPE_INFO[m.shape].label}
                {m.verification === "verified" ? " · verificado" : " · sin verificar"}
                {!m.active && " · inactivo"}
              </li>
            ))}
          </ul>
        )}
      </section>

      {b.merged_into == null && (
        <section className={s.card} aria-labelledby="h-merge">
          <h2 id="h-merge" className={s.cardTitle}>
            Fusionar en otra marca (duplicado)
          </h2>
          <p className={s.muted}>
            Los {nListings.toLocaleString("es-ES")} anuncios y {nModels} modelos de «{b.name}» pasarán a la marca elegida, «{b.name}» se
            añadirá a sus alias y esta quedará inactiva. Queda en la auditoría; no se deshace automáticamente.
          </p>
          <ActionForm action={mergeBrand.bind(null, b.id)} submitLabel="Fusionar marcas" tone="danger" className={c.form} ariaLabel="Fusionar marca">
            <div className={c.formGrid}>
              <label className={s.field}>
                Marca de destino (la buena)
                <select name="into" required defaultValue="">
                  <option value="" disabled>
                    Elige la marca
                  </option>
                  {(others.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${s.field} ${c.wide}`}>
                Motivo (obligatorio, queda en la auditoría)
                <textarea name="reason" required minLength={3} maxLength={1000} rows={2} />
              </label>
              <label className={`${s.check} ${c.wide}`}>
                <input type="checkbox" name="confirm" required />
                Confirmo que «{b.name}» es un duplicado y quiero mover sus anuncios y modelos.
              </label>
            </div>
          </ActionForm>
        </section>
      )}
    </>
  );
}
