import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Fotos de stock de los datos DEMO (ver public/images/IMAGE_SOURCES.md).
    // En producción se sustituirá por el almacenamiento de imágenes real (pendiente).
    // Formato objeto sin `search`: las URLs de Unsplash llevan query (?auto=format&w=…).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
    qualities: [70, 75],
  },
};

export default nextConfig;
