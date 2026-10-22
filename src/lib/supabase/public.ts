import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * Cliente ANÓNIMO sin cookies, para lecturas públicas cacheadas (`'use cache'`).
 * No lee la petición, así que se puede usar dentro de funciones cacheadas. Siempre bajo RLS como `anon`.
 */
export function createPublicClient() {
  const { url, key } = requireSupabaseEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
