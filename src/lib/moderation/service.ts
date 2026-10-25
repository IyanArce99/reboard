import "server-only";

// Operaciones de la fase F: revelar el contacto, caducidad y limpieza, y borrar cuentas, con SERVICE
// ROLE (quien las llama debe haber verificado antes CAPTCHA, sesión y permisos, docs/SECURITY.md);
// la moderación, en cambio, usa el cliente de la sesión y la base de datos comprueba el rol.
// Reciben el cliente como parámetro para poder probarlas contra Supabase local.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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
/** Plazo de conservación de anuncios cerrados y registros (docs legales: «12 meses»). */
export const RETENTION_DAYS = 365;

export async function dailyMaintenance(sb: Sb, now = new Date()) {
  const { data: expired, error } = await sb.rpc("expire_listings");
  if (error) throw new Error(`expire_listings: ${error.message}`);

  const limit = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { data: drafts } = await sb.from("listings").select("id, seller_id").eq("status", "draft").lt("created_at", limit).limit(500);
  let photos = 0;
  for (const d of drafts ?? []) photos += await removeFolder(sb, `${d.seller_id}/${d.id}`);
  if (drafts?.length) await sb.from("listings").delete().in("id", drafts.map((d) => d.id));

  // Conservación (Política de privacidad): 12 meses.
  // - Anuncios vendidos, caducados o retirados sin cambios en 12 meses: se borran con sus fotos (en
  //   cascada: contactos, guardados, reportes y acciones de moderación de ese anuncio).
  // - Registro de contactos, reportes, acciones de moderación y auditoría de más de 12 meses: se borran.
  const year = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString();
  const { data: old } = await sb
    .from("listings")
    .select("id, seller_id")
    .in("status", ["sold", "expired", "withdrawn"])
    .lt("updated_at", year)
    .limit(500);
  for (const l of old ?? []) photos += await removeFolder(sb, `${l.seller_id}/${l.id}`);
  if (old?.length) await sb.from("listings").delete().in("id", old.map((l) => l.id));
  for (const table of ["contact_events", "reports", "moderation_actions", "admin_audit_log"] as const) {
    const { error: e } = await sb.from(table).delete().lt("created_at", year);
    if (e) throw new Error(`limpieza ${table}: ${e.message}`);
  }

  return { expired: expired ?? 0, draftsDeleted: drafts?.length ?? 0, oldListingsDeleted: old?.length ?? 0, photosDeleted: photos };
}

export type ModerationAction = "hide" | "remove" | "restore" | "mark_sold" | "dismiss_reports" | "resolve_reports";

/**
 * Acción de moderación sobre un anuncio con el cliente de la SESIÓN del moderador o admin (nunca
 * service role): la función admin_moderate_listing comprueba el rol en la base de datos, aplica el
 * cambio y lo registra en moderation_actions y en la auditoría en la misma transacción.
 * Ninguna acción borra fotos ni datos del vendedor (ocultar y retirar solo cambian la visibilidad).
 * Devuelve el error de la base de datos (o null) para que quien llama lo traduzca.
 */
export async function moderate(sb: Sb, publicId: string, action: ModerationAction, reason: string | null) {
  const { error } = await sb.rpc("admin_moderate_listing", {
    p_public_id: publicId,
    p_action: action,
    // p_reason admite NULL en SQL; los tipos generados no lo reflejan.
    p_reason: reason as string,
  });
  return error;
}

/**
 * Borra una cuenta (derecho de supresión): primero las fotos de Storage de todos sus anuncios
 * (Storage no tiene claves foráneas) y después el usuario de Auth, que borra en cascada perfil,
 * anuncios, fotos registradas, contacto privado, guardados y reportes.
 */
export async function deleteAccount(sb: Sb, userId: string) {
  const { data: folders } = await sb.storage.from(BUCKET).list(userId, { limit: 1000 });
  let photos = 0;
  for (const f of folders ?? []) photos += await removeFolder(sb, `${userId}/${f.name}`);
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return { photosDeleted: photos };
}
