// Nombre del vendedor por anuncio contra Supabase LOCAL: publicar tablas de varias personas desde una
// misma cuenta (como hace Reboard con autorización) sin que cambie el nombre de la cuenta ni el de
// los demás anuncios.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseRepository as db } from "@/lib/data/supabase-repository";
import { ListingInput, type ListingInput as Input } from "@/lib/publish/schema";
import { saveListing } from "@/lib/publish/save";
import type { Database } from "@/lib/supabase/database.types";
import { deleteTestUsers, signedInClient } from "./auth-helpers";
import { serviceClient } from "./local-supabase";

type Sb = SupabaseClient<Database>;
const sb = serviceClient();
const run = Date.now().toString(36);
let account: { client: Sb; userId: string };

const base: Input = {
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
  zoneSlug: "gran-canaria",
  town: "Las Palmas de G.C.",
  contactMethod: "whatsapp",
  phone: "611 000 444",
};

async function publish(sellerName: string | null) {
  const r = await saveListing(account.client, account.userId, ListingInput.parse({ ...base, sellerName }), null);
  // Publicado por el servidor (el paso de fotos no hace falta para leer el nombre).
  await sb.from("listing_photos").insert({ listing_id: r.id, storage_path: `${account.userId}/${r.id}/x.webp`, position: 0, width: 10, height: 10 });
  await sb.from("listings").update({ status: "published" }).eq("id", r.id);
  return r;
}

beforeAll(async () => {
  await deleteTestUsers(sb, "nombre-");
  account = await signedInClient(`nombre-reboard-${run}@reboard.test`);
  await sb.from("profiles").update({ display_name: "Reboard" }).eq("id", account.userId);
});

afterAll(async () => {
  await deleteTestUsers(sb, "nombre-");
});

describe("nombre del vendedor por anuncio", () => {
  it("dos anuncios de la misma cuenta con vendedores distintos; la cuenta no cambia", async () => {
    const pedro = await publish("Pedro");
    const laura = await publish("Laura");
    expect((await db.byId(pedro.publicId))?.seller.name).toBe("Pedro");
    expect((await db.byId(laura.publicId))?.seller.name).toBe("Laura");
    const { data: profile } = await sb.from("profiles").select("display_name").eq("id", account.userId).single();
    expect(profile?.display_name).toBe("Reboard");
  });

  it("sin nombre propio, el anuncio muestra el de la cuenta (anuncios anteriores)", async () => {
    const r = await publish(null);
    expect((await db.byId(r.publicId))?.seller.name).toBe("Reboard");
  });

  it("al editar se cambia solo ese anuncio", async () => {
    const a = await publish("Marta");
    const b = await publish("Juan");
    await saveListing(account.client, account.userId, ListingInput.parse({ ...base, sellerName: "Marta G." }), a.publicId);
    expect((await sb.from("listings").select("seller_name").eq("id", a.id).single()).data?.seller_name).toBe("Marta G.");
    expect((await sb.from("listings").select("seller_name").eq("id", b.id).single()).data?.seller_name).toBe("Juan");
  });

  it("nombre fuera de límites: no se guarda (queda el de la cuenta)", () => {
    expect(ListingInput.parse({ ...base, sellerName: "J" }).sellerName).toBeNull();
    expect(ListingInput.parse({ ...base, sellerName: "  Ana   María " }).sellerName).toBe("Ana María");
  });
});
