import "server-only";

// Verificación de Cloudflare Turnstile (gratuito) en el servidor. Se usa en las acciones
// sensibles propias (contacto, publicar, reportar). El acceso con código lo verifica Supabase Auth.
// Falla cerrado: sin clave secreta o sin respuesta de Cloudflare, la acción se rechaza.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = { ok: true } | { ok: false; reason: "missing-token" | "not-configured" | "invalid" | "unavailable" };

export async function verifyTurnstile(
  token: string | null | undefined,
  opts: { ip?: string | null; secret?: string; fetchImpl?: typeof fetch } = {},
): Promise<TurnstileResult> {
  const secret = opts.secret ?? process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "not-configured" };
  if (!token || token.length > 2048) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (opts.ip) body.set("remoteip", opts.ip);
  try {
    const res = await (opts.fetchImpl ?? fetch)(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? { ok: true } : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
