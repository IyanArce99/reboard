import "server-only";

// Consultas compartidas de anuncios en el panel. Reciben el cliente de la SESIÓN del admin: lo que se
// lee pasa por RLS (listings_moderator_read, reports_read, modactions_read, photos_read).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { countByListing, lastHideOrRemoveByListing } from "./model";

type Sb = SupabaseClient<Database>;

/** Última acción hide/remove de los anuncios con moderation = 'removed' (una sola consulta). */
export async function lastHideOrRemove(sb: Sb, listingIds: number[]) {
  if (!listingIds.length) return new Map<number, string>();
  const { data } = await sb
    .from("moderation_actions")
    .select("listing_id, action")
    .in("listing_id", listingIds)
    .in("action", ["hide", "remove"])
    .order("created_at", { ascending: false })
    .limit(1000);
  return lastHideOrRemoveByListing(data ?? []);
}

/** Reportes abiertos por anuncio para los ids de una página (una sola consulta). */
export async function openReportCounts(sb: Sb, listingIds: number[]) {
  if (!listingIds.length) return new Map<number, number>();
  const { data } = await sb.from("reports").select("listing_id").eq("status", "open").in("listing_id", listingIds).limit(5000);
  return countByListing(data ?? []);
}

/** Emails de usuarios (solo admin, función admin_user_emails) en una sola llamada. */
export async function userEmails(sb: Sb, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const m = new Map<string, string>();
  if (!unique.length) return m;
  const { data } = await sb.rpc("admin_user_emails", { p_ids: unique });
  for (const r of data ?? []) m.set(r.id, r.email);
  return m;
}

export const listingTitle = (l: { brand?: { name: string } | null; brand_text: string | null; size_label: string }) =>
  `${l.brand?.name ?? l.brand_text ?? "Sin marca"} ${l.size_label}`;

export const publicListingPath = (l: { slug: string; public_id: string | null; id: number }) =>
  `/anuncio/${l.slug}-${l.public_id ?? `a${l.id}`}`;
