import "server-only";

// Operaciones con SERVICE ROLE (fase F): revelar el contacto, caducidad, limpieza y moderación.
// Quien las llama debe haber verificado antes CAPTCHA, sesión y permisos (docs/SECURITY.md).
// Reciben el cliente como parámetro para poder probarlas contra Supabase local.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listingDbId } from "@/lib/auth/shared";

type Sb = SupabaseClient<Database>;
const BUCKET = "listing-photos";

export type RevealResult =
  | { ok: true; method: "whatsapp" | "phone"; phone: string }
  | { ok: false; reason: "not-found" | "rate-limited" | "error" };

/** Contacto de un anuncio publicado. Registra el evento y aplica el límite por IP (en la función SQL). */
export async function revealContact(sb: Sb, publicId: string, userId: string | null, ipHash: string): Promise<RevealResult> {
  const { data, error } = await sb.rpc("reveal_contact", {
    p_public_id: publicId,
    // p_user admite NULL en SQL (contacto sin registro); los tipos generados no lo reflejan.
    p_user: userId as string,
    p_ip_hash: ipHash,
  });
  if (error) return { ok: false, reason: error.message.includes("rate_limited") ? "rate-limited" : "error" };
  const row = data?.[0];
  if (!row?.phone_e164) return { ok: false, reason: "not-found" };
  return { ok: true, method: row.method, phone: row.phone_e164.replace(/^\+/, "") };
}

async function removeFolder(sb: Sb, folder: string) {
  const { data } = await sb.storage.from(BUCKET).list(folder, { limit: 100 });
  const paths = (data ?? []).map((o) => `${folder}/${o.name}`);
  if (paths.length) await sb.storage.from(BUCKET).remove(paths);
  return paths.length;
}

/**
 * Mantenimiento diario (cron): caduca lo publicado sin confirmar en 30 días y borra los
 * borradores abandonados (más de 7 días) con sus fotos de Storage.
 */
export async function dailyMaintenance(sb: Sb, now = new Date()) {
  const { data: expired, error } = await sb.rpc("expire_listings");
  if (error) throw new Error(`expire_listings: ${error.message}`);

  const limit = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { data: drafts } = await sb.from("listings").select("id, seller_id").eq("status", "draft").lt("created_at", limit).limit(500);
  let photos = 0;
  for (const d of drafts ?? []) photos += await removeFolder(sb, `${d.seller_id}/${d.id}`);
  if (drafts?.length) await sb.from("listings").delete().in("id", drafts.map((d) => d.id));

  return { expired: expired ?? 0, draftsDeleted: drafts?.length ?? 0, photosDeleted: photos };
}

export type ModerationAction = "remove" | "restore" | "dismiss_reports";

/**
 * Acción de un moderador sobre un anuncio. Queda registrada en moderation_actions.
 * Retirar oculta el anuncio (moderation = 'removed') y borra sus fotos de Storage.
 */
export async function moderate(sb: Sb, moderatorId: string, publicId: string, action: ModerationAction, reason: string | null) {
  const id = listingDbId(publicId);
  if (id == null) throw new Error("id");
  const { data: listing } = await sb.from("listings").select("id, seller_id").eq("id", id).maybeSingle();
  if (!listing) throw new Error("not-found");
  const now = new Date().toISOString();

  if (action === "remove") {
    const { error } = await sb.from("listings").update({ moderation: "removed" }).eq("id", id);
    if (error) throw new Error(error.message);
    await removeFolder(sb, `${listing.seller_id}/${id}`);
    await sb.from("listing_photos").delete().eq("listing_id", id);
    await sb.from("reports").update({ status: "resolved", resolved_at: now, resolved_by: moderatorId }).eq("listing_id", id).eq("status", "open");
  } else if (action === "restore") {
    const { error } = await sb.from("listings").update({ moderation: "visible" }).eq("id", id);
    if (error) throw new Error(error.message);
    await sb.from("reports").update({ status: "dismissed", resolved_at: now, resolved_by: moderatorId }).eq("listing_id", id).eq("status", "open");
  } else {
    await sb.from("reports").update({ status: "dismissed", resolved_at: now, resolved_by: moderatorId }).eq("listing_id", id).eq("status", "open");
    await sb.from("listings").update({ moderation: "visible" }).eq("id", id).eq("moderation", "flagged");
  }

  const { error: logError } = await sb.from("moderation_actions").insert({ listing_id: id, moderator_id: moderatorId, action, reason });
  if (logError) throw new Error(logError.message);
}
