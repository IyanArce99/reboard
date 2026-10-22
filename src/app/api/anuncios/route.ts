import { getRepository } from "@/lib/data";

/**
 * Anuncios por id (?ids=a1040,a1047), en el orden pedido. Incluye vendidos y caducados.
 * Lo usan las pantallas cliente cuyo estado vive en el navegador: guardado y comparador.
 */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 100);
  const repo = getRepository();
  const all = await repo.all();
  const listings = ids.map((id) => all.find((l) => l.id === id)).filter(Boolean);
  return Response.json({ listings, now: repo.now().toISOString() });
}
