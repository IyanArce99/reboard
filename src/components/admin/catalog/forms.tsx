// Formularios del catálogo y de las tiendas (Server Components que envuelven ActionForm).
// Solo pintan campos: la validación de verdad está en las Server Actions (zod + base de datos).

import Link from "next/link";
import { adminStyles as s } from "@/components/admin/ui";
import { CONSTRUCTIONS, CONSTRUCTION_INFO, SHAPES, SHAPE_INFO } from "@/lib/domain/taxonomy";
import { ActionForm, NameSlugFields, type FormResult } from "./ActionForm";
import c from "./Catalog.module.css";

export { c as catalogStyles };

type Action = (fd: FormData) => Promise<FormResult>;

export function CatalogTabs({ current }: { current: "marcas" | "modelos" }) {
  return (
    <nav className={c.tabs} aria-label="Catálogo">
      <Link href="/admin/catalogo" className={c.tab} aria-current={current === "marcas" ? "page" : undefined}>
        Marcas
      </Link>
      <Link href="/admin/catalogo/modelos" className={c.tab} aria-current={current === "modelos" ? "page" : undefined}>
        Modelos
      </Link>
    </nav>
  );
}

export interface BrandValues {
  name: string;
  slug: string;
  intro: string | null;
  logo_path: string | null;
  aliases: string[];
  featured: boolean;
  sort_order: number;
}

export function BrandForm({ action, values, submitLabel }: { action: Action; values?: BrandValues; submitLabel: string }) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className={c.form} ariaLabel={values ? "Editar marca" : "Nueva marca"}>
      <div className={c.formGrid}>
        <NameSlugFields nameLabel="Nombre de la marca" defaultName={values?.name} defaultSlug={values?.slug} />
        <label className={`${s.field} ${c.wide}`}>
          Alias (separados por comas)
          <textarea name="aliases" maxLength={3000} defaultValue={values?.aliases.join(", ") ?? ""} rows={2} />
          <span className={c.hint}>Otras formas de escribirla (p. ej. «Torq Surfboards»). Se usan para detectar duplicados.</span>
        </label>
        <label className={`${s.field} ${c.wide}`}>
          Introducción (opcional)
          <textarea name="intro" maxLength={2000} defaultValue={values?.intro ?? ""} rows={3} />
          <span className={c.hint}>Texto propio para la página pública de la marca. No copies textos de la web del fabricante.</span>
        </label>
        <label className={`${s.field} ${c.wide}`}>
          Logotipo (ruta o URL https, opcional)
          <input name="logo_path" maxLength={300} defaultValue={values?.logo_path ?? ""} autoComplete="off" spellCheck={false} />
          <span className={c.hint}>Solo con derechos de uso (autorización de la marca). Si no la hay, déjalo vacío.</span>
        </label>
        <label className={s.check}>
          <input type="checkbox" name="featured" defaultChecked={values?.featured ?? false} />
          Destacada en el formulario de publicación
        </label>
        <label className={s.field}>
          Orden entre las destacadas
          <input type="number" name="sort_order" min={0} max={999} step={1} defaultValue={values?.sort_order ?? 0} inputMode="numeric" />
          <span className={c.hint}>1 = primera. Se ignora si no está destacada.</span>
        </label>
      </div>
    </ActionForm>
  );
}

export interface ModelValues {
  brand_id: number;
  name: string;
  slug: string;
  shape: string;
  construction: string;
  description: string | null;
  source_note: string | null;
}

export function ModelForm({
  action,
  values,
  brands,
  submitLabel,
}: {
  action: Action;
  values?: ModelValues;
  brands: { id: number; name: string }[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className={c.form} ariaLabel={values ? "Editar modelo" : "Nuevo modelo"}>
      <div className={c.formGrid}>
        <label className={s.field}>
          Marca
          <select name="brand_id" required defaultValue={values?.brand_id ?? ""}>
            <option value="" disabled>
              Elige la marca
            </option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <NameSlugFields
          nameLabel="Nombre del modelo"
          defaultName={values?.name}
          defaultSlug={values?.slug}
          slugHint="Único en todo el catálogo (las URL usan el slug sin la marca)."
        />
        <label className={s.field}>
          Forma
          <select name="shape" required defaultValue={values?.shape ?? ""}>
            <option value="" disabled>
              Elige la forma
            </option>
            {SHAPES.map((sh) => (
              <option key={sh} value={sh}>
                {SHAPE_INFO[sh].label}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Construcción
          <select name="construction" required defaultValue={values?.construction ?? ""}>
            <option value="" disabled>
              Elige la construcción
            </option>
            {CONSTRUCTIONS.map((k) => (
              <option key={k} value={k}>
                {CONSTRUCTION_INFO[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${s.field} ${c.wide}`}>
          Fuente de las medidas
          <textarea name="source_note" maxLength={500} defaultValue={values?.source_note ?? ""} rows={2} />
          <span className={c.hint}>
            Tabla oficial del fabricante: URL o documento y fecha de consulta. Obligatoria para verificar el modelo.
          </span>
        </label>
        <label className={`${s.field} ${c.wide}`}>
          Descripción (opcional)
          <textarea name="description" maxLength={2000} defaultValue={values?.description ?? ""} rows={3} />
        </label>
      </div>
    </ActionForm>
  );
}

export interface SizeValues {
  label: string;
  length_in: number;
  width_in: number;
  thickness_in: number;
  volume_l: number | null;
  sort_order: number;
}

/** Campos de una medida del fabricante. Pulgadas: admite «20 1/2», «20,5» y, en longitud, «7'2"». */
export function SizeForm({ action, values, submitLabel, reset }: { action: Action; values?: SizeValues; submitLabel: string; reset?: boolean }) {
  const n = (v: number | null | undefined) => (v == null ? "" : String(v));
  return (
    <ActionForm action={action} submitLabel={submitLabel} className={c.form} reset={reset} ariaLabel={values ? `Medida ${values.label}` : "Nueva medida"}>
      <div className={c.sizeForm}>
        <label className={s.field}>
          Etiqueta
          <input name="label" required maxLength={20} defaultValue={values?.label ?? ""} placeholder={`7'2"`} autoComplete="off" />
        </label>
        <label className={s.field}>
          Longitud (in)
          <input name="length_in" required defaultValue={n(values?.length_in)} placeholder="86 o 7'2" inputMode="text" autoComplete="off" />
        </label>
        <label className={s.field}>
          Anchura (in)
          <input name="width_in" required defaultValue={n(values?.width_in)} placeholder="21 1/2" autoComplete="off" />
        </label>
        <label className={s.field}>
          Grosor (in)
          <input name="thickness_in" required defaultValue={n(values?.thickness_in)} placeholder="2 7/8" autoComplete="off" />
        </label>
        <label className={s.field}>
          Litros
          <input name="volume_l" defaultValue={n(values?.volume_l)} placeholder="Si el fabricante lo da" inputMode="decimal" autoComplete="off" />
        </label>
        <label className={s.field}>
          Orden
          <input type="number" name="sort_order" min={0} max={999} step={1} defaultValue={values?.sort_order ?? 0} inputMode="numeric" />
        </label>
      </div>
    </ActionForm>
  );
}

export interface ShopValues {
  name: string;
  slug: string;
  type: string;
  zone_slug: string;
  town: string;
  address: string | null;
  hours: string | null;
  inventory_source: string | null;
}

export function ShopForm({
  action,
  values,
  zones,
  submitLabel,
}: {
  action: Action;
  values?: ShopValues;
  zones: { slug: string; name: string }[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className={c.form} ariaLabel={values ? "Editar tienda o escuela" : "Nueva tienda o escuela"}>
      <div className={c.formGrid}>
        <NameSlugFields nameLabel="Nombre" defaultName={values?.name} defaultSlug={values?.slug} maxName={80} />
        <label className={s.field}>
          Tipo
          <select name="type" required defaultValue={values?.type ?? "tienda"}>
            <option value="tienda">Tienda</option>
            <option value="escuela">Escuela</option>
          </select>
        </label>
        <label className={s.field}>
          Zona
          <select name="zone_slug" required defaultValue={values?.zone_slug ?? ""}>
            <option value="" disabled>
              Elige la zona
            </option>
            {zones.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Localidad
          <input name="town" required minLength={2} maxLength={80} defaultValue={values?.town ?? ""} autoComplete="off" />
        </label>
        <label className={`${s.field} ${c.wide}`}>
          Dirección (opcional)
          <input name="address" maxLength={200} defaultValue={values?.address ?? ""} autoComplete="off" />
        </label>
        <label className={s.field}>
          Horario (opcional)
          <input name="hours" maxLength={200} defaultValue={values?.hours ?? ""} autoComplete="off" />
        </label>
        <label className={s.field}>
          Origen del inventario (opcional)
          <input name="inventory_source" maxLength={200} defaultValue={values?.inventory_source ?? ""} autoComplete="off" />
          <span className={c.hint}>Cómo publica sus tablas (p. ej. «Publica la propia tienda»).</span>
        </label>
      </div>
    </ActionForm>
  );
}
