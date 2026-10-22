import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { GUIDES, PENDING_GUIDES } from "@/lib/content/guides";
import { slugify } from "@/lib/domain/taxonomy";
import { idFromSlugId, listingPath } from "@/lib/listing/present";
import { isLandingForm, isLandingPlace } from "@/lib/search/landings";

// Con Cache Components, una URL con parámetros desconocidos sirve el shell con 200 antes de
// que la página llame a notFound(). Para dar códigos HTTP reales (404 y 308), que importan
// al SEO, se resuelven aquí antes de renderizar (ver «Status codes» en la guía de streaming).

const notFound = (request: NextRequest) => NextResponse.rewrite(new URL("/404", request.url), { status: 404 });

async function isValid(parts: string[]): Promise<boolean> {
  const [section, a, b] = parts;
  const repo = getRepository();
  switch (section) {
    case "tablas":
      return parts.length === 2 ? isLandingForm(a) || isLandingPlace(a) : parts.length === 3 && isLandingPlace(a) && isLandingForm(b);
    case "marcas": {
      const catalog = await repo.catalog();
      if (parts.length === 2) return catalog.some((m) => slugify(m.brand) === a);
      return parts.length === 3 && catalog.some((m) => slugify(m.brand) === a && m.slug === b);
    }
    case "tiendas":
      return parts.length === 2 && (await repo.shops()).some((s) => s.slug === a);
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
    const listing = id ? await getRepository().byId(id) : null;
    if (!listing) return notFound(request);
    const canonical = listingPath(listing);
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
