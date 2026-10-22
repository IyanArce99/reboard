import type { NextConfig } from "next";

// Host de Supabase Storage (fotos de anuncios). En desarrollo es local (127.0.0.1:54321).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const supabaseIsLocal = !!supabaseUrl && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);
const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy (docs/SECURITY.md §8). Sin nonces: un nonce obliga a renderizar cada
 * página en cada petición y rompe el prerenderizado parcial (PPR). Next necesita 'unsafe-inline'
 * para sus scripts de hidratación; el resto se limita a orígenes concretos.
 * - Turnstile: script, iframe y conexión a challenges.cloudflare.com.
 * - Supabase: API (Auth, datos) y Storage (fotos, subida directa).
 */
function contentSecurityPolicy() {
  const supabase = supabaseUrl ? supabaseUrl.origin : "";
  const cloudflare = "https://challenges.cloudflare.com";
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", cloudflare, ...(isProd ? [] : ["'unsafe-eval'"])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabase, "https://images.unsplash.com"],
    "font-src": ["'self'"],
    // blob: = fotos ya procesadas en este mismo documento (las crea la página; nunca de terceros).
    "connect-src": ["'self'", "blob:", supabase, cloudflare, ...(isProd ? [] : ["ws:"])],
    "frame-src": [cloudflare],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isProd && !supabaseIsLocal ? { "upgrade-insecure-requests": [] } : {}),
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v.filter(Boolean)].join(" "))
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // La cámara la usa «Hacer foto» (input capture); nada más.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    // Formato objeto sin `search`: las URLs de Unsplash llevan query (?auto=format&w=…).
    remotePatterns: [
      // Fotos de stock de los datos DEMO (public/images/IMAGE_SOURCES.md).
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      ...(supabaseUrl
        ? [
            {
              protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
              hostname: supabaseUrl.hostname,
              port: supabaseUrl.port,
              pathname: "/storage/v1/object/public/listing-photos/**",
            },
          ]
        : []),
    ],
    qualities: [70, 75],
    // Solo para Supabase LOCAL en desarrollo: nunca con un Supabase remoto (docs/SECURITY.md).
    dangerouslyAllowLocalIP: supabaseIsLocal,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
