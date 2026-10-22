import { NextResponse, type NextRequest } from "next/server";
import { GUIDES, PENDING_GUIDES } from "@/lib/content/guides";
import { catalogSlugs, listingSlug, shopSlugs } from "@/lib/data/lookup";
import { idFromSlugId } from "@/lib/listing/present";
import { isLandingForm, isLandingPlace } from "@/lib/search/landings";

// Con Cache Components, una URL con parámetros desconocidos sirve el shell con 200 antes de
// que la página llame a notFound(). Para dar códigos HTTP reales (404 y 308), que importan
// al SEO, se resuelven aquí antes de renderizar (ver «Status codes» en la guía de streaming).

const notFound = (request: NextRequest) => NextResponse.rewrite(new URL("/404", request.url), { status: 404 });

async function isValid(parts: string[]): Promise<boolean> {
  const [section, a, b] = parts;
  switch (section) {
    case "tablas":
      return parts.length === 2 ? isLandingForm(a) || isLandingPlace(a) : parts.length === 3 && isLandingPlace(a) && isLandingForm(b);
    case "marcas": {
      const models = (await catalogSlugs()).get(a);
      if (parts.length === 2) return !!models;
      return parts.length === 3 && !!models?.has(b);
    }
    case "tiendas":
      return parts.length === 2 && (await shopSlugs()).has(a);
    case "guias":
      return parts.length === 2 && [...GUIDES, ...PENDING_GUIDES].some((g) => g.slug === a);
    default:
      return true;
  }
}

export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);

  if (parts[0] === "anuncio" && parts.length === 2) {
    const id = idFromSlugId(parts[1]);
    const slug = id ? await listingSlug(id) : null;
    if (!slug) return notFound(request);
    const canonical = `/anuncio/${slug}-${id}`;
    if (canonical !== request.nextUrl.pathname) {
      return NextResponse.redirect(new URL(canonical, request.url), 308);
    }
    return NextResponse.next();
  }

  // Los índices (/tiendas, /guias) son rutas estáticas; solo se validan los segmentos dinámicos.
  if (parts.length >= 2 && !(await isValid(parts))) return notFound(request);
  return NextResponse.next();
}

export const config = {
  matcher: ["/tablas/:path*", "/anuncio/:path*", "/marcas/:path*", "/tiendas/:path+", "/guias/:path+"],
};
