import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * Cliente con SERVICE ROLE (salta RLS). Solo servidor y solo para:
 * cron de caducidad, revelar el contacto, moderación y limpieza de Storage.
 * Quien lo use debe haber verificado antes la identidad y los permisos (docs/SECURITY.md).
 */
export function createServiceClient() {
  const { url } = requireSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY (solo servidor).");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
