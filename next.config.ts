import type { NextConfig } from "next";

// Host de Supabase Storage (fotos de anuncios). En desarrollo es local (127.0.0.1:54321).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const supabaseIsLocal = !!supabaseUrl && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Formato objeto sin `search`: las URLs de Unsplash llevan query (?auto=format&w=…).
    remotePatterns: [
      // Fotos de stock de los datos DEMO y editoriales (public/images/IMAGE_SOURCES.md).
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
};

export default nextConfig;
