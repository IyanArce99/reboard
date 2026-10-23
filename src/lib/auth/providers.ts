// Proveedores de acceso social activos. Se activan en Supabase (Authentication → Providers) y,
// después, aquí con NEXT_PUBLIC_AUTH_PROVIDERS=google,apple; sin la variable no se muestra ningún botón.

export type OAuthProvider = "google" | "apple";

const KNOWN: OAuthProvider[] = ["google", "apple"];

export function enabledProviders(raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? ""): OAuthProvider[] {
  const wanted = raw.split(",").map((s) => s.trim().toLowerCase());
  return KNOWN.filter((p) => wanted.includes(p));
}
