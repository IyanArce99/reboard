import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAction } from "@/components/admin/AdminAction";
import { ModelForm, SizeForm, catalogStyles as c } from "@/components/admin/catalog/forms";
import { idSchema } from "@/components/admin/catalog/schema";
import { Badge, Notice, PageHeader, adminStyles as s, fmtDate } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { fmtIn } from "@/lib/domain/format";
import { createSize, deleteSize, setModelActive, setModelVerification, updateModel, updateSize } from "../../actions";

export const metadata: Metadata = { title: "Modelo" };

export default async function AdminModel(props: PageProps<"/admin/catalogo/modelos/[id]">) {
  const { id: raw } = await props.params;
  const { sb } = await requireAdminPage(`/admin/catalogo/modelos/${encodeURIComponent(raw)}`);
  const id = idSchema.safeParse(raw);
  if (!id.success) notFound();

  const [modelRes, brandsRes, sizesRes, listings] = await Promise.all([
    sb.from("board_models").select("*, brand:brands!board_models_brand_id_fkey(id, name)").eq("id", id.data).maybeSingle(),
    sb.from("brands").select("id, name, active").is("merged_into", null).order("name"),
    sb.from("board_model_sizes").select("*").eq("model_id", id.data).order("sort_order").order("length_in"),
    sb.from("listings").select("id", { count: "exact", head: true }).eq("model_id", id.data),
  ]);
  if (modelRes.error) return <Notice tone="error">{adminErrorText(modelRes.error)}</Notice>;
  const m = modelRes.data;
  if (!m) notFound();
  const sizes = sizesRes.data ?? [];
  const verified = m.verification === "verified";
  const hasSource = Boolean(m.source_note?.trim());
  // La marca actual siempre está en la lista (aunque esté inactiva), para no cambiarla sin querer.
  const brands = (brandsRes.data ?? []).filter((b) => b.active || b.id === m.brand_id);

  return (
    <>
      <PageHeader
        title={`${m.brand?.name ?? ""} ${m.name}`.trim()}
        crumbs={[
          { href: "/admin/catalogo", label: "Catálogo" },
          { href: "/admin/catalogo/modelos", label: "Modelos" },
        ]}
        subtitle={
          <>
            <span className={s.mono}>{m.slug}</span> · {(listings.count ?? 0).toLocaleString("es-ES")} anuncios · actualizado el{" "}
            {fmtDate(m.updated_at)}
          </>
        }
        actions={
          m.active ? (
            <AdminAction
              label="Desactivar"
              title={`Desactivar ${m.name}`}
              description="Dejará de ofrecerse al publicar y desaparecerá del catálogo público. Los anuncios existentes conservan sus medidas."
              action={setModelActive.bind(null, m.id, false)}
              reason="none"
              tone="danger"
              confirmLabel="Sí, desactivar"
            />
          ) : (
            <AdminAction
              label="Activar"
              title={`Activar ${m.name}`}
              description="Volverá a ofrecerse al publicar si está verificado."
              action={setModelActive.bind(null, m.id, true)}
              reason="none"
              tone="primary"
            />
          )
        }
      />

      <section className={s.card} aria-labelledby="h-verif">
        <div className={s.cardHead}>
          <h2 id="h-verif" className={s.cardTitle}>
            Verificación
          </h2>
          <span className={s.btnRow}>
            {verified ? <Badge tone="success">Verificado</Badge> : <Badge tone="warning">Sin verificar</Badge>}
            {!m.active && <Badge>Inactivo</Badge>}
          </span>
        </div>
        <p className={s.muted}>
          Verificado = medidas copiadas de la tabla oficial del fabricante; nunca datos inferidos. Solo los modelos activos y verificados
          se ofrecen al publicar y en el catálogo público, y sus medidas se muestran como «del fabricante».
        </p>
        {verified && (
          <p className={s.small}>
            Verificado el {fmtDate(m.verified_at, true)}. Si cambias las medidas, comprueba que siguen coincidiendo con la fuente.
          </p>
        )}
        {!hasSource && !verified && <Notice tone="warning">Para verificarlo, guarda primero la fuente de las medidas (abajo).</Notice>}
        {!verified && hasSource && sizes.length === 0 && <Notice tone="warning">Añade al menos una medida antes de verificarlo.</Notice>}
        <div className={s.btnRow}>
          {verified ? (
            <AdminAction
              label="Quitar verificación"
              title="Quitar la verificación"
              description="El modelo dejará de ofrecerse al publicar hasta que vuelvas a verificarlo."
              action={setModelVerification.bind(null, m.id, false)}
              reason="optional"
              tone="danger"
            />
          ) : (
            hasSource &&
            sizes.length > 0 && (
              <AdminAction
                label="Marcar como verificado"
                title="Verificar el modelo"
                description={`Confirmas que las ${sizes.length} medidas coinciden con la fuente: «${m.source_note}».`}
                action={setModelVerification.bind(null, m.id, true)}
                reason="optional"
                tone="primary"
                confirmLabel="Verificar"
              />
            )
          )}
        </div>
      </section>

      <section className={s.card} aria-labelledby="h-edit">
        <h2 id="h-edit" className={s.cardTitle}>
          Datos del modelo
        </h2>
        <ModelForm
          action={updateModel.bind(null, m.id)}
          brands={brands}
          submitLabel="Guardar cambios"
          values={{
            brand_id: m.brand_id,
            name: m.name,
            slug: m.slug,
            shape: m.shape,
            construction: m.construction,
            description: m.description,
            source_note: m.source_note,
          }}
        />
      </section>

      <section className={s.card} aria-labelledby="h-sizes">
        <h2 id="h-sizes" className={s.cardTitle}>
          Medidas del fabricante ({sizes.length})
        </h2>
        <p className={s.muted}>
          En pulgadas, tal como las publica el fabricante. Los litros, solo si los da la tabla oficial: si no, déjalos vacíos. Las
          medidas de los anuncios son del vendedor y no cambian al editar estas.
        </p>
        {sizes.length === 0 && <p className={s.muted}>Sin medidas todavía.</p>}
        <div className={c.form}>
          {sizes.map((z) => (
            <div key={z.id} className={s.card} role="group" aria-label={`Medida ${z.label}`}>
              <p className={s.small}>
                {z.label}: {fmtIn(Number(z.length_in))} × {Number(z.width_in)}″ × {Number(z.thickness_in)}″
                {z.volume_l != null ? ` · ${Number(z.volume_l)} L` : " · sin litros"}
              </p>
              <SizeForm
                action={updateSize.bind(null, z.id)}
                submitLabel="Guardar medida"
                values={{
                  label: z.label,
                  length_in: Number(z.length_in),
                  width_in: Number(z.width_in),
                  thickness_in: Number(z.thickness_in),
                  volume_l: z.volume_l == null ? null : Number(z.volume_l),
                  sort_order: z.sort_order,
                }}
              />
              <div className={s.btnRow} style={{ marginTop: 8 }}>
                <AdminAction
                  label="Borrar medida"
                  title={`Borrar la medida ${z.label}`}
                  description="No se puede borrar si algún anuncio la usa. Las medidas de los anuncios no cambian."
                  action={deleteSize.bind(null, z.id)}
                  reason="none"
                  tone="danger"
                  confirmLabel="Sí, borrar"
                />
              </div>
            </div>
          ))}
          <div className={s.card}>
            <h3 className={s.cardTitle}>Añadir medida</h3>
            <SizeForm action={createSize.bind(null, m.id)} submitLabel="Añadir medida" reset />
          </div>
        </div>
      </section>

      <p className={s.small}>
        <Link href={`/admin/catalogo/marcas/${m.brand_id}`}>Ver la marca</Link>
      </p>
    </>
  );
}
