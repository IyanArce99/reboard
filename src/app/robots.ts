import type { MetadataRoute } from "next";
import { getRepository } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Con datos DEMO no se rastrea nada.
  if (getRepository().isDemo) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/buscar?",
        "/guardado",
        "/alertas",
        "/panel",
        "/cuenta",
        "/entrar",
        "/auth/",
        "/moderacion",
        "/comparar",
        "/vender/publicar",
        "/sistema",
        "/legal/",
        "/api/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
