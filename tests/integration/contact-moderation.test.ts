// Fase F contra Supabase LOCAL: revelar el contacto (límite por IP), caducidad y limpieza,
// reportes con marca automática y moderación con registro (con la sesión del moderador, sin borrar fotos).

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseRepository as db } from "@/lib/data/supabase-repository";
import { dailyMaintenance, deleteAccount, moderate, revealContact } from "@/lib/moderation/service";
import { ListingInput, type ListingInput as Input } from "@/lib/publish/schema";
import { finalizeListing, saveListing } from "@/lib/publish/save";
import { ipHash } from "@/lib/security/ip";
import type { Database } from "@/lib/supabase/database.types";
import { anonClient, deleteTestUsers, signedInClient } from "./auth-helpers";
import { serviceClient } from "./local-supabase";

type Sb = SupabaseClient<Database>;
const sb = serviceClient();
const run = Date.now().toString(36);
const SALT = "sal-de-pruebas-local-0123456789";
let seller: { client: Sb; userId: string };
const reporters: { client: Sb; userId: string }[] = [];

const input: Input = {
  brandSlug: null,
  modelSlug: null,
  catalogSize: null,
  brandText: "Shaper local",
  modelText: null,
  sizeLabel: `6'2"`,
  lengthIn: 74,
  lengthSource: "seller",
  widthIn: null,
  widthSource: null,
  thicknessIn: null,
  thicknessSource: null,
  volumeL: 33,
  volumeSource: "seller",
  shape: "fish",
  construction: "pu",
  condition: "buen-estado",
  repairs: "",
  description: "",
  priceEur: 210,
  zoneSlug: "cadiz",
  town: "El Palmar",
  contactMethod: "whatsapp",
  phone: "611 000 111",
};

async function publishOne(): Promise<{ publicId: string; id: number; path: string }> {
  const r = await saveListing(seller.client, seller.userId, ListingInput.parse(input), null);
  const path = `${seller.userId}/${r.id}/${crypto.randomUUID()}.webp`;
  const buf = await sharp({ create: { width: 20, height: 60, channels: 3, background: "#087e8b" } }).webp().toBuffer();
  const up = await seller.client.storage.from("listing-photos").upload(path, new Blob([new Uint8Array(buf)], { type: "image/webp" }), { contentType: "image/webp" });
  expect(up.error).toBeNull();
  await finalizeListing(seller.client, seller.userId, r.publicId, [{ path, width: 20, height: 60 }], true);
  return { publicId: r.publicId, id: r.id, path };
}

async function storageHas(path: string) {
  const folder = path.split("/").slice(0, 2).join("/");
  const { data } = await sb.storage.from("listing-photos").list(folder);
  return (data ?? []).some((o) => `${folder}/${o.name}` === path);
}

beforeAll(async () => {
  await deleteTestUsers(sb, "mod-");
  seller = await signedInClient(`mod-vende-${run}@reboard.test`);
  for (const n of [1, 2, 3]) reporters.push(await signedInClient(`mod-rep${n}-${run}@reboard.test`));
});

afterAll(async () => {
  for (const u of [seller, ...reporters].filter(Boolean)) {
    const { data: folders } = await sb.storage.from("listing-photos").list(u.userId);
    for (const f of folders ?? []) {
      const { data: files } = await sb.storage.from("listing-photos").list(`${u.userId}/${f.name}`);
      if (files?.length) await sb.storage.from("listing-photos").remove(files.map((x) => `${u.userId}/${f.name}/${x.name}`));
    }
  }
  await deleteTestUsers(sb, "mod-");
});

describe("ipHash", () => {
  it("HMAC estable, distinto por sal y nunca la IP en claro", () => {
    const a = ipHash("203.0.113.7", SALT)!;
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(ipHash("203.0.113.7", SALT)).toBe(a);
    expect(ipHash("203.0.113.7", `${SALT}x`)).not.toBe(a);
    expect(a).not.toContain("203");
    expect(ipHash("203.0.113.7", "corta")).toBeNull();
    expect(ipHash(null, SALT)).toBeNull();
  });
});

describe("revelar el contacto (F1)", () => {
  let listing: { publicId: string; id: number };

  beforeAll(async () => {
    listing = await publishOne();
  });

  it("el teléfono no viaja con el anuncio público", async () => {
    const l = await db.byId(listing.publicId);
    expect(l?.contact.phone).toBeNull();
    expect((await anonClient().from("listing_contacts").select("phone_e164")).data ?? []).toEqual([]);
    // La función solo la puede ejecutar el servidor (service role).
    const direct = await anonClient().rpc("reveal_contact", { p_public_id: listing.publicId, p_user: null as unknown as string, p_ip_hash: "x".repeat(64) });
    expect(direct.error).not.toBeNull();
  });

  it("devuelve método y número, y registra el evento (que ve el vendedor)", async () => {
    const r = await revealContact(sb, listing.publicId, null, ipHash("198.51.100.1", SALT)!);
    expect(r).toEqual({ ok: true, method: "whatsapp", phone: "34611000111" });
    const { data } = await seller.client.from("contact_events").select("listing_id").eq("listing_id", listing.id);
    expect(data).toHaveLength(1);
    expect((await reporters[0].client.from("contact_events").select("id").eq("listing_id", listing.id)).data).toEqual([]);
  });

  it("limita a 30 por hora y por IP", async () => {
    const hash = ipHash(`192.0.2.${run.length}`, SALT)!;
    for (let i = 0; i < 30; i++) expect((await revealContact(sb, listing.publicId, null, hash)).ok).toBe(true);
    expect(await revealContact(sb, listing.publicId, null, hash)).toEqual({ ok: false, reason: "rate-limited" });
    // Otra IP sigue pudiendo.
    expect((await revealContact(sb, listing.publicId, null, ipHash("192.0.2.200", SALT)!)).ok).toBe(true);
  });

  it("no revela anuncios no publicados", async () => {
    await sb.from("listings").update({ status: "sold" }).eq("id", listing.id);
    expect(await revealContact(sb, listing.publicId, null, ipHash("198.51.100.9", SALT)!)).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("caducidad y limpieza (F2)", () => {
  it("publicado sin confirmar en 31 días → caducado; borrador de 8 días → borrado con sus fotos", async () => {
    const old = await publishOne();
    await sb.from("listings").update({ confirmed_at: new Date(Date.now() - 31 * 86_400_000).toISOString() }).eq("id", old.id);
    const fresh = await publishOne();

    const draft = await saveListing(seller.client, seller.userId, ListingInput.parse(input), null);
    const path = `${seller.userId}/${draft.id}/${crypto.randomUUID()}.webp`;
    const buf = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).webp().toBuffer();
    await seller.client.storage.from("listing-photos").upload(path, new Blob([new Uint8Array(buf)], { type: "image/webp" }), { contentType: "image/webp" });
    await sb.from("listings").update({ created_at: new Date(Date.now() - 8 * 86_400_000).toISOString() }).eq("id", draft.id);

    const r = await dailyMaintenance(sb);
    expect(r.expired).toBeGreaterThanOrEqual(1);
    expect(r.draftsDeleted).toBeGreaterThanOrEqual(1);

    const { data: rows } = await sb.from("listings").select("id, status").in("id", [old.id, fresh.id, draft.id]);
    expect(rows?.find((x) => x.id === old.id)?.status).toBe("expired");
    expect(rows?.find((x) => x.id === fresh.id)?.status).toBe("published");
    expect(rows?.find((x) => x.id === draft.id)).toBeUndefined();
    expect(await storageHas(path)).toBe(false);
    expect((await db.byId(old.publicId))?.status).toBe("caducada");
  });
});

describe("reportes y moderación (F3)", () => {
  let listing: { publicId: string; id: number; path: string };

  beforeAll(async () => {
    listing = await publishOne();
  });

  it("reportar exige sesión, uno por persona; con 3 pasa a revisión", async () => {
    expect((await anonClient().from("reports").insert({ listing_id: listing.id, reason: "fraude" })).error).not.toBeNull();
    for (const r of reporters) expect((await r.client.from("reports").insert({ listing_id: listing.id, reason: "fraude", details: "pide señal" })).error).toBeNull();
    const dup = await reporters[0].client.from("reports").insert({ listing_id: listing.id, reason: "otro" });
    expect(dup.error?.code).toBe("23505");
    const { data } = await sb.from("listings").select("moderation").eq("id", listing.id).single();
    expect(data?.moderation).toBe("flagged");
    // Sigue visible hasta que decide un moderador; el vendedor no ve quién le reporta.
    expect(await db.byId(listing.publicId)).not.toBeNull();
    expect((await seller.client.from("reports").select("id").eq("listing_id", listing.id)).data).toEqual([]);
  });

  it("solo un moderador ve la cola; al retirar (con su sesión) desaparece de la web, conserva las fotos y queda registrado", async () => {
    const mod = reporters[2];
    expect((await mod.client.rpc("is_moderator")).data).toBe(false);
    expect((await mod.client.from("moderation_actions").select("id")).data).toEqual([]);
    // Sin rol, la función de la base de datos lo rechaza aunque se llame directamente.
    expect((await moderate(mod.client, listing.publicId, "remove", "sin permiso"))?.message).toMatch(/forbidden/);
    await sb.from("profiles").update({ role: "moderator" }).eq("id", mod.userId);
    expect((await mod.client.rpc("is_moderator")).data).toBe(true);
    const queue = await mod.client.from("reports").select("listing_id").eq("status", "open").eq("listing_id", listing.id);
    expect(queue.data).toHaveLength(3);

    // Ocultar y retirar exigen motivo; marcar vendido es solo para admin.
    expect((await moderate(mod.client, listing.publicId, "hide", ""))?.message).toMatch(/reason_required/);
    expect((await moderate(mod.client, listing.publicId, "mark_sold", "vendida por WhatsApp"))?.message).toMatch(/forbidden/);

    expect(await storageHas(listing.path)).toBe(true);
    expect(await moderate(mod.client, listing.publicId, "remove", "estafa confirmada")).toBeNull();
    expect(await db.byId(listing.publicId)).toBeNull();
    // Retirar ya no borra nada: ni el archivo de Storage ni la fila (que el moderador puede revisar).
    expect(await storageHas(listing.path)).toBe(true);
    expect((await mod.client.from("listing_photos").select("storage_path").eq("listing_id", listing.id)).data).toEqual([{ storage_path: listing.path }]);
    expect((await anonClient().from("listing_photos").select("id").eq("listing_id", listing.id)).data).toEqual([]);
    const { data: open } = await sb.from("reports").select("id").eq("listing_id", listing.id).eq("status", "open");
    expect(open).toEqual([]);
    const { data: log } = await mod.client.from("moderation_actions").select("action, reason").eq("listing_id", listing.id);
    expect(log).toEqual([{ action: "remove", reason: "estafa confirmada" }]);
    // El dueño no puede volver a publicarlo.
    const back = await seller.client.from("listings").update({ status: "published" }).eq("id", listing.id);
    expect(back.error).not.toBeNull();
  });

  it("ocultar y restaurar: vuelve a la web con sus fotos y queda en el historial", async () => {
    const mod = reporters[2];
    const other = await publishOne();
    expect(await moderate(mod.client, other.publicId, "hide", "revisando las fotos")).toBeNull();
    expect(await db.byId(other.publicId)).toBeNull();
    expect(await moderate(mod.client, other.publicId, "restore", null)).toBeNull();
    expect((await db.byId(other.publicId))?.photos.length).toBe(1);
    const { data: log } = await mod.client.from("moderation_actions").select("action").eq("listing_id", other.id).order("created_at");
    expect(log?.map((x) => x.action)).toEqual(["hide", "restore"]);
  });

  it("no se puede reportar un anuncio propio; el motivo «fotos» existe", async () => {
    const other = await publishOne();
    const own = await seller.client.from("reports").insert({ listing_id: other.id, reason: "fotos" });
    expect(own.error?.message).toMatch(/own_listing/);
    expect((await reporters[0].client.from("reports").insert({ listing_id: other.id, reason: "fotos" })).error).toBeNull();
  });
});

describe("borrar la cuenta (RGPD)", () => {
  it("borra usuario, perfil, anuncios, teléfono, guardados y fotos de Storage", async () => {
    const listing = await publishOne();
    await reporters[0].client.from("favorites").insert({ listing_id: listing.id });
    expect(await storageHas(listing.path)).toBe(true);

    await deleteAccount(sb, seller.userId);

    expect((await sb.auth.admin.getUserById(seller.userId)).data.user).toBeNull();
    expect((await sb.from("profiles").select("id").eq("id", seller.userId)).data).toEqual([]);
    expect((await sb.from("listings").select("id").eq("seller_id", seller.userId)).data).toEqual([]);
    expect((await sb.from("listing_contacts").select("listing_id").eq("listing_id", listing.id)).data).toEqual([]);
    expect((await sb.from("favorites").select("listing_id").eq("listing_id", listing.id)).data).toEqual([]);
    expect(await storageHas(listing.path)).toBe(false);
  });
});
