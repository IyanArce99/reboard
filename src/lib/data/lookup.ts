import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Comprobaciones ligeras para src/proxy.ts (404 reales y 308 al slug canónico), fuera de
// `'use cache'` (proxy se ejecuta antes del render). Con Supabase se cachean en memoria unos
// segundos por instancia: es solo una optimización; si no acierta, se consulta de nuevo.

const TTL_MS = 60_000;
const memo = new Map<string, { at: number; value: unknown }>();

async function remember<T>(key: string, load: () => Promise<T>, fresh = false): Promise<T> {
  const hit = memo.get(key);
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await load();
  memo.set(key, { at: Date.now(), value });
  if (memo.size > 5_000) memo.clear(); // cota de memoria
  return value;
}

// Sin Supabase no hay anuncios, catálogo ni tiendas: todo da 404.
const fromSupabase = () => isSupabaseConfigured();

const anon = () =>
  createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

/**
 * Slug canónico de un anuncio visible (publicado, vendido o caducado), o null si no existe.
 * `fresh`: sin la caché en memoria (antes de redirigir: al editar, el slug puede haber cambiado).
 */
export async function listingSlug(publicId: string, fresh = false): Promise<string | null> {
  if (!fromSupabase()) return null;
  return remember(
    `listing:${publicId}`,
    async () => {
      const { data } = await anon().from("listings").select("slug").eq("public_id", publicId).maybeSingle();
      return data?.slug ?? null;
    },
    fresh,
  );
}

/** Pares marca/modelo del catálogo («torq» → ["fun-tet", …]). */
export async function catalogSlugs(): Promise<Map<string, Set<string>>> {
  const build = (rows: { brand: string; model: string }[]) => {
    const out = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!out.has(r.brand)) out.set(r.brand, new Set());
      out.get(r.brand)!.add(r.model);
    }
    return out;
  };
  if (!fromSupabase()) return build([]);
  return remember("catalog", async () => {
    const { data } = await anon().from("board_models").select("slug, brand:brands(slug)");
    return build(
      ((data ?? []) as unknown as { slug: string; brand: { slug: string } | null }[])
        .filter((r) => r.brand)
        .map((r) => ({ brand: r.brand!.slug, model: r.slug })),
    );
  });
}

export async function shopSlugs(): Promise<Set<string>> {
  if (!fromSupabase()) return new Set();
  return remember("shops", async () => {
    const { data } = await anon().from("shops").select("slug");
    return new Set((data ?? []).map((s) => s.slug));
  });
}
