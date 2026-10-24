// Fotos de prueba para los anuncios DEMO del Supabase LOCAL (nunca en remoto: serviceClient() se niega
// a funcionar contra una URL que no sea local). Sirve para revisar la galería, las tarjetas y medir
// Lighthouse con fotos reales. Son fotos de tablas del banco editorial del proyecto (Pexels): en
// producción la regla sigue siendo la misma, nunca se usan como foto de un anuncio.
// Uso: npm run db:seed-photos [-- 12]   (después de npm run db:seed-demo)
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { serviceClient } from "../tests/integration/local-supabase";

const FILES = ["tabla-azul-arena", "tablas-orilla", "tabla-usada-tarima", "tablas-usadas-quillas", "tablas-alquiler", "tablas-cobertizo"];
const LABELS = ["cubierta", "fondo", "cola y quillas"];

const n = Number(process.argv[2] ?? 12);
const sb = serviceClient();
const { data: listings, error } = await sb
  .from("listings")
  .select("id, seller_id, public_id")
  .eq("status", "published")
  .order("id", { ascending: true })
  .limit(n);
if (error) throw error;

// Formato vertical, como las fotos que sube la gente desde el móvil (lado mayor 1600 px, WebP).
const images = await Promise.all(
  FILES.map(async (f) => {
    const src = await readFile(new URL(`../public/images/fotos/${f}.webp`, import.meta.url));
    const out = sharp(src).resize({ width: 1200, height: 1600, fit: "cover" }).webp({ quality: 80 });
    return { buf: await out.toBuffer(), width: 1200, height: 1600 };
  }),
);

let done = 0;
for (const [i, l] of (listings ?? []).entries()) {
  await sb.from("listing_photos").delete().eq("listing_id", l.id);
  const rows = [];
  for (let p = 0; p < 3; p++) {
    const img = images[(i + p) % images.length];
    const path = `${l.seller_id}/${l.id}/${randomUUID()}.webp`;
    const up = await sb.storage.from("listing-photos").upload(path, img.buf, { contentType: "image/webp", upsert: false });
    if (up.error) throw up.error;
    rows.push({ listing_id: l.id, storage_path: path, position: p, label: LABELS[p], width: img.width, height: img.height });
  }
  const ins = await sb.from("listing_photos").insert(rows);
  if (ins.error) throw ins.error;
  done++;
}
console.log(`Fotos de prueba en ${done} anuncios DEMO (3 por anuncio). Primeros: ${(listings ?? []).slice(0, 3).map((l) => l.public_id).join(", ")}`);
