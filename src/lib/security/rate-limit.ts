import "server-only";

// Límite de peticiones por IP para las API públicas de lectura (SEC-5, auditoría 24-10-2026).
// Ventana fija en memoria, por instancia del servidor: frena a un cliente que martillea una API desde
// una IP (cada combinación de filtros es una consulta nueva a la base de datos). No es un límite
// global: en Vercel cada instancia lleva su cuenta. El límite global va en el firewall de Vercel
// (regla de rate limit en /api/*, ver docs/LAUNCH_CHECKLIST.md).

const windows = new Map<string, { start: number; count: number }>();
const MAX_KEYS = 10_000;

/** IP del cliente (en Vercel, la primera de x-forwarded-for la pone la propia plataforma). */
export function requestIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconocida";
}

/**
 * Cuenta una petición de `ip` en `bucket`. Devuelve una respuesta 429 si se pasa del límite, o null.
 * `now` solo para tests.
 */
export function rateLimit(bucket: string, ip: string, limit: number, windowMs = 60_000, now = Date.now()): Response | null {
  const key = `${bucket}:${ip}`;
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    if (windows.size >= MAX_KEYS) windows.clear(); // cota de memoria
    windows.set(key, { start: now, count: 1 });
    return null;
  }
  w.count += 1;
  if (w.count <= limit) return null;
  const retry = Math.max(1, Math.ceil((w.start + windowMs - now) / 1000));
  return Response.json(
    { error: "Demasiadas peticiones. Espera un momento y vuelve a intentarlo." },
    { status: 429, headers: { "Retry-After": String(retry), "Cache-Control": "no-store" } },
  );
}

/**
 * Lo que usan las rutas: límite activo solo en Vercel (o con RATE_LIMIT=on). En local y en los e2e todas
 * las peticiones salen de la misma IP y el límite haría fallar las pruebas sin motivo.
 */
export function limitRequest(request: Request, bucket: string, limit: number): Response | null {
  const on = process.env.VERCEL === "1" || process.env.RATE_LIMIT === "on";
  return tooLongQuery(request) ?? (on ? rateLimit(bucket, requestIp(request), limit) : null);
}

/** Consulta desmesurada (nadie la genera desde la web): se rechaza sin tocar la base de datos. */
export const tooLongQuery = (request: Request) =>
  new URL(request.url).search.length > 2000 ? Response.json({ error: "Consulta demasiado larga." }, { status: 414 }) : null;

/** Solo para tests. */
export function resetRateLimits() {
  windows.clear();
}
