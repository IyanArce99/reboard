"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente del navegador: solo Auth (enviar y verificar el código) y subida de fotos a Storage. */
export function getBrowserSupabase() {
  if (!client) {
    const { url, key } = requireSupabaseEnv();
    client = createBrowserClient<Database>(url, key);
  }
  return client;
}
