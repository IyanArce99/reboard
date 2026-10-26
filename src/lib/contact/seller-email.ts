import "server-only";

// Mensaje de un comprador al vendedor por email, a través de Reboard (el email del vendedor nunca
// sale del servidor). Se llama desde la Server Action después de validar la entrada y Turnstile.
//
// Comprobaciones, en este orden:
// 1. El anuncio existe, está publicado y visible, y acepta email (contact_channels 'email' o 'both').
// 2. Límites persistentes (tabla email_contact_events, por IP con HMAC y por anuncio):
//    - el mismo comprador (IP) no repite al mismo anuncio en 24 h;
//    - 5 mensajes por IP y hora, 15 por IP y día;
//    - 30 mensajes por anuncio y día.
// 3. El email del vendedor: el de su cuenta, verificado (Auth). Si no lo hay, no se envía.
// 4. Envío por SMTP con Reply-To del comprador. «sent» solo si el servidor de correo lo acepta.
// Cada intento que llega al envío queda registrado (sin nombre, email ni texto del mensaje).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendMail, type Mailer } from "@/lib/email/notify";
import { sellerInquiryEmail } from "@/lib/email/templates/seller-inquiry";
import type { SellerEmailInput } from "./seller-email-schema";

type Sb = SupabaseClient<Database>;

export type SellerEmailResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "duplicate" | "rate-limited" | "not-configured" | "failed" };

export const LIMITS = { perIpHour: 5, perIpDay: 15, perListingDay: 30, duplicateHours: 24 } as const;

export async function sendSellerEmail(
  sb: Sb,
  args: { publicId: string; input: SellerEmailInput; ipHash: string; listingTitle: string; listingUrl: string },
  mailer?: Mailer,
  now = new Date(),
): Promise<SellerEmailResult> {
  const { data: l } = await sb
    .from("listings")
    .select("id, seller_id, status, moderation, contact_channels")
    .eq("public_id", args.publicId)
    .maybeSingle();
  // Mismo error para «no existe», «no está publicado» y «no acepta email»: no se revela nada.
  if (!l || l.status !== "published" || l.moderation === "removed" || l.contact_channels === "phone") {
    return { ok: false, reason: "unavailable" };
  }

  const hour = new Date(now.getTime() - 3_600_000).toISOString();
  const day = new Date(now.getTime() - 86_400_000).toISOString();
  const dup = new Date(now.getTime() - LIMITS.duplicateHours * 3_600_000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const ev = () => sb.from("email_contact_events").select("id", { count: "exact", head: true });
  const [same, ipHour, ipDay, listingDay] = await Promise.all([
    count(ev().eq("ip_hash", args.ipHash).eq("listing_id", l.id).eq("status", "sent").gte("created_at", dup)),
    count(ev().eq("ip_hash", args.ipHash).gte("created_at", hour)),
    count(ev().eq("ip_hash", args.ipHash).gte("created_at", day)),
    count(ev().eq("listing_id", l.id).gte("created_at", day)),
  ]);
  if (same > 0) return { ok: false, reason: "duplicate" };
  if (ipHour >= LIMITS.perIpHour || ipDay >= LIMITS.perIpDay || listingDay >= LIMITS.perListingDay) {
    return { ok: false, reason: "rate-limited" };
  }

  const { data: owner } = await sb.auth.admin.getUserById(l.seller_id);
  const to = owner.user?.email_confirmed_at ? owner.user.email : null;
  if (!to) return { ok: false, reason: "unavailable" };

  const mail = sellerInquiryEmail({
    listingTitle: args.listingTitle,
    listingUrl: args.listingUrl,
    buyerName: args.input.name,
    buyerEmail: args.input.email,
    buyerPhone: args.input.phone ?? null,
    message: args.input.message,
  });
  const result = await sendMail({ to, replyTo: args.input.email, ...mail }, mailer);
  if (result === "not-configured") return { ok: false, reason: "not-configured" };

  await sb.from("email_contact_events").insert({ listing_id: l.id, ip_hash: args.ipHash, status: result === "sent" ? "sent" : "failed" });
  return result === "sent" ? { ok: true } : { ok: false, reason: "failed" };
}
