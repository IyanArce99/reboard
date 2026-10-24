import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/shared";
import { GUIDES, PENDING_GUIDES } from "@/lib/content/guides";
import { legalDoc } from "@/lib/content/legal";
import { catalogSlugs, listingSlug, shopSlugs } from "@/lib/data/lookup";
import { idFromSlugId } from "@/lib/listing/present";
import { coversTerritory } from "@/lib/domain/taxonomy";
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
    case "legal":
      return parts.length === 2 && !!legalDoc(a);
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
  moderacion: { requireUser: true },
  // Panel de administración: sesión obligatoria. El permiso (rol admin y MFA) lo comprueban la
  // página, cada acción y la base de datos; el proxy solo refresca la sesión y pide entrar.
  admin: { requireUser: true },
};

const privateKey = (parts: string[]) => (parts[0] === "vender" && parts[1] === "publicar" ? "vender/publicar" : parts[0]);

async function privateRoute(request: NextRequest, section: string) {
  // Sin base de datos no hay cuentas: el panel de administración no existe (404 real, no solo el contenido).
  if (!authEnabled()) return section === "admin" ? notFound(request) : NextResponse.next();
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
    let slug = id ? await listingSlug(id) : null;
    // Antes de dar un 404 o redirigir, se confirma sin caché: si el anuncio se acaba de editar (slug
    // nuevo) o publicar, la caché de 60 s tenía el dato viejo y el proxy y la página se redirigían
    // el uno al otro en bucle (QA-2, auditoría 24-10-2026).
    if (id && (!slug || `/anuncio/${slug}-${id}` !== request.nextUrl.pathname)) slug = await listingSlug(id, true);
    if (!slug) return notFound(request);
    const canonical = `/anuncio/${slug}-${id}`;
    if (canonical !== request.nextUrl.pathname) {
      // Temporal (307): una 308 se guarda en el navegador y, si el slug vuelve a cambiar (p. ej., se
      // deshace una edición), crearía un bucle. El canonical de la ficha ya indica la URL buena.
      return NextResponse.redirect(new URL(canonical, request.url), 307);
    }
    return NextResponse.next();
  }

  // /tablas/canarias(/tipo): la región es todo el territorio activo → la landing general (308).
  if (parts[0] === "tablas" && parts.length >= 2 && coversTerritory(parts[1])) {
    if (parts.length === 2) return NextResponse.redirect(new URL("/", request.url), 308);
    if (parts.length === 3 && isLandingForm(parts[2])) return NextResponse.redirect(new URL(`/tablas/${parts[2]}`, request.url), 308);
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
    "/legal/:path*",
    "/cuenta/:path*",
    "/panel/:path*",
    "/entrar",
    "/vender/publicar",
    "/moderacion/:path*",
    "/admin/:path*",
  ],
};
