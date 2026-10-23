// Taxonomía de Reboard (ver CLAUDE.md y docs/PRODUCT.md).
// Forma, construcción y necesidad («principiantes») son ejes distintos:
// softboard es una construcción, no una forma.

export const SHAPES = [
  "shortboard",
  "fish",
  "hibrida",
  "evolutiva",
  "midlength",
  "longboard",
  "gun",
] as const;
export type Shape = (typeof SHAPES)[number];

export const SHAPE_INFO: Record<
  Shape,
  { label: string; short: string; plural: string }
> = {
  shortboard: { label: "Shortboard", short: "Shortboard", plural: "Shortboards" },
  fish: { label: "Fish", short: "Fish", plural: "Fish" },
  hibrida: { label: "Híbrida", short: "Híbrida", plural: "Híbridas" },
  evolutiva: { label: "Evolutiva", short: "Evolutiva", plural: "Evolutivas" },
  midlength: { label: "Midlength", short: "Midlength", plural: "Midlengths" },
  longboard: { label: "Longboard", short: "Longboard", plural: "Longboards" },
  gun: { label: "Gun / Step-up", short: "Gun", plural: "Guns y step-ups" },
};

export const CONSTRUCTIONS = ["pu", "epoxy", "softboard"] as const;
export type Construction = (typeof CONSTRUCTIONS)[number];

export const CONSTRUCTION_INFO: Record<Construction, { label: string; short: string }> = {
  pu: { label: "PU / Poliéster", short: "PU" },
  epoxy: { label: "Epoxy / EPS", short: "Epoxy" },
  softboard: { label: "Softboard", short: "Softboard" },
};

export const CONDITIONS = [
  "como-nueva",
  "muy-buen-estado",
  "buen-estado",
  "con-reparaciones",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABEL: Record<Condition, string> = {
  "como-nueva": "Como nueva",
  "muy-buen-estado": "Muy buen estado",
  "buen-estado": "Buen estado",
  "con-reparaciones": "Con reparaciones",
};

export const SELLER_TYPES = ["particular", "tienda", "escuela"] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export const SELLER_LABEL: Record<SellerType, string> = {
  particular: "Particular",
  tienda: "Tienda",
  escuela: "Escuela",
};

export const STATUSES = ["disponible", "pendiente", "vendida", "caducada", "retirada"] as const;
export type ListingStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<ListingStatus, string> = {
  disponible: "Disponible",
  pendiente: "Pendiente de confirmar",
  vendida: "Vendida",
  caducada: "Caducada",
  retirada: "Retirada",
};

export const isActiveStatus = (s: ListingStatus) => s === "disponible" || s === "pendiente";

export const FIN_SYSTEMS = ["FCS II", "Futures", "Quillas blandas"] as const;

/** Marca de los anuncios sin marca de catálogo. */
// Para quien compra: «Sin marca» (incluye tablas de shapers locales). Al publicar se puede elegir
// «Shaper local» o «Sin marca»; las dos acaban aquí.
export const NO_BRAND = { slug: "sin-marca", label: "Sin marca", short: "Sin marca" };

/**
 * Marcas de referencia (solo nombres reales; sin modelos ni medidas). Copia de la migración
 * 20261024090000_reference_brands: la usa la interfaz sin base de datos para que el selector de
 * marca no salga vacío. tests/unit/brand-order.test.ts comprueba que ambas listas coinciden.
 */
export const REFERENCE_BRANDS = [
  "Torq",
  "NSP",
  "Softech",
  "Firewire",
  "Channel Islands",
  "Lost",
  "Pukas",
  "JS Industries",
  "Pyzel",
  "Rusty",
  "Sharp Eye",
  "Haydenshapes",
  "Christenson",
  "Chilli",
  "DHD",
  "Superbrand",
  "Album",
  "Catch Surf",
  "Olaian",
  "BIC",
  "Mick Fanning Softboards",
  "McTavish",
  "Bing",
  "Takayama",
  "Slater Designs",
  "Aipa",
  "Global Surf Industries",
  "Lib Tech",
  "Tokoro",
  "Clayton",
];

/**
 * Marcas que más se ven en tablas de segunda mano en España: van primero al publicar. Es un orden de
 * conveniencia (no un dato que se muestre); con anuncios reales se puede sustituir por su recuento.
 */
export const POPULAR_BRANDS = [
  "Torq",
  "NSP",
  "Softech",
  "Firewire",
  "Channel Islands",
  "Lost",
  "Pukas",
  "JS Industries",
  "Pyzel",
  "Catch Surf",
  "Olaian",
  "BIC",
];

export interface Zone {
  slug: string;
  name: string;
  towns: string[];
}

export const ZONES: Zone[] = [
  { slug: "gran-canaria", name: "Gran Canaria", towns: ["Las Palmas de G.C.", "Gáldar", "Telde", "Arucas"] },
  { slug: "tenerife", name: "Tenerife", towns: ["Santa Cruz de Tenerife", "Las Américas", "El Médano"] },
  { slug: "lanzarote", name: "Lanzarote", towns: ["Famara", "Arrecife"] },
  { slug: "fuerteventura", name: "Fuerteventura", towns: ["Corralejo", "El Cotillo"] },
  { slug: "asturias", name: "Asturias", towns: ["Gijón", "Salinas", "Rodiles"] },
  { slug: "cantabria", name: "Cantabria", towns: ["Somo", "Santander", "Liencres"] },
  { slug: "galicia", name: "Galicia", towns: ["A Coruña", "Razo", "Pantín"] },
  { slug: "pais-vasco", name: "País Vasco", towns: ["Zarautz", "Mundaka", "Sopelana"] },
  { slug: "cadiz", name: "Cádiz", towns: ["El Palmar", "Tarifa", "Conil"] },
];

/** Agrupaciones de zonas con landing propia (docs/SEO.md: /tablas/canarias). */
export const REGIONS: { slug: string; name: string; zones: string[] }[] = [
  { slug: "canarias", name: "Canarias", zones: ["gran-canaria", "tenerife", "lanzarote", "fuerteventura"] },
];

export const zoneBySlug = (slug: string) => ZONES.find((z) => z.slug === slug);
export const regionBySlug = (slug: string) => REGIONS.find((r) => r.slug === slug);

/** Nombre de una zona o región, o undefined si el slug no existe. */
export const placeName = (slug: string) => zoneBySlug(slug)?.name ?? regionBySlug(slug)?.name;

/** Longitudes de los selectores, en pulgadas (prototipo: LENS). */
export const LENGTH_STEPS = [66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 94, 96, 102, 108, 114];

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
