// ⚠️ DATOS SIMULADOS (DEMO). No representan anuncios, tiendas ni precios reales.
// Portado de design/source/mock-data.js con la misma semilla, para que el inventario
// coincida con el del prototipo. Las tiendas, vendedores y direcciones son ficticios.
// Las fotos son de stock (Unsplash) y no muestran ninguna tabla anunciada.

import type { CatalogModel, Listing, Shop } from "@/lib/domain/types";
import type { Condition, Construction, SellerType, Shape } from "@/lib/domain/taxonomy";
import { ZONES, slugify } from "@/lib/domain/taxonomy";
import { DAY_MS } from "@/lib/domain/format";
import { unsplash } from "@/lib/images";

/** Fecha de referencia de la demo: las antigüedades se calculan respecto a ella. */
export const DEMO_REFERENCE_DATE = new Date("2026-10-22T10:00:00.000Z");

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ZONE_WEIGHT: Record<string, number> = {
  "gran-canaria": 22,
  tenerife: 16,
  lanzarote: 6,
  fuerteventura: 7,
  asturias: 12,
  cantabria: 11,
  galicia: 8,
  "pais-vasco": 12,
  cadiz: 10,
};

/**
 * Lanzamiento solo en Canarias: los anuncios DEMO que el prototipo ponía en la península pasan a
 * las islas que no tenían inventario. Mismas tablas, mismos ids y mismas búsquedas; solo cambia la
 * isla. (Las claves de ZONE_WEIGHT y de las manos siguen siendo las del prototipo.)
 */
const DEMO_ZONE: Record<string, string> = {
  asturias: "la-palma",
  cantabria: "la-gomera",
  galicia: "el-hierro",
  "pais-vasco": "la-graciosa",
  cadiz: "tenerife",
};
const demoZone = (z: string) => DEMO_ZONE[z] ?? z;
/** Zona de las tiendas DEMO en el prototipo (antes de moverlas a las islas). */
const SHOP_PROTO_ZONE: Record<string, string> = { "escuela-ola-brava": "asturias" };

export const BOARD_PHOTOS = [
  "1531722569936-825d3dd91b15",
  "1621951289270-b942dc5f4320",
  "1632334738554-95c79fb27eb7",
  "1703159453462-8a2d2866afaf",
  "1586996292898-71f4036c4e07",
  "1544840494-d0e48b117320",
  "1632299768491-51d27b80d088",
  "1537519646099-335112f03225",
  "1761435139247-e044088c2c3e",
  "1761347465188-0ff91dfee062",
  "1767167838805-78929dab5052",
];

export const DEMO_SHOPS: Shop[] = [
  { name: "Marea Boards", slug: "marea-boards", type: "tienda", zone: "gran-canaria", town: "Las Palmas de G.C.", address: "C/ Secretario Padilla, Las Palmas (demo)", hours: "L–S · 10:00–14:00 y 17:00–20:30", image: "1761435139247-e044088c2c3e", inventorySource: "Feed autorizado" },
  { name: "Escuela Playa Chica", slug: "escuela-playa-chica", type: "escuela", zone: "gran-canaria", town: "Telde", address: "Paseo de la playa, Telde (demo)", hours: "Todos los días · 9:00–18:00", image: "1761347465188-0ff91dfee062", inventorySource: "Carga asistida" },
  { name: "Norte Surf Shop", slug: "norte-surf-shop", type: "tienda", zone: "tenerife", town: "Santa Cruz de Tenerife", address: "Av. Anaga, Santa Cruz (demo)", hours: "L–V · 10:00–20:00 · S 10:00–14:00", image: "1586996292898-71f4036c4e07", inventorySource: "CSV semanal" },
  { name: "Barlovento Surf", slug: "barlovento-surf", type: "tienda", zone: "lanzarote", town: "Famara", address: "Urb. Famara (demo)", hours: "Todos los días · 10:00–19:00", image: "1632299768491-51d27b80d088", inventorySource: "Carga asistida" },
  { name: "Escuela Ola Brava", slug: "escuela-ola-brava", type: "escuela", zone: "la-palma", town: "Santa Cruz de La Palma", address: "Av. Marítima, Santa Cruz de La Palma (demo)", hours: "Mar–Oct · 9:00–19:00", image: "1767167838805-78929dab5052", inventorySource: "CSV" },
];

type Size = [label: string, lengthIn: number, widthIn: number, thickIn: number, volume: number];
interface MockModel {
  b: string | null;
  m: string | null;
  slug: string;
  shape: Shape;
  cons: Construction;
  sizes: Size[];
  desc: string | null;
}
const MD = (b: string | null, m: string | null, slug: string, shape: Shape, cons: Construction, sizes: Size[], desc: string | null = null): MockModel => ({ b, m, slug, shape, cons, sizes, desc });

const MODELS: MockModel[] = [
  MD("Torq", "Fun TET", "fun-tet", "evolutiva", "epoxy", [["6'8\"", 80, 21.25, 2.75, 42], ["7'2\"", 86, 21.5, 2.875, 47], ["7'6\"", 90, 22, 3, 54], ["8'0\"", 96, 22.5, 3.125, 62]], "Evolutiva en construcción TET (epoxy moldeado). Pensada para dar el salto desde la softboard: mucha estabilidad, remada fácil y resistente a los golpes."),
  MD("Torq", "PG-R", "pg-r", "shortboard", "epoxy", [["5'10\"", 70, 19.25, 2.375, 28.5], ["6'0\"", 72, 19.5, 2.5, 30.4], ["6'2\"", 74, 19.75, 2.56, 32.6]], "Shortboard de rendimiento para olas con fuerza."),
  MD("Torq", "Mod Fish", "mod-fish", "fish", "epoxy", [["5'11\"", 71, 21, 2.5, 35], ["6'3\"", 75, 21.5, 2.625, 39]], "Fish de cola swallow para olas pequeñas y medianas."),
  MD("Torq", "Longboard", "longboard", "longboard", "epoxy", [["9'0\"", 108, 22.75, 2.875, 68]], "Longboard clásico en construcción TET."),
  MD("NSP", "Elements Funboard", "elements-funboard", "evolutiva", "epoxy", [["7'0\"", 84, 21.5, 2.75, 47], ["7'6\"", 90, 22, 2.875, 55]]),
  MD("NSP", "Elements Longboard", "elements-longboard", "longboard", "epoxy", [["9'0\"", 108, 23, 3, 75]]),
  MD("Softech", "Roller", "roller", "evolutiva", "softboard", [["7'0\"", 84, 22, 3.125, 60], ["8'0\"", 96, 22.75, 3.25, 72]]),
  MD("Softech", "Mason Twin", "mason-twin", "fish", "softboard", [["5'6\"", 66, 21, 2.625, 38], ["6'0\"", 72, 21.5, 2.75, 42]]),
  MD("Firewire", "Seaside", "seaside", "fish", "epoxy", [["5'6\"", 66, 21.25, 2.5, 32], ["5'10\"", 70, 22, 2.625, 37]]),
  MD("Lost", "Puddle Jumper", "puddle-jumper", "hibrida", "pu", [["5'6\"", 66, 21, 2.5, 32], ["5'10\"", 70, 21.5, 2.625, 36]]),
  MD("Channel Islands", "Happy Everyday", "happy-everyday", "hibrida", "pu", [["5'10\"", 70, 19.75, 2.5, 31], ["6'0\"", 72, 20, 2.56, 33]]),
  MD("Channel Islands", "CI Mid", "ci-mid", "midlength", "pu", [["6'10\"", 82, 21, 2.75, 44], ["7'2\"", 86, 21.5, 2.875, 48]]),
  MD("Pukas", "Tasty Treat", "tasty-treat", "shortboard", "pu", [["5'11\"", 71, 19.5, 2.44, 29], ["6'1\"", 73, 19.75, 2.5, 31]]),
  MD(null, null, "a1", "evolutiva", "pu", [["7'4\"", 88, 22, 2.875, 52]]),
  MD(null, null, "a2", "shortboard", "pu", [["6'1\"", 73, 19.5, 2.44, 30]]),
  MD(null, null, "a3", "gun", "pu", [["7'6\"", 90, 19.75, 2.875, 41]]),
  MD(null, null, "a4", "longboard", "pu", [["9'2\"", 110, 23, 3, 72]]),
  MD(null, null, "a5", "midlength", "pu", [["7'0\"", 84, 21, 2.75, 45]]),
];

/** Catálogo de modelos con marca (DEMO: solo hay datos de algunos modelos). */
export const DEMO_CATALOG: CatalogModel[] = MODELS.filter((m) => m.b && m.m).map((m) => ({
  brand: m.b!,
  model: m.m!,
  slug: m.slug,
  shape: m.shape,
  construction: m.cons,
  sizes: m.sizes.map(([label, lengthIn, widthIn, thickIn, volume]) => ({ label, lengthIn, widthIn, thickIn, volume })),
  description: m.desc,
}));

type VolSrc = "vendedor" | "fabricante";
interface Hand {
  mi: number;
  si: number;
  zone: string;
  town: number;
  km: number;
  price: number;
  old?: number | null;
  cond: Condition;
  seller: SellerType;
  sname?: string;
  conf: number;
  post: number;
  volSrc?: VolSrc;
  vol?: null;
  fins?: null;
  repairs?: string;
  acc?: string;
  status?: "vendida";
}

const HAND: Hand[] = [
  { mi: 0, si: 1, zone: "gran-canaria", town: 0, km: 2, price: 190, cond: "muy-buen-estado", seller: "particular", sname: "Daniel", conf: 2, post: 0, volSrc: "vendedor", acc: "Funda y quillas" },
  { mi: 6, si: 0, zone: "gran-canaria", town: 2, km: 14, price: 160, cond: "buen-estado", seller: "escuela", sname: "Escuela Playa Chica", conf: 1, post: 1, volSrc: "fabricante" },
  { mi: 13, si: 0, zone: "gran-canaria", town: 1, km: 26, price: 150, cond: "con-reparaciones", seller: "particular", sname: "Iván", conf: 4, post: 2, vol: null, fins: null, repairs: "Golpe en el canto derecho reparado con resina y lijado. Estanco, sin entrada de agua." },
  { mi: 1, si: 1, zone: "asturias", town: 0, km: 3, price: 280, cond: "muy-buen-estado", seller: "particular", sname: "Marta", conf: 3, post: 2, volSrc: "fabricante" },
  { mi: 2, si: 1, zone: "tenerife", town: 0, km: 4, price: 260, cond: "como-nueva", seller: "tienda", sname: "Norte Surf Shop", conf: 0, post: 1, volSrc: "fabricante" },
  { mi: 4, si: 1, zone: "gran-canaria", town: 0, km: 5, price: 210, old: 240, cond: "buen-estado", seller: "tienda", sname: "Marea Boards", conf: 1, post: 3, volSrc: "fabricante" },
  { mi: 11, si: 1, zone: "lanzarote", town: 0, km: 8, price: 420, cond: "muy-buen-estado", seller: "particular", sname: "Óscar", conf: 6, post: 4, volSrc: "vendedor" },
  { mi: 9, si: 1, zone: "cantabria", town: 0, km: 2, price: 300, cond: "buen-estado", seller: "particular", sname: "Lucía", conf: 18, post: 9, volSrc: "vendedor" },
  { mi: 8, si: 0, zone: "gran-canaria", town: 0, km: 3, price: 240, cond: "muy-buen-estado", seller: "particular", sname: "Alba", conf: 5, post: 6, volSrc: "fabricante", status: "vendida" },
];

const FIX20 = ["gran-canaria", "tenerife", "tenerife", "tenerife", "fuerteventura", "fuerteventura", "lanzarote", "asturias", "cadiz", "galicia", "gran-canaria", "cantabria"];
const BASE_PRICE: Record<Shape, number> = { shortboard: 290, fish: 260, hibrida: 290, evolutiva: 230, midlength: 340, longboard: 380, gun: 330 };
const COND_FACTOR: Record<Condition, number> = { "como-nueva": 1.25, "muy-buen-estado": 1.05, "buen-estado": 0.9, "con-reparaciones": 0.7 };
const CONDS: Condition[] = ["como-nueva", "muy-buen-estado", "buen-estado", "con-reparaciones"];
const PHOTO_LABELS = ["cubierta", "fondo", "cola y quillas", "nose", "canto", "detalle reparación", "con funda"];
const NAMES = ["Pablo", "Nerea", "Javi", "Ainhoa", "Carlos", "Sara", "Unai", "Irene"];

const SHAPE_NAME: Record<Shape, string> = { shortboard: "Shortboard", fish: "Fish", hibrida: "Híbrida", evolutiva: "Evolutiva", midlength: "Midlength", longboard: "Longboard", gun: "Gun / Step-up" };
const COND_TEXT: Record<Condition, string> = { "como-nueva": "Como nueva", "muy-buen-estado": "Muy buen estado", "buen-estado": "Buen estado", "con-reparaciones": "Con reparaciones" };

const daysBefore = (d: number) => new Date(DEMO_REFERENCE_DATE.getTime() - d * DAY_MS).toISOString();

function mk(h: Hand, i: number): Listing {
  const m = MODELS[h.mi];
  const [sizeLabel, lengthIn, widthIn, thickIn, catalogVol] = m.sizes[h.si];
  const zone = ZONES.find((z) => z.slug === demoZone(h.zone))!;
  const town = zone.towns[h.town % zone.towns.length];
  const vol = "vol" in h ? null : catalogVol;
  const dimSource = m.b ? "manufacturer" : "seller";
  const fins = "fins" in h ? null : m.cons === "softboard" ? "Quillas blandas · Thruster" : "FCS II · Thruster";
  const repairs = h.repairs || (h.cond === "con-reparaciones" ? "Pequeña reparación en la cola, sellada." : null);
  const img = (i * 5 + h.mi) % BOARD_PHOTOS.length;
  const nPhotos = 3 + (i % 4);
  const id = `a${1040 + i * 7}`;
  const sname = h.sname || "Particular";
  const shop = DEMO_SHOPS.find((s) => s.name === sname);
  const status = h.status ?? (h.conf > 14 ? "pendiente" : "disponible");
  const acc = h.acc || null;
  const typeLine =
    m.shape === "evolutiva" ? "Perfecta para dar el salto desde la softboard." : m.shape === "shortboard" ? "Para olas con algo de fuerza." : "Muy divertida en olas pequeñas y medianas.";

  return {
    id,
    slug: slugify([m.b ?? SHAPE_NAME[m.shape], m.m ?? "artesanal", sizeLabel, zone.slug].join(" ")),
    brand: m.b,
    model: m.m,
    modelSlug: m.b ? m.slug : null,
    sizeLabel,
    length: { value: lengthIn, source: dimSource },
    width: { value: widthIn, source: dimSource },
    thickness: { value: thickIn, source: dimSource },
    volume: vol == null ? { value: null, source: null } : { value: vol, source: h.volSrc === "fabricante" ? "manufacturer" : "seller" },
    shape: m.shape,
    shapeSource: "seller",
    construction: m.cons,
    constructionSource: m.b ? "manufacturer" : "seller",
    fins: fins ? { value: fins, source: "seller" } : { value: null, source: null },
    accessories: acc ? { value: acc, source: "seller" } : { value: null, source: null },
    zone: zone.slug,
    town,
    distanceKm: h.km,
    price: h.price,
    previousPrice: h.old ?? null,
    condition: h.cond,
    repairs,
    seller: { id: null, type: h.seller, name: sname, shopSlug: shop?.slug ?? null },
    contact: { method: "whatsapp", phone: null },
    status,
    publishedAt: daysBefore(h.post),
    confirmedAt: daysBefore(h.conf),
    photos: Array.from({ length: nPhotos }, (_, k) => ({
      url: unsplash(BOARD_PHOTOS[(img + k * 3) % BOARD_PHOTOS.length]),
      label: PHOTO_LABELS[k],
    })),
    description: `${m.b ? `${m.b} ${m.m}` : "Tabla artesanal de shaper local"} de ${sizeLabel}${vol ? ` y ${vol} litros` : ""}. ${COND_TEXT[h.cond]}. ${typeLine} ${acc ? acc + " incluidos. " : ""}Se puede ver en ${town}. (Texto de demostración.)`,
    isDemo: true,
  };
}

/** Inventario demo determinista (semilla fija), como build(n) del prototipo. */
export function buildDemoInventory(n: number): Listing[] {
  const r = rng(11 + n);
  const out = HAND.map((h, i) => mk(h, i));
  const totalWeight = Object.values(ZONE_WEIGHT).reduce((a, b) => a + b, 0);
  for (let i = 0; i < n - 8; i++) {
    let zone: string;
    if (n === 20) zone = FIX20[i];
    else {
      let x = r() * totalWeight;
      zone = Object.keys(ZONE_WEIGHT).find((z) => (x -= ZONE_WEIGHT[z]) < 0)!;
    }
    const mi = Math.floor(r() * MODELS.length);
    const m = MODELS[mi];
    const si = Math.floor(r() * m.sizes.length);
    const cond = CONDS[Math.floor(r() * 4)];
    const sp = r();
    let seller: SellerType = sp < 0.8 ? "particular" : sp < 0.94 ? "tienda" : "escuela";
    // Se busca la tienda por la zona del PROTOTIPO para que la secuencia aleatoria no cambie.
    const shop = DEMO_SHOPS.find((s) => (SHOP_PROTO_ZONE[s.slug] ?? s.zone) === zone && s.type === seller);
    if (!shop) seller = "particular";
    let price = BASE_PRICE[m.shape] * (m.cons === "softboard" ? 0.6 : 1) * COND_FACTOR[cond] * (0.8 + r() * 0.45);
    price = Math.round(price / 5) * 5;
    const unknownVol = r() < (m.b ? 0.08 : 0.5);
    const conf = Math.floor(r() * 22);
    const h: Hand = {
      mi,
      si,
      zone,
      town: Math.floor(r() * 3),
      km: Math.round(1 + r() * 45),
      price,
      old: r() < 0.1 ? price + Math.round(20 + r() * 40) : null,
      cond,
      seller,
      sname: seller === "particular" ? NAMES[Math.floor(r() * 8)] : shop!.name,
      conf,
      post: Math.floor(r() * 30),
    };
    if (unknownVol) h.vol = null;
    h.volSrc = r() < 0.5 ? "fabricante" : "vendedor";
    if (r() < 0.15) h.fins = null;
    out.push(mk(h, out.length));
  }
  return out;
}
