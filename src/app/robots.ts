import type { MetadataRoute } from "next";
import { siteIndexable } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Sin datos reales no se rastrea nada.
  if (!siteIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Solo se bloquea lo que no es una página (API, enlaces de acceso) o redirige a entrar.
      // Búsquedas filtradas, guardadas, comparador, publicar y legales llevan noindex: si se
      // bloquearan aquí, Google no podría leer ese noindex y podría indexar la URL sin contenido.
      disallow: ["/api/", "/auth/", "/panel", "/cuenta", "/moderacion", "/sistema"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
