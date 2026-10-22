// Configuración pública de Supabase. La URL y la clave anon/publishable son públicas por diseño
// (todo va bajo RLS). Las claves secretas viven en service.ts (solo servidor).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function requireSupabaseEnv() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Ver .env.example y docs/ARCHITECTURE.md §5.",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

export const PHOTOS_BUCKET = "listing-photos";

/** URL pública de una foto de anuncio en Storage. */
export const photoUrl = (storagePath: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
