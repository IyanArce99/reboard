// Anuncios DEMO reales de Supabase LOCAL (cargados con `npm run db:seed-demo`), por slug.
// Los e2e no usan ids fijos: en la base de datos los ids cambian en cada carga (a116994…), no son
// los del antiguo inventario en memoria (a1040). Solo lectura, y solo contra Supabase local.
import { serviceClient } from "../integration/local-supabase";

const sb = serviceClient();

export interface DemoRef {
  id: string;
  slug: string;
  path: string;
  label: string;
}

export async function demoListing(slug: string): Promise<DemoRef> {
  const { data, error } = await sb.from("listings").select("public_id, slug, size_label, brand_text, brand:brands!listings_brand_id_fkey(name)").eq("slug", slug).limit(1).single();
  if (error || !data?.public_id) throw new Error(`No está el anuncio DEMO «${slug}»: ejecuta npm run db:seed-demo (${error?.message ?? "sin datos"})`);
  const brand = (data.brand as { name: string } | null)?.name ?? data.brand_text ?? "Sin marca";
  return { id: data.public_id, slug: data.slug, path: `/anuncio/${data.slug}-${data.public_id}`, label: `${brand} ${data.size_label}` };
}

/** Las primeras N tablas publicadas (orden estable por id). */
export async function demoPublished(n: number): Promise<DemoRef[]> {
  const { data, error } = await sb.from("listings").select("public_id, slug, size_label").eq("status", "published").order("id").limit(n);
  if (error || !data || data.length < n) throw new Error("Faltan anuncios DEMO: ejecuta npm run db:seed-demo");
  return data.map((d) => ({ id: d.public_id!, slug: d.slug, path: `/anuncio/${d.slug}-${d.public_id}`, label: d.size_label }));
}

/** Una tabla DEMO vendida. */
export async function demoSold(): Promise<DemoRef> {
  const { data, error } = await sb.from("listings").select("public_id, slug, size_label").eq("status", "sold").order("id").limit(1).single();
  if (error || !data) throw new Error("No hay ninguna tabla DEMO vendida: ejecuta npm run db:seed-demo");
  return { id: data.public_id!, slug: data.slug, path: `/anuncio/${data.slug}-${data.public_id}`, label: data.size_label };
}

export const STATE_KEY = "rb-usuario-v1";
export const state = (compare: { id: string; label: string }[], profile: unknown = null) => JSON.stringify({ saved: [], alerts: [], profile, compare });

/** Una tabla DEMO publicada que acepta contacto por email (`email` o `both`). Borra su registro de
 * mensajes para que el e2e pueda repetirse (el mismo comprador no puede escribir dos veces en 24 h). */
export async function demoByChannels(channels: "email" | "both"): Promise<DemoRef & { sellerEmail: string }> {
  const { data, error } = await sb
    .from("listings")
    .select("id, public_id, slug, size_label, seller_id")
    .eq("status", "published")
    .eq("contact_channels", channels)
    .order("id")
    .limit(1)
    .single();
  if (error || !data) throw new Error(`No hay ninguna tabla DEMO con contacto «${channels}»: ejecuta npm run db:seed-demo`);
  await sb.from("email_contact_events").delete().eq("listing_id", data.id);
  const { data: u } = await sb.auth.admin.getUserById(data.seller_id);
  return { id: data.public_id!, slug: data.slug, path: `/anuncio/${data.slug}-${data.public_id}`, label: data.size_label, sellerEmail: u.user?.email ?? "" };
}
