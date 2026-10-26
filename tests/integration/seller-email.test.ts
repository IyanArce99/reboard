// Contacto privado por email contra Supabase LOCAL: publicar con «solo email» (sin teléfono), enviar
// el mensaje con un servidor de correo simulado, errores del proveedor, límites y duplicados, y que
// el email del vendedor nunca sale por las vías públicas.

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSellerEmail, LIMITS } from "@/lib/contact/seller-email";
import { supabaseRepository as db } from "@/lib/data/supabase-repository";
import type { MailMessage } from "@/lib/email/notify";
import { ListingInput, type ListingInput as Input } from "@/lib/publish/schema";
import { finalizeListing, saveListing } from "@/lib/publish/save";
import type { Database } from "@/lib/supabase/database.types";
import { anonClient, deleteTestUsers, signedInClient } from "./auth-helpers";
import { serviceClient } from "./local-supabase";

type Sb = SupabaseClient<Database>;
const sb = serviceClient();
const run = Date.now().toString(36);
let seller: { client: Sb; userId: string };
const sellerEmail = `mail-vende-${run}@reboard.test`;

const base: Input = {
  brandSlug: null,
  modelSlug: null,
  catalogSize: null,
  brandText: "Shaper local",
  modelText: null,
  sizeLabel: `7'0"`,
  lengthIn: 84,
  lengthSource: "seller",
  widthIn: null,
  widthSource: null,
  thicknessIn: null,
  thicknessSource: null,
  volumeL: 45,
  volumeSource: "seller",
  shape: "evolutiva",
  construction: "pu",
  condition: "buen-estado",
  repairs: "",
  description: "",
  priceEur: 180,
  zoneSlug: "lanzarote",
  town: "Famara",
  contactMethod: "whatsapp",
  contactChannels: "email",
  phone: "",
};

async function publish(over: Partial<Input> = {}) {
  const r = await saveListing(seller.client, seller.userId, ListingInput.parse({ ...base, ...over }), null);
  const path = `${seller.userId}/${r.id}/${crypto.randomUUID()}.webp`;
  const buf = await sharp({ create: { width: 20, height: 60, channels: 3, background: "#087e8b" } }).webp().toBuffer();
  await seller.client.storage.from("listing-photos").upload(path, new Blob([new Uint8Array(buf)], { type: "image/webp" }), { contentType: "image/webp" });
  await finalizeListing(seller.client, seller.userId, r.publicId, [{ path, width: 20, height: 60 }], true);
  return r;
}

const buyer = { name: "Ana", email: "ana@test.invalid", phone: null as string | null, message: "¡Hola! ¿Sigue disponible la tabla?" };
const args = (publicId: string, ipHash: string) => ({ publicId, input: buyer, ipHash, listingTitle: "Evolutiva 7'0\"", listingUrl: "https://www.reboard.es/anuncio/x" });

beforeAll(async () => {
  await deleteTestUsers(sb, "mail-");
  seller = await signedInClient(sellerEmail);
});

afterAll(async () => {
  const { data: folders } = await sb.storage.from("listing-photos").list(seller.userId);
  for (const f of folders ?? []) {
    const { data: files } = await sb.storage.from("listing-photos").list(`${seller.userId}/${f.name}`);
    if (files?.length) await sb.storage.from("listing-photos").remove(files.map((x) => `${seller.userId}/${f.name}/${x.name}`));
  }
  await deleteTestUsers(sb, "mail-");
});

describe("publicar con contacto por email", () => {
  it("«solo email» se publica sin teléfono y no guarda teléfono", async () => {
    const r = await publish();
    const { data: row } = await sb.from("listings").select("status, contact_channels").eq("id", r.id).single();
    expect(row).toEqual({ status: "published", contact_channels: "email" });
    const { data: phone } = await sb.from("listing_contacts").select("listing_id").eq("listing_id", r.id);
    expect(phone).toEqual([]);
  });

  it("pasar de teléfono a solo email borra el teléfono guardado", async () => {
    const r = await publish({ contactChannels: "phone", phone: "611 000 222" });
    expect((await sb.from("listing_contacts").select("listing_id").eq("listing_id", r.id)).data).toHaveLength(1);
    await saveListing(seller.client, seller.userId, ListingInput.parse(base), r.publicId);
    expect((await sb.from("listing_contacts").select("listing_id").eq("listing_id", r.id)).data).toEqual([]);
  });

  it("la API pública no da el email del vendedor ni el registro de mensajes", async () => {
    const r = await publish();
    const l = await db.byId(r.publicId);
    expect(l?.contact.channels).toBe("email");
    expect(JSON.stringify(l)).not.toContain(sellerEmail);
    const anon = anonClient();
    const { data: rows } = await anon.from("listings").select("*").eq("public_id", r.publicId);
    expect(JSON.stringify(rows)).not.toContain(sellerEmail);
    expect((await anon.from("email_contact_events").select("id")).error?.code).toBe("42501");
    expect((await seller.client.from("email_contact_events").select("id")).error?.code).toBe("42501");
  });
});

describe("enviar un mensaje al vendedor", () => {
  it("llega al email de su cuenta, con Reply-To del comprador; se registra sin el texto", async () => {
    const r = await publish();
    const sent: (MailMessage & { from: string })[] = [];
    const res = await sendSellerEmail(sb, args(r.publicId, `ip-ok-${run}`), async (m) => void sent.push(m));
    expect(res).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(sellerEmail);
    expect(sent[0].replyTo).toBe(buyer.email);
    expect(sent[0].subject).toBe("Nuevo interesado en tu tabla — REBOARD");
    expect(sent[0].text).toContain(buyer.message);
    expect(sent[0].text).not.toContain("Teléfono:"); // sin teléfono, no aparece la línea
    const { data: ev } = await sb.from("email_contact_events").select("*").eq("listing_id", r.id);
    expect(ev).toHaveLength(1);
    expect(ev![0].status).toBe("sent");
    expect(JSON.stringify(ev)).not.toContain(buyer.email);
    expect(JSON.stringify(ev)).not.toContain(buyer.message);
  });

  it("con teléfono opcional, el vendedor lo recibe en el email (y no se guarda)", async () => {
    const r = await publish();
    const sent: (MailMessage & { from: string })[] = [];
    const withPhone = { ...args(r.publicId, `ip-tel-${run}`), input: { ...buyer, phone: "+34600111222" } };
    expect(await sendSellerEmail(sb, withPhone, async (m) => void sent.push(m))).toEqual({ ok: true });
    expect(sent[0].text).toContain("Teléfono: +34600111222");
    expect(sent[0].html).toContain('href="tel:+34600111222"');
    const { data: ev } = await sb.from("email_contact_events").select("*").eq("listing_id", r.id);
    expect(JSON.stringify(ev)).not.toContain("600111222");
  });

  it("el mismo comprador no repite al mismo anuncio (24 h)", async () => {
    const r = await publish();
    const mailer = async () => {};
    expect(await sendSellerEmail(sb, args(r.publicId, `ip-dup-${run}`), mailer)).toEqual({ ok: true });
    expect(await sendSellerEmail(sb, args(r.publicId, `ip-dup-${run}`), mailer)).toEqual({ ok: false, reason: "duplicate" });
  });

  it(`límite por IP: ${LIMITS.perIpHour} por hora`, async () => {
    const ip = `ip-lim-${run}`;
    const mailer = async () => {};
    for (let i = 0; i < LIMITS.perIpHour; i++) {
      const r = await publish();
      expect(await sendSellerEmail(sb, args(r.publicId, ip), mailer)).toEqual({ ok: true });
    }
    const extra = await publish();
    expect(await sendSellerEmail(sb, args(extra.publicId, ip), mailer)).toEqual({ ok: false, reason: "rate-limited" });
  });

  it("si el servidor de correo falla, no se informa de éxito y queda registrado como fallido", async () => {
    const r = await publish();
    const res = await sendSellerEmail(sb, args(r.publicId, `ip-fail-${run}`), async () => {
      throw new Error("SMTP 554");
    });
    expect(res).toEqual({ ok: false, reason: "failed" });
    const { data: ev } = await sb.from("email_contact_events").select("status").eq("listing_id", r.id);
    expect(ev).toEqual([{ status: "failed" }]);
  });

  it("no envía si el anuncio no acepta email, no está publicado o no existe (mismo error)", async () => {
    const mailer = async () => {
      throw new Error("no debería enviarse");
    };
    const phoneOnly = await publish({ contactChannels: "phone", phone: "611 000 333" });
    expect(await sendSellerEmail(sb, args(phoneOnly.publicId, `ip-x1-${run}`), mailer)).toEqual({ ok: false, reason: "unavailable" });
    const sold = await publish();
    await sb.from("listings").update({ status: "sold" }).eq("id", sold.id);
    expect(await sendSellerEmail(sb, args(sold.publicId, `ip-x2-${run}`), mailer)).toEqual({ ok: false, reason: "unavailable" });
    expect(await sendSellerEmail(sb, args("a999999999", `ip-x3-${run}`), mailer)).toEqual({ ok: false, reason: "unavailable" });
  });
});
