// Publicar y gestionar anuncios (fase E) contra Supabase LOCAL, con usuarios reales (código por email)
// y bajo RLS: borrador → fotos en Storage → publicado → visible en la búsqueda → editar → panel.

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseRepository as db } from "@/lib/data/supabase-repository";
import type { Database } from "@/lib/supabase/database.types";
import { ListingInput, type ListingInput as Input } from "@/lib/publish/schema";
import { PublishError, finalizeListing, panelAction, saveListing } from "@/lib/publish/save";
import { withFilters } from "@/lib/search/filters";
import { buildDemoInventory } from "@/mocks/demo-inventory";
import { clearDemo, loadDemo } from "./demo-loader";
import { anonClient, deleteTestUsers, signedInClient } from "./auth-helpers";
import { serviceClient } from "./local-supabase";

const sb = serviceClient();
const run = Date.now().toString(36);
type Sb = SupabaseClient<Database>;
let seller: { client: Sb; userId: string };
let other: { client: Sb; userId: string };

const base: Input = {
  brandSlug: "torq",
  modelSlug: "fun-tet",
  catalogSize: `7'2"`,
  brandText: null,
  modelText: null,
  sizeLabel: `7'2"`,
  lengthIn: 86,
  lengthSource: "manufacturer",
  widthIn: 21.5,
  widthSource: "manufacturer",
  thicknessIn: 2.875,
  thicknessSource: "manufacturer",
  volumeL: 47.3,
  volumeSource: "seller",
  shape: "evolutiva",
  construction: "epoxy",
  condition: "muy-buen-estado",
  repairs: "",
  description: "Prueba de integración: tabla de test.",
  priceEur: 333,
  zoneSlug: "asturias",
  town: "Salinas",
  contactMethod: "whatsapp",
  phone: "600 111 222",
};

async function webp(): Promise<Blob> {
  const buf = await sharp({ create: { width: 40, height: 120, channels: 3, background: "#f4c15a" } }).webp().toBuffer();
  return new Blob([new Uint8Array(buf)], { type: "image/webp" });
}

async function upload(client: Sb, path: string) {
  const { error } = await client.storage.from("listing-photos").upload(path, await webp(), { contentType: "image/webp" });
  return error;
}

async function clearStorage() {
  for (const u of [seller?.userId, other?.userId].filter(Boolean)) {
    const { data: folders } = await sb.storage.from("listing-photos").list(u!);
    for (const f of folders ?? []) {
      const { data: files } = await sb.storage.from("listing-photos").list(`${u}/${f.name}`);
      if (files?.length) await sb.storage.from("listing-photos").remove(files.map((x) => `${u}/${f.name}/${x.name}`));
    }
  }
}

beforeAll(async () => {
  await deleteTestUsers(sb, "pub-");
  await clearDemo(sb);
  await loadDemo(sb, buildDemoInventory(20));
  seller = await signedInClient(`pub-vende-${run}@reboard.test`);
  other = await signedInClient(`pub-otro-${run}@reboard.test`);
});

afterAll(async () => {
  await clearStorage();
  await deleteTestUsers(sb, "pub-");
  await clearDemo(sb);
});

describe("esquema (E1)", () => {
  it("normaliza el teléfono a E.164 y rechaza datos fuera de los CHECK", () => {
    expect(ListingInput.parse(base).phone).toBe("+34600111222");
    expect(ListingInput.safeParse({ ...base, priceEur: 0 }).success).toBe(false);
    expect(ListingInput.safeParse({ ...base, volumeL: 151 }).success).toBe(false);
    expect(ListingInput.safeParse({ ...base, phone: "12" }).success).toBe(false);
    // 'manufacturer' solo con medida de catálogo (como el CHECK manufacturer_needs_catalog)
    expect(ListingInput.safeParse({ ...base, catalogSize: null }).success).toBe(false);
    expect(ListingInput.safeParse({ ...base, widthIn: null }).success).toBe(false);
  });
});

describe("publicar (E3, E4)", () => {
  let publicId = "";
  let listingId = 0;

  it("crea un borrador privado con el teléfono en la tabla privada", async () => {
    const r = await saveListing(seller.client, seller.userId, ListingInput.parse(base), null);
    publicId = r.publicId;
    listingId = r.id;
    expect(r.status).toBe("draft");
    expect(r.slug).toBe("torq-fun-tet-7-2-asturias");
    const { data: row } = await sb.from("listings").select("model_size_id, volume_source, length_source").eq("id", listingId).single();
    expect(row?.model_size_id).not.toBeNull();
    expect(row).toMatchObject({ volume_source: "seller", length_source: "manufacturer" });
    // El borrador no es público y el teléfono no lo ve nadie más.
    expect((await anonClient().from("listings").select("id").eq("id", listingId)).data).toEqual([]);
    expect((await other.client.from("listing_contacts").select("phone_e164").eq("listing_id", listingId)).data).toEqual([]);
    const { data: phone } = await seller.client.from("listing_contacts").select("phone_e164").eq("listing_id", listingId).single();
    expect(phone?.phone_e164).toBe("+34600111222");
  });

  it("solo se suben fotos a la carpeta propia y de un anuncio propio", async () => {
    expect(await upload(other.client, `${seller.userId}/${listingId}/${crypto.randomUUID()}.webp`)).not.toBeNull();
    expect(await upload(other.client, `${other.userId}/${listingId}/${crypto.randomUUID()}.webp`)).not.toBeNull();
  });

  it("no publica sin fotos subidas ni con rutas ajenas", async () => {
    const ghost = { path: `${seller.userId}/${listingId}/${crypto.randomUUID()}.webp`, width: 40, height: 120 };
    await expect(finalizeListing(seller.client, seller.userId, publicId, [ghost], true)).rejects.toThrow(PublishError);
    const foreign = { path: `${other.userId}/${listingId}/${crypto.randomUUID()}.webp`, width: 40, height: 120 };
    await expect(finalizeListing(seller.client, seller.userId, publicId, [foreign], true)).rejects.toThrow(/Vuelve a añadir las fotos/);
    await expect(finalizeListing(other.client, other.userId, publicId, [ghost], true)).rejects.toThrow(/No encontramos/);
  });

  it("con las fotos subidas, publica y aparece en la búsqueda por sus datos", async () => {
    const paths = [crypto.randomUUID(), crypto.randomUUID()].map((u) => `${seller.userId}/${listingId}/${u}.webp`);
    for (const p of paths) expect(await upload(seller.client, p)).toBeNull();
    const r = await finalizeListing(
      seller.client,
      seller.userId,
      publicId,
      paths.map((path) => ({ path, width: 40, height: 120 })),
      true,
    );
    expect(r.publicId).toBe(publicId);

    const found = await db.search(withFilters({ zone: "asturias", brand: "torq", volMin: 47, volMax: 48, priceMax: 333 }), { sort: "recientes", limit: 50 });
    const mine = found.items.find((l) => l.id === publicId);
    expect(mine, "el anuncio publicado aparece en /buscar").toBeTruthy();
    expect(mine!.photos).toHaveLength(2);
    expect(mine!.status).toBe("disponible");
    expect(mine!.contact.phone).toBeNull();
  });

  it("editar: reordena fotos, borra las quitadas de Storage y muestra la bajada de precio (E6)", async () => {
    const { data: photos } = await seller.client.from("listing_photos").select("storage_path").eq("listing_id", listingId).order("position");
    const [first, second] = photos!.map((p) => p.storage_path);
    await saveListing(seller.client, seller.userId, ListingInput.parse({ ...base, priceEur: 300 }), publicId);
    await finalizeListing(seller.client, seller.userId, publicId, [{ path: second, width: 40, height: 120 }], false);

    const { data: after } = await sb.from("listings").select("price_eur, previous_price_eur, status").eq("id", listingId).single();
    expect(after).toEqual({ price_eur: 300, previous_price_eur: 333, status: "published" });
    const { data: stored } = await sb.storage.from("listing-photos").list(`${seller.userId}/${listingId}`);
    expect(stored?.map((o) => `${seller.userId}/${listingId}/${o.name}`)).toEqual([second]);
    expect(first).not.toBe(second);
  });

  it("otro usuario no puede editar ni cambiar el estado", async () => {
    await expect(saveListing(other.client, other.userId, ListingInput.parse(base), publicId)).rejects.toThrow(/No encontramos/);
    await expect(panelAction(other.client, other.userId, publicId, "sold")).rejects.toThrow(/No encontramos/);
    const direct = await other.client.from("listings").update({ price_eur: 1 }).eq("id", listingId).select();
    expect(direct.data ?? []).toHaveLength(0);
  });

  it("panel (E5): confirmar, vendida, volver a publicar y retirar; transiciones inválidas rechazadas", async () => {
    await panelAction(seller.client, seller.userId, publicId, "confirm");
    await panelAction(seller.client, seller.userId, publicId, "sold");
    let { data } = await sb.from("listings").select("status, sold_at").eq("id", listingId).single();
    expect(data?.status).toBe("sold");
    expect(data?.sold_at).not.toBeNull();
    const ficha = await db.byId(publicId);
    expect(ficha?.status).toBe("vendida");

    await expect(panelAction(seller.client, seller.userId, publicId, "confirm")).rejects.toThrow(/Solo se confirman/);
    await panelAction(seller.client, seller.userId, publicId, "republish");
    await panelAction(seller.client, seller.userId, publicId, "withdraw");
    ({ data } = await sb.from("listings").select("status, sold_at").eq("id", listingId).single());
    expect(data).toEqual({ status: "withdrawn", sold_at: null });
    expect(await db.byId(publicId)).toBeNull();

    // El dueño sigue viendo su anuncio retirado (el panel lo lee con su sesión).
    const own = await seller.client.from("listings").select("public_id").neq("status", "draft");
    expect(own.data?.map((r) => r.public_id)).toContain(publicId);
    await expect(panelAction(seller.client, seller.userId, publicId, "price", 0)).rejects.toThrow(/precio entre 1 y 20.000/);
  });
});
