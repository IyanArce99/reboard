import { cookies } from "next/headers";
import { getRepository } from "@/lib/data";
import { zoneBySlug } from "@/lib/domain/taxonomy";
import { DEFAULT_HERE, HERE_COOKIE } from "@/lib/here";
import { parseFilters } from "@/lib/search/filters";

const MAX = 300;

/**
 * Anuncios activos que cumplen unos filtros (misma query que /buscar), más recientes primero.
 * Lo usa el resultado de «¿Qué tabla necesito?», que cruza en el cliente el rango de litros
 * con tipo, zona y presupuesto. Devuelve también la fecha de referencia y la zona del usuario.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filters = parseFilters(Object.fromEntries(params.entries()));
  const repo = getRepository();
  const res = await repo.search(filters, { sort: "recientes", limit: MAX });
  const zone = (await cookies()).get(HERE_COOKIE)?.value ?? "";
  return Response.json({
    listings: res.items,
    total: res.total,
    now: repo.now().toISOString(),
    here: zoneBySlug(zone) ? zone : DEFAULT_HERE,
  });
}
