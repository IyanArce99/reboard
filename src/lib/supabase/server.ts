import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * Cliente del USUARIO en el servidor (Server Components, Server Actions, Route Handlers).
 * Lee la sesión de las cookies; todo lo que hace va bajo RLS como `authenticated` (o `anon`).
 * Para saber quién es el usuario usa siempre `auth.getUser()` (valida el token), nunca `getSession()`.
 */
export async function createUserClient() {
  const { url, key } = requireSupabaseEnv();
  // Siempre en tiempo de petición: el cliente de Auth lee Date.now() y no debe evaluarse al prerenderizar.
  await connection();
  const store = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // En un Server Component no se pueden escribir cookies: el refresco lo hace proxy.ts.
        }
      },
    },
  });
}

/** Usuario verificado contra Supabase Auth, o null. */
export async function getUser() {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
