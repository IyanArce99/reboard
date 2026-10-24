import { getRepository } from "@/lib/data";
import { parseFilters } from "@/lib/search/filters";
import { limitRequest } from "@/lib/security/rate-limit";

/** Recuento de anuncios activos para unos filtros (botón «Buscar N tablas» de la home). */
export async function GET(request: Request) {
  // Se pide al cambiar cada filtro del buscador (con 200 ms de espera): 120 por minuto y por IP.
  const blocked = limitRequest(request, "recuento", 120);
  if (blocked) return blocked;
  const params = new URL(request.url).searchParams;
  const filters = parseFilters(Object.fromEntries(params.entries()));
  const count = await getRepository().count(filters);
  // Igual para todos: la CDN lo guarda 30 s y las repeticiones no llegan a la base de datos.
  return Response.json({ count }, { headers: { "Cache-Control": "no-store", "CDN-Cache-Control": "public, s-maxage=30" } });
}
