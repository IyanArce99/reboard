import "server-only";
import { parseSiteNotice, type SiteNotice } from "@/components/admin/settings/schema";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export type { SiteNotice };

/**
 * Aviso de la web (app_settings.site_notice, editable en /admin/configuracion). Lectura pública con
 * el cliente anónimo (RLS: is_public). Sin 'use cache': la limita la caché de la CDN de /api/aviso
 * (60 s), y así un cambio desde el panel se ve enseguida. Sin base de datos o si falla, null.
 * La sirve /api/aviso: no se lee en el layout raíz, porque cualquier dato ahí rompe la regeneración
 * en segundo plano de todas las páginas prerenderizadas (comprobado con los E2E del panel).
 */
export async function getSiteNotice(): Promise<SiteNotice | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await createPublicClient().from("app_settings").select("value").eq("key", "site_notice").maybeSingle();
    if (error || !data) return null;
    const notice = parseSiteNotice(data.value);
    return notice.active && notice.text ? notice : null;
  } catch {
    return null;
  }
}
