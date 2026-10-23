import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, ActionForm } from "@/components/admin/catalog/ActionForm";
import { BrandForm, CatalogTabs, catalogStyles as c } from "@/components/admin/catalog/forms";
import { findSimilar, normalizeName } from "@/components/admin/catalog/schema";
import { Badge, Empty, Notice, PageHeader, adminStyles as s, str } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { addFeaturedBrand, createBrand, moveFeaturedBrand, setBrandFeatured } from "./actions";

export const metadata: Metadata = { title: "Marcas" };

const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "activas", label: "Activas" },
  { value: "inactivas", label: "Inactivas o fusionadas" },
] as const;

const count = (rel: { count: number }[] | null | undefined) => rel?.[0]?.count ?? 0;

export default async function AdminBrands(props: PageProps<"/admin/catalogo">) {
  const { sb } = await requireAdminPage("/admin/catalogo");
  const sp = await props.searchParams;
  const q = str(sp.q)?.slice(0, 80);
  const estado = ESTADOS.find((e) => e.value === str(sp.estado))?.value ?? "";

  // Una sola consulta: marcas con sus recuentos de anuncios (todos los estados) y modelos.
  const { data, error } = await sb
    .from("brands")
    .select("id, slug, name, active, featured, sort_order, aliases, merged_into, listings!listings_brand_id_fkey(count), board_models(count)")
    .order("name")
    .limit(2000);
  if (error) return <Notice tone="error">{adminErrorText(error)}</Notice>;
  const all = data ?? [];
  const byId = new Map(all.map((b) => [b.id, b]));

  const featured = all
    .filter((b) => b.featured && b.active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
  const addable = all.filter((b) => b.active && !b.featured);
  const dupes = findSimilar(all.filter((b) => b.active && b.merged_into == null));

  const nq = q ? normalizeName(q) : "";
  const rows = all.filter(
    (b) =>
      (estado === "" || (estado === "activas" ? b.active : !b.active)) &&
      (!nq || normalizeName(b.name).includes(nq) || b.slug.includes(q!.toLowerCase()) || b.aliases.some((a) => normalizeName(a).includes(nq))),
  );
  const filtered = Boolean(q || estado);

  return (
    <>
      <PageHeader
        title="Marcas y modelos"
        subtitle="Catálogo de referencia. Los anuncios guardan sus propias medidas (las del vendedor): nada de aquí las cambia."
      />
      <CatalogTabs current="marcas" />

      <section className={s.card} aria-labelledby="h-featured">
        <div className={s.cardHead}>
          <h2 id="h-featured" className={s.cardTitle}>
            Marcas destacadas en el formulario de publicación
          </h2>
          <span className={s.small}>{featured.length} destacadas</span>
        </div>
        <p className={s.muted}>
          Aparecen primero y siempre visibles al elegir la marca, en este orden. El resto queda tras «Ver todas las marcas».
        </p>
        {featured.length === 0 ? (
          <Notice tone="warning">No hay marcas destacadas: el formulario mostrará las marcas por orden alfabético.</Notice>
        ) : (
          <ol className={c.featured} aria-label="Orden de las marcas destacadas">
            {featured.map((b, i) => (
              <li key={b.id}>
                <span className={c.featuredPos} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={c.featuredName}>
                  <Link href={`/admin/catalogo/marcas/${b.id}`}>{b.name}</Link>
                </span>
                <span className={c.rowActions}>
                  <ActionButton
                    action={moveFeaturedBrand.bind(null, b.id, "up")}
                    label="↑ Subir"
                    ariaLabel={`Subir ${b.name}`}
                    disabled={i === 0}
                  />
                  <ActionButton
                    action={moveFeaturedBrand.bind(null, b.id, "down")}
                    label="↓ Bajar"
                    ariaLabel={`Bajar ${b.name}`}
                    disabled={i === featured.length - 1}
                  />
                  <ActionButton action={setBrandFeatured.bind(null, b.id, false)} label="Quitar" ariaLabel={`Quitar ${b.name} de destacadas`} tone="ghost" />
                </span>
              </li>
            ))}
          </ol>
        )}
        {addable.length > 0 && (
          <ActionForm action={addFeaturedBrand} submitLabel="Añadir a destacadas" className={c.inline} tone="default" ariaLabel="Añadir marca destacada">
            <label className={s.field}>
              Marca
              <select name="brand_id" required defaultValue="">
                <option value="" disabled>
                  Elige una marca activa
                </option>
                {addable.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </ActionForm>
        )}
      </section>

      {dupes.length > 0 && (
        <Notice tone="warning">
          Posibles marcas duplicadas (nombre o alias muy parecidos). Revísalas y, si lo son, fusiónalas desde la ficha de la marca:
          <ul className={c.dupes}>
            {dupes.map((g) => (
              <li key={g.map((b) => b.id).join("-")}>
                {g.map((b, i) => (
                  <span key={b.id}>
                    {i > 0 && " · "}
                    <Link href={`/admin/catalogo/marcas/${b.id}`}>{b.name}</Link>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <details className={`${s.card} ${c.disclosure}`}>
        <summary>Nueva marca</summary>
        <BrandForm action={createBrand} submitLabel="Crear marca" />
      </details>

      <form className={s.filters} method="get" role="search" aria-label="Filtrar marcas">
        <label className={`${s.field} ${s.fieldGrow}`}>
          Buscar
          <input type="search" name="q" defaultValue={q ?? ""} maxLength={80} placeholder="Nombre, slug o alias" autoComplete="off" />
        </label>
        <label className={s.field}>
          Estado
          <select name="estado" defaultValue={estado}>
            {ESTADOS.map((o) => (
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
            <Link href="/admin/catalogo" className={s.btn}>
              Quitar filtros
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty title={filtered ? "Ninguna marca coincide" : "Todavía no hay marcas"}>
          {filtered ? <p>Prueba con otro nombre o quita los filtros.</p> : <p>Crea la primera con «Nueva marca».</p>}
        </Empty>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className="visually-hidden">Marcas por orden alfabético ({rows.length})</caption>
            <thead>
              <tr>
                <th scope="col">Marca</th>
                <th scope="col">Slug</th>
                <th scope="col">Estado</th>
                <th scope="col" className={s.num}>
                  Anuncios
                </th>
                <th scope="col" className={s.num}>
                  Modelos
                </th>
                <th scope="col">Alias</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const into = b.merged_into != null ? byId.get(b.merged_into) : undefined;
                return (
                  <tr key={b.id}>
                    <td data-label="Marca">
                      <Link href={`/admin/catalogo/marcas/${b.id}`}>{b.name}</Link>
                    </td>
                    <td data-label="Slug" className={s.mono}>
                      {b.slug}
                    </td>
                    <td data-label="Estado">
                      <span className={s.btnRow}>
                        {into ? (
                          <Badge tone="neutral">Fusionada en {into.name}</Badge>
                        ) : b.active ? (
                          <Badge tone="success">Activa</Badge>
                        ) : (
                          <Badge tone="warning">Inactiva</Badge>
                        )}
                        {b.featured && b.active && <Badge tone="info">Destacada</Badge>}
                      </span>
                    </td>
                    <td data-label="Anuncios" className={s.num}>
                      {count(b.listings)}
                    </td>
                    <td data-label="Modelos" className={s.num}>
                      {count(b.board_models)}
                    </td>
                    <td data-label="Alias" className={s.small}>
                      {b.aliases.length ? b.aliases.join(", ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className={s.small}>Los recuentos de anuncios incluyen todos los estados (publicados, vendidos, caducados, retirados y borradores).</p>
    </>
  );
}
