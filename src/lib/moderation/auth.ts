import "server-only";
import { authEnabled } from "@/lib/auth/config";
import { createUserClient } from "@/lib/supabase/server";

/** Usuario con sesión y rol de moderador (comprobado en la base de datos con is_moderator()), o null. */
export async function currentModerator() {
  if (!authEnabled()) return null;
  const sb = await createUserClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: isMod } = await sb.rpc("is_moderator");
  return isMod ? { sb, user: data.user } : null;
}
