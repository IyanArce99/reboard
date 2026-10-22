import "server-only";
import { listingDbId } from "@/lib/auth/shared";
import { LISTING_SELECT, rowToListing, type ListingWithRelations } from "@/lib/data/supabase-mapping";
import { photoUrl } from "@/lib/supabase/env";
import { createUserClient } from "@/lib/supabase/server";
import { draftFromListing, type PublishDraft } from "./draft";

/**
 * Borrador para editar un anuncio PROPIO (E6). Lee con el cliente del usuario: RLS solo devuelve
 * anuncios suyos en cualquier estado, y el teléfono privado de listing_contacts.
 * `null` sin sesión; `"ajeno"` si el anuncio no existe o no es suyo.
 */
export async function loadOwnDraft(publicId: string): Promise<{ draft: PublishDraft; id: string } | "ajeno" | null> {
  const sb = await createUserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const id = listingDbId(publicId);
  if (id == null) return "ajeno";

  const [{ data: row }, { data: photos }, { data: contact }] = await Promise.all([
    sb.from("listings").select(LISTING_SELECT).eq("id", id).eq("seller_id", auth.user.id).maybeSingle(),
    sb.from("listing_photos").select("storage_path, width, height").eq("listing_id", id).order("position"),
    sb.from("listing_contacts").select("phone_e164").eq("listing_id", id).maybeSingle(),
  ]);
  if (!row) return "ajeno";

  const listing = rowToListing(row as unknown as ListingWithRelations, new Date(), photoUrl);
  const draft = draftFromListing(listing);
  draft.photos = (photos ?? []).map((p) => ({
    url: photoUrl(p.storage_path),
    local: false,
    path: p.storage_path,
    width: p.width ?? undefined,
    height: p.height ?? undefined,
  }));
  draft.phone = contact?.phone_e164 ?? "";
  if (draft.contact !== "phone") draft.contact = "whatsapp";
  return { draft, id: listing.id };
}
