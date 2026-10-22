// Conexión al Supabase LOCAL para tests de integración y medición de rendimiento.
// Lee las claves de `supabase status` (valores locales por defecto, no son credenciales reales)
// y se niega a funcionar contra cualquier URL que no sea local.

import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function localSupabaseEnv() {
  const out = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const env = Object.fromEntries(
    out
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
  const url = env.API_URL;
  if (!url || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`Los tests de integración solo se ejecutan contra Supabase LOCAL (API_URL=${url ?? "?"}).`);
  }
  return { url, anonKey: env.ANON_KEY, serviceKey: env.SERVICE_ROLE_KEY };
}

export function assertLocal(url: string) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) throw new Error(`URL no local: ${url}`);
}

export function serviceClient() {
  const { url, serviceKey } = localSupabaseEnv();
  assertLocal(url);
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
