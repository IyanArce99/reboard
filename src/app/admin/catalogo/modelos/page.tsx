import type { Metadata } from "next";
import Link from "next/link";
import { CatalogTabs, ModelForm, catalogStyles as c } from "@/components/admin/catalog/forms";
import { findSimilar, normalizeName } from "@/components/admin/catalog/schema";
import { Badge, Empty, Notice, PageHeader, Pager, adminStyles as s, pageParam, str } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { CONSTRUCTION_INFO, SHAPE_INFO } from "@/lib/domain/taxonomy";
import { createModel } from "../actions";

export const metadata: Metadata = { title: "Modelos" };

const PAGE_SIZE = 50;
const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "inactivos", label: "Inactivos" },
] as const;
const VERIF = [
  { value: "", label: "Todos" },
  { value: "verified", label: "Verificados" },
  { value: "unverified", label: "Sin verificar" },
] as const;

const count = (rel: { count: number }[] | null | undefined) => rel?.[0]?.count ?? 0;

export default async function AdminModels(props: PageProps<"/admin/catalogo/modelos">) {
  const { sb } = await requireAdminPage("/admin/catalogo/modelos");
  const sp = await props.searchParams;
  const q = str(sp.q)?.slice(0, 80);
  const marca = Number(str(sp.marca)) || 0;
  const estado = ESTADOS.find((e) => e.value === str(sp.estado))?.value ?? "";
  const verif = VERIF.find((e) => e.value === str(sp.verificacion))?.value ?? "";
  const page = pageParam(sp.pagina);

  // El catálogo es pequeño: una consulta con recuentos (medidas y anuncios) y el filtrado aquí, que
  // además permite detectar duplicados en todo el catálogo y no solo en la página.
  const [modelsRes, brandsRes] = await Promise.all([
    sb
      .from("board_models")
      .select(
        "id, slug, name, shape, construction, active, verification, brand_id, brand:brands!board_models_brand_id_fkey(name), board_model_sizes(count), listings!listings_model_id_fkey(count)",
      )
      .order("name")
      .limit(5000),
    sb.from("brands").select("id, name, active").is("merged_into", null).order("name"),
  ]);
  if (modelsRes.error || brandsRes.error) return <Notice tone="error">{adminErrorText(modelsRes.error ?? brandsRes.error)}</Notice>;
  const all = modelsRes.data ?? [];
  const brands = brandsRes.data ?? [];
  const dupes = findSimilar(all, (m) => m.brand_id);

  const nq = q ? normalizeName(q) : "";
  const rows = all.filter(
    (m) =>
      (!marca || m.brand_id === marca) &&
      (estado === "" || (estado === "activos" ? m.active : !m.active)) &&
      (verif === "" || m.verification === verif) &&
      (!nq || normalizeName(m.name).includes(nq) || m.slug.includes(q!.toLowerCase())),
  );
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = Boolean(q || marca || estado || verif);
  const params = { q, marca: marca ? String(marca) : undefined, estado: estado || undefined, verificacion: verif || undefined };

  return (
    <>
      <PageHeader
        title="Marcas y modelos"
        subtitle="Al publicar solo se ofrecen los modelos activos y verificados. Verificado = medidas copiadas de la tabla oficial del fabricante; nunca datos inferidos."
      />
      <CatalogTabs current="modelos" />

      {dupes.length > 0 && (
        <Notice tone="warning">
          Posibles modelos duplicados en la misma marca (nombres muy parecidos). Revísalos; si sobra alguno, desactívalo:
          <ul className={c.dupes}>
            {dupes.map((g) => (
              <li key={g.map((m) => m.id).join("-")}>
                {g[0].brand?.name}:{" "}
                {g.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && " · "}
                    <Link href={`/admin/catalogo/modelos/${m.id}`}>{m.name}</Link>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <details className={`${s.card} ${c.disclosure}`}>
        <summary>Nuevo modelo</summary>
        <p className={s.muted}>
          Se crea sin verificar: no aparecerá al publicar hasta que añadas sus medidas desde la tabla oficial del fabricante y lo
          verifiques.
        </p>
        <ModelForm action={createModel} brands={brands.filter((b) => b.active)} submitLabel="Crear modelo" />
      </details>

      <form className={s.filters} method="get" role="search" aria-label="Filtrar modelos">
        <label className={`${s.field} ${s.fieldGrow}`}>
          Buscar
          <input type="search" name="q" defaultValue={q ?? ""} maxLength={80} placeholder="Nombre o slug" autoComplete="off" />
        </label>
        <label className={s.field}>
          Marca
          <select name="marca" defaultValue={marca ? String(marca) : ""}>
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
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
        <label className={s.field}>
          Verificación
          <select name="verificacion" defaultValue={verif}>
            {VERIF.map((o) => (
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
            <Link href="/admin/catalogo/modelos" className={s.btn}>
              Quitar filtros
            </Link>
          )}
        </div>
      </form>

      {shown.length === 0 ? (
        <Empty title={filtered ? "Ningún modelo coincide" : "Todavía no hay modelos"}>
          {filtered ? <p>Prueba con otro nombre o quita los filtros.</p> : <p>Crea el primero con «Nuevo modelo».</p>}
        </Empty>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className="visually-hidden">Modelos del catálogo por nombre</caption>
              <thead>
                <tr>
                  <th scope="col">Modelo</th>
                  <th scope="col">Marca</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Estado</th>
                  <th scope="col" className={s.num}>
                    Medidas
                  </th>
                  <th scope="col" className={s.num}>
                    Anuncios
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Modelo">
                      <Link href={`/admin/catalogo/modelos/${m.id}`}>{m.name}</Link>
                      <div className={s.mono}>{m.slug}</div>
                    </td>
                    <td data-label="Marca">{m.brand?.name ?? "—"}</td>
                    <td data-label="Tipo">
                      {SHAPE_INFO[m.shape].label} · {CONSTRUCTION_INFO[m.construction].short}
                    </td>
                    <td data-label="Estado">
                      <span className={s.btnRow}>
                        {m.verification === "verified" ? <Badge tone="success">Verificado</Badge> : <Badge tone="warning">Sin verificar</Badge>}
                        {!m.active && <Badge>Inactivo</Badge>}
                      </span>
                    </td>
                    <td data-label="Medidas" className={s.num}>
                      {count(m.board_model_sizes)}
                    </td>
                    <td data-label="Anuncios" className={s.num}>
                      {count(m.listings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} total={rows.length} basePath="/admin/catalogo/modelos" params={params} />
        </>
      )}
    </>
  );
}
