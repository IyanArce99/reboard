import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emptyRepository } from "./empty-repository";
import type { ListingRepository } from "./repository";
import { supabaseRepository } from "./supabase-repository";

export type { ListingRepository } from "./repository";

export type DataSource = "supabase" | "none";

/**
 * Fuente de datos: Supabase si están NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY;
 * si no, ninguna (interfaz vacía). No hay datos simulados en la app: el inventario DEMO vive solo
 * en tests/fixtures para los tests.
 */
export const dataSource = (): DataSource => (isSupabaseConfigured() ? "supabase" : "none");

/** Solo se indexa con datos reales: una web vacía no debe aparecer en buscadores. */
export const siteIndexable = () => dataSource() === "supabase";

export function getRepository(): ListingRepository {
  return dataSource() === "supabase" ? supabaseRepository : emptyRepository;
}
