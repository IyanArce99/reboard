import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

// Manifest de la web (añadir a la pantalla de inicio en el móvil). Iconos generados desde
// public/brand/reboard-app-icon.svg.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · Tablas de surf de segunda mano`,
    short_name: SITE_NAME,
    description: "Compra y vende tablas de surf de segunda mano en España.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#EFF6F5",
    theme_color: "#102D3B",
    icons: [
      { src: "/brand/reboard-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/reboard-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
