import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/shared";
import { GUIDES, PENDING_GUIDES } from "@/lib/content/guides";
import { catalogSlugs, listingSlug, shopSlugs } from "@/lib/data/lookup";
import { idFromSlugId } from "@/lib/listing/present";
import { isLandingForm, isLandingPlace } from "@/lib/search/landings";
import { refreshSession, withSessionCookies } from "@/lib/supabase/proxy-session";

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

/**
 * Rutas privadas: se refresca la sesión y, si hace falta cuenta, se pide entrar.
 * Publicar no exige cuenta al empezar: se pide al final (decisión aprobada).
 */
const PRIVATE: Record<string, { requireUser: boolean }> = {
  cuenta: { requireUser: true },
  panel: { requireUser: true },
  entrar: { requireUser: false },
  "vender/publicar": { requireUser: false },
};

const privateKey = (parts: string[]) => (parts[0] === "vender" && parts[1] === "publicar" ? "vender/publicar" : parts[0]);

async function privateRoute(request: NextRequest, section: string) {
  if (!authEnabled()) return NextResponse.next();
  const { response, user } = await refreshSession(request);
  if (user && section === "entrar") {
    const next = safeNext(request.nextUrl.searchParams.get("siguiente"));
    return withSessionCookies(response, NextResponse.redirect(new URL(next, request.url)));
  }
  if (!user && PRIVATE[section].requireUser) {
    const login = new URL("/entrar", request.url);
    login.searchParams.set("siguiente", request.nextUrl.pathname + request.nextUrl.search);
    return withSessionCookies(response, NextResponse.redirect(login));
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const key = privateKey(parts);
  if (key && Object.hasOwn(PRIVATE, key)) return privateRoute(request, key);

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
  matcher: [
    "/tablas/:path*",
    "/anuncio/:path*",
    "/marcas/:path*",
    "/tiendas/:path+",
    "/guias/:path+",
    "/cuenta/:path*",
    "/panel/:path*",
    "/entrar",
    "/vender/publicar",
  ],
};
