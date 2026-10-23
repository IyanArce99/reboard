// Panel de administración: seguridad con sesiones REALES de Supabase Auth (local).
// Comprueba en la API (no en la interfaz): usuario normal sin acceso a funciones ni datos de admin,
// sin poder cambiar su rol ni editar anuncios ajenos; admin con acceso; auditoría; último admin;
// revocación inmediata; suspensión aplicada también a Storage; MFA obligatorio; auditoría inmutable.

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { deleteTestUsers, signedInClient } from "./auth-helpers";
import { serviceClient } from "./local-supabase";

type Sb = SupabaseClient<Database>;
const PREFIX = "admin-it-";
const sb = serviceClient();

let admin: { client: Sb; userId: string };
let user: { client: Sb; userId: string };
let seller: { client: Sb; userId: string };
let listingId = 0;
let publicId = "";

/** Anuncio publicado por el camino real: borrador → foto y teléfono → publicado. */
async function makeListing(client: Sb, userId: string) {
  const { data, error } = await client
    .from("listings")
    .insert({
      slug: "admin-it-tabla",
      size_label: `7'0"`,
      length_in: 84,
      shape: "evolutiva",
      construction: "pu",
      condition: "buen-estado",
      price_eur: 200,
      zone_slug: "cantabria",
      town: "Somo",
    })
    .select("id, public_id")
    .single();
  if (error) throw error;
  const photo = await sb.from("listing_photos").insert({ listing_id: data.id, storage_path: `${userId}/${data.id}/foto.webp`, position: 0 });
  if (photo.error) throw photo.error;
  const contact = await sb.from("listing_contacts").insert({ listing_id: data.id, phone_e164: "+34600000000" });
  if (contact.error) throw contact.error;
  const pub = await client.from("listings").update({ status: "published" }).eq("id", data.id);
  if (pub.error) throw pub.error;
  return data;
}

beforeAll(async () => {
  await deleteTestUsers(sb, PREFIX);
  admin = await signedInClient(`${PREFIX}admin@reboard.test`);
  user = await signedInClient(`${PREFIX}user@reboard.test`);
  seller = await signedInClient(`${PREFIX}seller@reboard.test`);
  // Primer admin: como el script de arranque (service role), nunca desde la app.
  await sb.from("profiles").update({ role: "user" }).eq("role", "admin");
  await sb.from("profiles").update({ role: "admin" }).eq("id", admin.userId);
  // El inicio de sesión ya se hizo: la sesión es la misma, pero el rol se lee en cada consulta.
  const l = await makeListing(seller.client, seller.userId);
  listingId = l.id;
  publicId = l.public_id!;
});

afterAll(async () => {
  await sb.from("app_settings").update({ value: false }).eq("key", "admin_mfa_required");
  await sb.from("profiles").update({ role: "user", suspended_at: null }).in("id", [admin.userId, user.userId]);
  await deleteTestUsers(sb, PREFIX);
});

describe("usuario normal", () => {
  it("no es admin y no puede llamar a las funciones de administración", async () => {
    expect((await user.client.rpc("admin_status")).data).toBe("none");
    for (const call of [
      user.client.rpc("admin_stats", { p_days: 30 }),
      user.client.rpc("admin_list_users", {}),
      user.client.rpc("admin_get_user", { p_user: admin.userId }),
      user.client.rpc("admin_set_role", { p_user: user.userId, p_role: "admin", p_reason: "me lo pongo" }),
      user.client.rpc("admin_moderate_listing", { p_public_id: publicId, p_action: "hide", p_reason: "porque sí" }),
      user.client.rpc("admin_update_setting", { p_key: "report_threshold", p_value: 1, p_reason: "x" }),
    ]) {
      const { error } = await call;
      expect(error?.code).toBe("42501");
    }
  });

  it("no puede cambiar su propio rol escribiendo en la tabla", async () => {
    const { error } = await user.client.from("profiles").update({ role: "admin" } as never).eq("id", user.userId);
    expect(error).not.toBeNull();
    const { data } = await sb.from("profiles").select("role").eq("id", user.userId).single();
    expect(data?.role).toBe("user");
  });

  it("no lee la auditoría ni la configuración privada, y no escribe en el catálogo", async () => {
    expect((await user.client.from("admin_audit_log").select("id")).data).toEqual([]);
    const settings = (await user.client.from("app_settings").select("key")).data?.map((s) => s.key);
    expect(settings).toEqual(["site_notice"]);
    const { error } = await user.client.from("brands").insert({ slug: "admin-it-marca", name: "Pirata" });
    expect(error?.code).toBe("42501");
  });

  it("no puede editar un anuncio ajeno con una llamada directa", async () => {
    const { data } = await user.client.from("listings").update({ price_eur: 1 }).eq("id", listingId).select("id");
    expect(data ?? []).toEqual([]);
    const { data: after } = await sb.from("listings").select("price_eur").eq("id", listingId).single();
    expect(after?.price_eur).toBe(200);
  });

  it("no puede subir fotos a la carpeta de otro usuario (Storage)", async () => {
    const { error } = await user.client.storage
      .from("listing-photos")
      .upload(`${seller.userId}/${listingId}/intruso.webp`, new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }));
    expect(error).not.toBeNull();
  });
});

describe("administrador", () => {
  it("accede a las métricas y a los usuarios", async () => {
    expect((await admin.client.rpc("admin_status")).data).toBe("admin");
    const stats = (await admin.client.rpc("admin_stats", { p_days: 30 })).data as { users_total: number };
    expect(stats.users_total).toBeGreaterThanOrEqual(3);
    const { data } = await admin.client.rpc("admin_list_users", { p_search: `${PREFIX}user@` });
    expect(data?.map((u) => u.id)).toEqual([user.userId]);
  });

  it("las acciones quedan en la auditoría (con motivo y valores)", async () => {
    const { error } = await admin.client.rpc("admin_moderate_listing", { p_public_id: publicId, p_action: "hide", p_reason: "Revisión de fotos" });
    expect(error).toBeNull();
    const { data } = await admin.client
      .from("admin_audit_log")
      .select("actor_id, action, reason, before, after")
      .eq("entity_type", "listing")
      .eq("entity_id", publicId)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    expect(data).toMatchObject({ actor_id: admin.userId, action: "hide", reason: "Revisión de fotos" });
    expect((data?.after as { moderation: string }).moderation).toBe("removed");
    await admin.client.rpc("admin_moderate_listing", { p_public_id: publicId, p_action: "restore", p_reason: "" });
  });

  it("no puede quitarse su propio rol y el último admin está protegido", async () => {
    const { error } = await admin.client.rpc("admin_set_role", { p_user: admin.userId, p_role: "user", p_reason: "me voy" });
    expect(error?.message).toMatch(/own_role/);
    // Borrar la cuenta del único admin (como hace «Borrar mi cuenta» con la API de Auth) se rechaza.
    const { error: delError } = await sb.auth.admin.deleteUser(admin.userId);
    expect(delError).not.toBeNull();
    expect((await admin.client.rpc("admin_status")).data).toBe("admin");
  });

  it("la revocación del rol es inmediata", async () => {
    await admin.client.rpc("admin_set_role", { p_user: user.userId, p_role: "admin", p_reason: "Segundo administrador" });
    expect((await user.client.rpc("admin_status")).data).toBe("admin");
    const { error } = await user.client.rpc("admin_set_role", { p_user: admin.userId, p_role: "user", p_reason: "Rotación" });
    expect(error).toBeNull();
    expect((await admin.client.rpc("admin_status")).data).toBe("none");
    expect((await admin.client.rpc("admin_stats", { p_days: 7 })).error?.code).toBe("42501");
    await user.client.rpc("admin_set_role", { p_user: admin.userId, p_role: "admin", p_reason: "Vuelve" });
    await admin.client.rpc("admin_set_role", { p_user: user.userId, p_role: "user", p_reason: "Fin de la prueba" });
    expect((await user.client.rpc("admin_status")).data).toBe("none");
  });

  it("suspender bloquea publicar y subir fotos (también en Storage) y oculta sus anuncios", async () => {
    const { data: hidden } = await admin.client.rpc("admin_suspend_user", { p_user: seller.userId, p_reason: "Estafa confirmada", p_hide_listings: true });
    expect(hidden).toBe(1);
    const { error: insertError } = await seller.client.from("listings").insert({
      slug: "admin-it-otra",
      size_label: `6'0"`,
      length_in: 72,
      shape: "fish",
      construction: "pu",
      condition: "buen-estado",
      price_eur: 150,
      zone_slug: "cantabria",
      town: "Somo",
    });
    expect(insertError).not.toBeNull();
    const { error: uploadError } = await seller.client.storage
      .from("listing-photos")
      .upload(`${seller.userId}/${listingId}/nueva.webp`, new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }));
    expect(uploadError).not.toBeNull();
    const { data: l } = await sb.from("listings").select("moderation").eq("id", listingId).single();
    expect(l?.moderation).toBe("removed");

    // Reactivado: vuelve a poder publicar. Sus anuncios ocultos siguen ocultos (y sin edición del dueño)
    // hasta que un admin los restaure uno a uno.
    await admin.client.rpc("admin_reactivate_user", { p_user: seller.userId, p_reason: "Revisado" });
    const { error: afterError } = await seller.client.from("listings").insert({
      slug: "admin-it-vuelve",
      size_label: `6'0"`,
      length_in: 72,
      shape: "fish",
      construction: "pu",
      condition: "buen-estado",
      price_eur: 150,
      zone_slug: "cantabria",
      town: "Somo",
    });
    expect(afterError).toBeNull();
    const { error: hiddenEdit } = await seller.client.from("listings").update({ price_eur: 190 }).eq("id", listingId);
    expect(hiddenEdit?.code).toBe("P0001");
  });

  it("con MFA obligatorio, una sesión sin segundo factor pierde el acceso", async () => {
    await sb.from("app_settings").update({ value: true }).eq("key", "admin_mfa_required");
    expect((await admin.client.rpc("admin_status")).data).toBe("needs_mfa");
    expect((await admin.client.rpc("admin_stats", { p_days: 7 })).error?.code).toBe("42501");
    await sb.from("app_settings").update({ value: false }).eq("key", "admin_mfa_required");
    expect((await admin.client.rpc("admin_status")).data).toBe("admin");
  });

  it("la auditoría no se puede modificar ni borrar, ni siquiera con service role", async () => {
    const { error: u } = await sb.from("admin_audit_log").update({ reason: "editado" }).gte("id", 0);
    expect(u).not.toBeNull();
    const { error: d } = await sb.from("admin_audit_log").delete().gte("id", 0);
    expect(d).not.toBeNull();
  });
});
