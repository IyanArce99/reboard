import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Refresca la sesión de Supabase en `proxy` (solo rutas privadas). Los Server Components no pueden
 * escribir cookies: si el token caducado se refrescara allí, el refresh token rotado se perdería.
 * Devuelve la respuesta con las cookies nuevas y el usuario verificado (o null).
 */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Sin cookie de sesión no hay nada que refrescar: se evita una llamada a Auth por visita.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return { response, user: null };

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return { response, user: data.user ?? null };
}

/** Copia las cookies de sesión de `from` en otra respuesta (p. ej., una redirección). */
export function withSessionCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) to.cookies.set(c);
  return to;
}
