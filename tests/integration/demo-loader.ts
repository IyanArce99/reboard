// Carga el inventario DEMO en el Supabase LOCAL (solo para tests de paridad y rendimiento).
// ⚠️ Nunca contra el proyecto remoto: serviceClient() comprueba que la URL es local.
// Los datos se marcan con emails @demo.invalid y se borran con clearDemo().

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { slugify } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { DEMO_CATALOG, DEMO_SHOPS } from "../fixtures/demo-inventory";

type Sb = SupabaseClient<Database>;
const STATUS: Record<Listing["status"], Database["public"]["Enums"]["listing_status"]> = {
  disponible: "published",
  pendiente: "published",
  vendida: "sold",
  caducada: "expired",
  retirada: "withdrawn",
};

const must = <T,>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
};

/** Borra lo cargado por loadDemo (anuncios, modelos, tiendas y usuarios @demo.invalid). Las marcas se quedan. */
export async function clearDemo(sb: Sb) {
  must(await sb.from("listings").delete().gte("id", 0), "delete listings");
  must(await sb.from("shops").delete().gte("id", 0), "delete shops");
  must(await sb.from("board_model_sizes").delete().gte("id", 0), "delete sizes");
  must(await sb.from("board_models").delete().gte("id", 0), "delete models");
  // Las marcas NO se borran: son datos de referencia de la migración 20261024090000_reference_brands.
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const demo = data.users.filter((u) => u.email?.endsWith("@demo.invalid"));
    for (const u of demo) await sb.auth.admin.deleteUser(u.id);
    if (data.users.length < 1000) break;
  }
}

/**
 * Inserta el inventario en el orden del mock (los ids crecen en ese orden) y devuelve
 * el mapa id del mock → public_id de la base de datos.
 */
export async function loadDemo(sb: Sb, listings: Listing[]) {
  // Catálogo
  const brandNames = [...new Set(DEMO_CATALOG.map((m) => m.brand))];
  // upsert: las marcas de referencia ya existen (migración); se reutilizan por slug.
  const brands = must(
    await sb.from("brands").upsert(brandNames.map((name) => ({ slug: slugify(name), name })), { onConflict: "slug" }).select("id, name"),
    "brands",
  );
  const brandId = new Map(brands.map((b) => [b.name, b.id]));
  const models = must(
    await sb
      .from("board_models")
      .insert(
        DEMO_CATALOG.map((m) => ({
          brand_id: brandId.get(m.brand)!,
          slug: m.slug,
          name: m.model,
          shape: m.shape,
          construction: m.construction,
          description: m.description,
          // Solo fixture de tests: el catálogo público exige modelos verificados (con fuente).
          source_note: "DEMO (tests locales): no es una tabla real del fabricante",
          verification: "verified",
        })),
      )
      .select("id, slug"),
    "models",
  );
  const modelId = new Map(models.map((m) => [m.slug, m.id]));
  const sizes = must(
    await sb
      .from("board_model_sizes")
      .insert(
        DEMO_CATALOG.flatMap((m) =>
          m.sizes.map((s, i) => ({
            model_id: modelId.get(m.slug)!,
            label: s.label,
            length_in: s.lengthIn,
            width_in: s.widthIn,
            thickness_in: s.thickIn,
            volume_l: s.volume,
            sort_order: i,
          })),
        ),
      )
      .select("id, model_id, label"),
    "sizes",
  );
  const sizeId = new Map(sizes.map((s) => [`${s.model_id}|${s.label}`, s.id]));

  // Vendedores: un usuario por nombre de vendedor (+ perfil con nombre y tipo)
  const sellers = new Map<string, { type: Listing["seller"]["type"] }>();
  for (const l of listings) sellers.set(l.seller.name, { type: l.seller.type });
  const sellerId = new Map<string, string>();
  for (const [name, { type }] of sellers) {
    const email = `${slugify(name) || "vendedor"}-${sellerId.size}@demo.invalid`;
    const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    sellerId.set(name, data.user.id);
    must(await sb.from("profiles").update({ display_name: name.slice(0, 40), seller_type: type }).eq("id", data.user.id), "profile");
  }
  must(
    await sb.from("shops").insert(
      DEMO_SHOPS.map((s) => ({
        slug: s.slug,
        name: s.name,
        type: s.type,
        zone_slug: s.zone,
        town: s.town,
        address: s.address,
        hours: s.hours,
        inventory_source: s.inventorySource,
        profile_id: sellerId.get(s.name) ?? null,
        status: "approved", // las nuevas entran como pendientes; el público solo ve las aprobadas
      })),
    ),
    "shops",
  );

  // Anuncios, en lotes, en el orden del mock
  const idMap = new Map<string, string>();
  for (let i = 0; i < listings.length; i += 500) {
    const batch = listings.slice(i, i + 500);
    const rows = batch.map((l) => {
      const mid = l.modelSlug ? modelId.get(l.modelSlug) ?? null : null;
      const sid = mid ? sizeId.get(`${mid}|${l.sizeLabel}`) ?? null : null;
      // La base de datos exige medida de catálogo para 'manufacturer': sin ella, es 'seller'.
      const src = (s: "seller" | "manufacturer" | null) => (s === "manufacturer" && !sid ? "seller" : s);
      return {
        seller_id: sellerId.get(l.seller.name)!,
        slug: l.slug,
        status: "published" as const,
        brand_id: l.brand ? brandId.get(l.brand) ?? null : null,
        model_id: mid,
        model_size_id: sid,
        size_label: l.sizeLabel,
        length_in: l.length.value!,
        length_source: src(l.length.source) ?? "seller",
        width_in: l.width.value,
        width_source: src(l.width.source),
        thickness_in: l.thickness.value,
        thickness_source: src(l.thickness.source),
        volume_l: l.volume.value,
        volume_source: src(l.volume.source),
        shape: l.shape,
        shape_source: "seller" as const,
        construction: l.construction,
        construction_source: src(l.constructionSource) ?? "seller",
        fins: l.fins.value,
        accessories: l.accessories.value,
        condition: l.condition,
        repairs: l.repairs,
        description: l.description,
        price_eur: l.price,
        zone_slug: l.zone,
        town: l.town,
        contact_method: "whatsapp" as const,
        contact_channels: l.contact.channels,
      };
    });
    // El servidor puede fijar las fechas al importar: se insertan ya con las del mock.
    const withDates = rows.map((r, k) => ({
      ...r,
      published_at: batch[k].publishedAt,
      confirmed_at: batch[k].confirmedAt,
      previous_price_eur: batch[k].previousPrice,
    }));
    const inserted = must(await sb.from("listings").insert(withDates).select("id, public_id").order("id"), "listings");
    batch.forEach((l, k) => idMap.set(l.id, inserted[k].public_id!));
    // Estado final (vendidas…): pocas filas, una actualización por anuncio.
    for (let k = 0; k < batch.length; k++) {
      const status = STATUS[batch[k].status];
      if (status !== "published") must(await sb.from("listings").update({ status }).eq("id", inserted[k].id), "status");
    }
  }
  return idMap;
}
