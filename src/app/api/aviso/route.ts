import { connection } from "next/server";
import { getSiteNotice } from "@/lib/content/site-notice";

// Aviso de la web para la banda del layout (público, sin datos personales).
// Se resuelve en cada petición (si no, Next lo fija al compilar). La CDN lo guarda 60 s, así que un
// cambio desde /admin/configuracion tarda como mucho un minuto en verse y la base de datos recibe
// pocas lecturas.
export async function GET() {
  await connection();
  return Response.json(await getSiteNotice(), {
    // El navegador no guarda copia (si no, mostraría un aviso viejo); la CDN, 60 s.
    headers: { "Cache-Control": "no-store", "CDN-Cache-Control": "public, s-maxage=60" },
  });
}
