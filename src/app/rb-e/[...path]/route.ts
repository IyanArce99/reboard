// Proxy propio hacia PostHog EU (docs/ANALYTICS.md). Por el dominio de la web, para que los bloqueadores
// no corten la analítica por el dominio de PostHog. Una ruta en vez de una «rewrite» para controlar qué
// se reenvía:
// - solo las rutas de envío de eventos (no es un proxy abierto);
// - la IP del cliente en X-Forwarded-For y el navegador en User-Agent: con ellos (y una sal diaria que
//   borra) PostHog calcula el identificador del modo sin cookies. PostHog descarta la IP (ajuste del
//   proyecto «Discard client IP data»);
// - nunca las cookies de la web ni cabeceras de sesión.
// Sin NEXT_PUBLIC_POSTHOG_KEY, 404: no hay analítica.

const INGEST = "https://eu.i.posthog.com";
const ASSETS = "https://eu-assets.i.posthog.com";
const POST_PATHS = /^(e|i\/v0\/e|batch|capture)$/;
const GET_PATHS = /^array\/[A-Za-z0-9_-]{8,80}\/config(\.js)?$/;

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

async function forward(request: Request, target: string, withBody: boolean) {
  const headers = new Headers();
  for (const h of ["content-type", "content-encoding", "user-agent", "accept"]) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  const ip = clientIp(request);
  if (ip) headers.set("x-forwarded-for", ip);
  try {
    const res = await fetch(target, {
      method: request.method,
      headers,
      body: withBody ? await request.arrayBuffer() : undefined,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
    });
  } catch {
    // PostHog caído o lento: la web no se entera (posthog-js reintenta y, si no, se pierde el evento).
    return new Response(null, { status: 204 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function POST(request: Request, { params }: Ctx) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return new Response(null, { status: 404 });
  const path = (await params).path.join("/");
  if (!POST_PATHS.test(path)) return new Response(null, { status: 404 });
  const search = new URL(request.url).search;
  return forward(request, `${INGEST}/${path}/${search}`, true);
}

export async function GET(request: Request, { params }: Ctx) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return new Response(null, { status: 404 });
  const path = (await params).path.join("/");
  if (!GET_PATHS.test(path)) return new Response(null, { status: 404 });
  return forward(request, `${ASSETS}/${path}`, false);
}
