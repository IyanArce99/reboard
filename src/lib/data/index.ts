import "server-only";
import { mockRepository } from "./mock-repository";
import type { ListingRepository } from "./repository";
import { supabaseRepository } from "./supabase-repository";

export type { ListingRepository } from "./repository";

export type DataSource = "mock" | "supabase";

export const dataSource = (): DataSource => (process.env.REBOARD_DATA_SOURCE === "supabase" ? "supabase" : "mock");

/**
 * Repositorio de datos según REBOARD_DATA_SOURCE:
 * - `mock` (por defecto): inventario DEMO en memoria (desarrollo, tests, Preview de Vercel).
 * - `supabase`: datos reales (requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).
 */
export function getRepository(): ListingRepository {
  const source = process.env.REBOARD_DATA_SOURCE ?? "mock";
  if (source === "mock") return mockRepository;
  if (source === "supabase") return supabaseRepository;
  throw new Error(`REBOARD_DATA_SOURCE="${source}" no es válido: usa "mock" o "supabase".`);
}
