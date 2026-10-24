import "server-only";

// Verificación de Cloudflare Turnstile (gratuito) en el servidor. Se usa en las acciones
// sensibles propias (contacto, publicar, reportar). El acceso con código lo verifica Supabase Auth.
// Falla cerrado: sin clave secreta o sin respuesta de Cloudflare, la acción se rechaza.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = { ok: true } | { ok: false; reason: "missing-token" | "not-configured" | "invalid" | "unavailable" };

export type TurnstileAction = "contacto" | "publicar" | "reportar";

/** Claves secretas de prueba de Cloudflare: responden con datos ficticios (hostname «example.com»). */
const isTestSecret = (secret: string) => /^[123]x0+AA$/.test(secret);

/** Dominios en los que se acepta el captcha: el de la web (con y sin «www»). En local, ninguno (no se comprueba). */
export function allowedHostnames(siteUrl = process.env.NEXT_PUBLIC_SITE_URL): string[] {
  let host = "";
  try {
    host = siteUrl ? new URL(siteUrl).hostname : "";
  } catch {
    host = "";
  }
  if (!host || host === "localhost" || host === "127.0.0.1") return [];
  const apex = host.replace(/^www\./, "");
  return [apex, `www.${apex}`];
}

/**
 * Además de `success`, comprueba (SEC-4, auditoría 24-10-2026):
 * - `action`: el token se resolvió en el mismo formulario (un token de «reportar» no vale para pedir un teléfono);
 * - `hostname`: se resolvió en reboard.es, no en otra web que reutilice la clave pública.
 * Con las claves de prueba de Cloudflare (local y CI) estas dos comprobaciones no se hacen.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  opts: { ip?: string | null; action?: TurnstileAction; hostnames?: string[]; secret?: string; fetchImpl?: typeof fetch } = {},
): Promise<TurnstileResult> {
  const secret = opts.secret ?? process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "not-configured" };
  if (!token || token.length > 2048) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (opts.ip) body.set("remoteip", opts.ip);
  try {
    const res = await (opts.fetchImpl ?? fetch)(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const data = (await res.json()) as { success?: boolean; action?: string; hostname?: string };
    if (data.success !== true) return { ok: false, reason: "invalid" };
    if (isTestSecret(secret)) return { ok: true };
    if (opts.action && data.action !== opts.action) return { ok: false, reason: "invalid" };
    const hosts = opts.hostnames ?? allowedHostnames();
    if (hosts.length && !hosts.includes(data.hostname ?? "")) return { ok: false, reason: "invalid" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
