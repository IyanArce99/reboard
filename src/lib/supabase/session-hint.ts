// Pista barata de sesión para el navegador (PERF-4, cierre de auditoría): sin cookie de Supabase no se
// descarga supabase-js (unos 67 KB) en cada página. Al entrar con el código, el formulario de acceso
// avisa con SIGNED_IN_EVENT y entonces sí se carga.

export const SIGNED_IN_EVENT = "rb:signed-in";

/** ¿Hay cookie de sesión de Supabase (sb-<ref>-auth-token, quizá troceada en .0, .1…)? */
export function hasSessionCookie(cookie = typeof document === "undefined" ? "" : document.cookie): boolean {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(cookie);
}
