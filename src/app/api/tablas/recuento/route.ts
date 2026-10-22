import { getRepository } from "@/lib/data";
import { parseFilters } from "@/lib/search/filters";

/** Recuento de anuncios activos para unos filtros (botón «Buscar N tablas» de la home). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filters = parseFilters(Object.fromEntries(params.entries()));
  const count = await getRepository().count(filters);
  return Response.json({ count });
}
