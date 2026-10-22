// Fotografías editoriales de Reboard (Pexels, licencia gratuita: https://www.pexels.com/license/).
// Descarga cada foto del CDN de Pexels, la redimensiona y la guarda en WebP en public/images/fotos/,
// y genera src/lib/photos.ts con dimensiones, alt, crédito y un placeholder borroso.
// Uso: node scripts/photos.mjs   (re-ejecutable; sobrescribe los archivos generados)
//
// Criterios (docs/DESIGN_AUDIT.md): surf cotidiano y principiantes, tablas usadas, talleres y playas
// reales; personas de espaldas o sin rostro reconocible en contextos promocionales; nunca como si
// fueran fotos de anuncios.

import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const PHOTOS = [
  { slug: "hero-surfistas-orilla", id: 7938813, max: 2400, alt: "Dos surfistas con tablas de espuma caminan por la orilla hacia el agua", title: "Vista trasera de hombre y mujer caminando por la orilla del mar", author: "Kampus Production", profile: "https://www.pexels.com/@kampus/", place: "Portugal" },
  { slug: "tablas-cobertizo", id: 39306043, max: 1600, alt: "Tablas de surf guardadas en las baldas de un cobertizo de madera", title: "Tablas de surf apiladas bajo un cobertizo de madera a la luz del sol", author: "Justyna Sieczka", profile: "https://www.pexels.com/@justyna-sieczka-2161487384/" },
  { slug: "tabla-usada-tarima", id: 9989546, max: 1600, alt: "Tabla de surf usada con un invento enrollado sobre una tarima de madera", title: "Tabla de surf en suelo de madera", author: "Enric Cruz López", profile: "https://www.pexels.com/@enric-cruz-lopez/" },
  { slug: "aprendiendo-espuma", id: 27972239, max: 2000, alt: "Una surfista se pone de pie en la espuma, con otros surfistas al fondo", title: "Una mujer en un traje de neopreno montando una tabla de surf", author: "Luke Miller", profile: "https://www.pexels.com/@bylukemiller/" },
  { slug: "tablas-usadas-quillas", id: 8758833, max: 1800, alt: "Tablas de surf usadas apiladas, con las quillas a la vista", title: "Tablas de surf sucias apiladas", author: "Viktorya Sergeeva", profile: "https://www.pexels.com/@johndetochka/" },
  { slug: "shaper-taller", id: 5967748, max: 1800, alt: "Manos de un shaper midiendo una tabla en el taller", title: "Artesano de tablas de surf fabricando en el taller", author: "Lachlan Ross", profile: "https://www.pexels.com/@lachlan-ross/" },
  { slug: "tablas-taghazout", id: 35498004, max: 1400, alt: "Tablas de surf de colores en un expositor al aire libre", title: "Tablas de surf vibrantes en Taghazout, Marruecos", author: "Jillian Morkan", profile: "https://www.pexels.com/@jillmorkan/", place: "Taghazout, Marruecos" },
  { slug: "tablas-alquiler", id: 4330130, max: 1400, alt: "Tablas de surf amarillas apoyadas en la pared de madera de una caseta de playa", title: "Tablas de surf y trajes de neopreno en la entrada del vestuario", author: "ArtHouse Studio", profile: "https://www.pexels.com/@arthousestudio/" },
  { slug: "surfista-a-coruna", id: 12289529, max: 2000, alt: "Surfista caminando por la orilla con una tabla larga bajo el brazo", title: "Un surfista sosteniendo su tabla mientras camina por la playa", author: "Tanhauser Vázquez R.", profile: "https://www.pexels.com/@tanhauser/", place: "A Coruña, España" },
  { slug: "surfistas-camino", id: 7938811, max: 2000, alt: "Dos surfistas con traje de neopreno llevan sus tablas hacia la playa", title: "Surfistas llevando tablas de surf", author: "Kampus Production", profile: "https://www.pexels.com/@kampus/", place: "Nazaré, Portugal" },
  { slug: "atardecer-playa", id: 13581275, max: 2400, alt: "Dos surfistas con sus tablas en una playa amplia al atardecer", title: "Personas caminando por la playa mientras llevan tablas de surf", author: "Victoria Marzullo", profile: "https://www.pexels.com/@victoria-marzullo-310266016/", place: "Mar del Plata, Argentina" },
  { slug: "tabla-azul-arena", id: 2570905, max: 1400, alt: "Tabla de surf azul con su invento apoyada en la arena", title: "Tabla de surf azul en la arena", author: "Alexa Fernando", profile: "https://www.pexels.com/@alexa-fernando-1335156/" },
  { slug: "surfista-niebla", id: 1481806, max: 1400, alt: "Surfista caminando con su tabla en una playa con niebla, en blanco y negro", title: "Foto en escala de grises de hombre llevando una tabla de surf", author: "Romina Ordóñez", profile: "https://www.pexels.com/@romina-ordonez-660357/" },
  { slug: "tablas-orilla", id: 2570906, max: 1400, alt: "Dos tablas de surf en la arena, una con la cubierta y otra con las quillas a la vista", title: "Tablas de surf azul y blanca en la orilla", author: "Alexa Fernando", profile: "https://www.pexels.com/@alexa-fernando-1335156/" },
  { slug: "clase-surf", id: 19756565, max: 1800, alt: "Una alumna practica la postura sobre la tabla en la arena junto a su instructor", title: "Mujer aprendiendo a surfear con instructor", author: "Serg Alesenko", profile: "https://www.pexels.com/@sergk1/" },
  { slug: "entrando-al-agua", id: 7938858, max: 2000, alt: "Dos surfistas entran al agua con sus tablas", title: "Dos personas surfeando en la playa", author: "Kampus Production", profile: "https://www.pexels.com/@kampus/", place: "Portugal" },
];

const OUT_DIR = "public/images/fotos";
mkdirSync(OUT_DIR, { recursive: true });

const entries = [];
for (const p of PHOTOS) {
  const url = `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&w=${p.max}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${p.slug}: HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const img = sharp(input).rotate();
  const { data, info } = await img
    .resize({ width: p.max, withoutEnlargement: true })
    .webp({ quality: 74, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  writeFileSync(`${OUT_DIR}/${p.slug}.webp`, data);
  const blur = await sharp(input).rotate().resize(16).webp({ quality: 40 }).toBuffer();
  entries.push({
    ...p,
    src: `/images/fotos/${p.slug}.webp`,
    width: info.width,
    height: info.height,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    pexels: `https://www.pexels.com/photo/${p.id}/`,
    kb: Math.round(data.length / 1024),
  });
  console.log(`${p.slug}: ${info.width}x${info.height} · ${Math.round(data.length / 1024)} KB`);
}

const ts = `// GENERADO por scripts/photos.mjs: no editar a mano.
// Fotografías editoriales de Pexels (licencia gratuita, atribución no obligatoria; se acredita igualmente).
// Son fotos de ambiente: nunca se usan como fotos de anuncios. Fuentes: public/images/IMAGE_SOURCES.md.

export interface EditorialPhoto {
  src: string;
  width: number;
  height: number;
  alt: string;
  blurDataURL: string;
  credit: { author: string; profile: string; pexels: string; title: string; place?: string };
}

export const PHOTOS = {
${entries
  .map(
    (e) => `  "${e.slug}": {
    src: ${JSON.stringify(e.src)},
    width: ${e.width},
    height: ${e.height},
    alt: ${JSON.stringify(e.alt)},
    blurDataURL: ${JSON.stringify(e.blurDataURL)},
    credit: { author: ${JSON.stringify(e.author)}, profile: ${JSON.stringify(e.profile)}, pexels: ${JSON.stringify(e.pexels)}, title: ${JSON.stringify(e.title)}${e.place ? `, place: ${JSON.stringify(e.place)}` : ""} },
  },`,
  )
  .join("\n")}
} satisfies Record<string, EditorialPhoto>;

export type PhotoSlug = keyof typeof PHOTOS;
`;
writeFileSync("src/lib/photos.ts", ts);

const md = entries
  .map((e) => `| \`${e.src}\` | ${e.title}${e.place ? ` (${e.place})` : ""} | [${e.author}](${e.profile}) | [Pexels ${e.id}](${e.pexels}) | ${e.width}×${e.height} · ${e.kb} KB |`)
  .join("\n");
writeFileSync("public/images/fotos/CREDITS.generated.md", `| Archivo | Foto | Autor | Fuente | Tamaño |\n|---|---|---|---|---|\n${md}\n`);
console.log(`\n${entries.length} fotos · total ${entries.reduce((s, e) => s + e.kb, 0)} KB`);
