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

/** Qué significa cada estado (publicar y ficha). */
export const CONDITION_HELP: Record<Condition, string> = {
  "como-nueva": "Sin golpes ni reparaciones. Apenas se ha usado.",
  "muy-buen-estado": "Marcas de uso leves, como presiones en la cubierta. Sin reparaciones importantes.",
  "buen-estado": "Marcas visibles o algún golpe ya reparado. Lista para surfear.",
  "con-reparaciones": "Reparaciones importantes o algún golpe que necesita arreglo.",
};

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
  /** Región a la que pertenece (null = zona suelta de la península). */
  region: string | null;
  /** Agrupación en los selectores (en Canarias, la provincia). */
  group?: string;
  towns: string[];
}

/**
 * Catálogo COMPLETO de zonas, igual que la tabla `zones` de la base de datos. Las de fuera del
 * territorio activo se conservan para ampliar más adelante: no se muestran ni se pueden publicar.
 */
export const ALL_ZONES: Zone[] = [
  { slug: "gran-canaria", name: "Gran Canaria", region: "canarias", group: "Las Palmas", towns: ["Las Palmas de G.C.", "Gáldar", "Telde", "Arucas"] },
  { slug: "tenerife", name: "Tenerife", region: "canarias", group: "Santa Cruz de Tenerife", towns: ["Santa Cruz de Tenerife", "Las Américas", "El Médano"] },
  { slug: "lanzarote", name: "Lanzarote", region: "canarias", group: "Las Palmas", towns: ["Famara", "Arrecife"] },
  { slug: "fuerteventura", name: "Fuerteventura", region: "canarias", group: "Las Palmas", towns: ["Corralejo", "El Cotillo"] },
  { slug: "la-palma", name: "La Palma", region: "canarias", group: "Santa Cruz de Tenerife", towns: ["Santa Cruz de La Palma", "Los Llanos de Aridane"] },
  { slug: "la-gomera", name: "La Gomera", region: "canarias", group: "Santa Cruz de Tenerife", towns: ["San Sebastián de La Gomera", "Valle Gran Rey"] },
  { slug: "el-hierro", name: "El Hierro", region: "canarias", group: "Santa Cruz de Tenerife", towns: ["Valverde", "La Restinga"] },
  { slug: "la-graciosa", name: "La Graciosa", region: "canarias", group: "Las Palmas", towns: ["Caleta de Sebo"] },
  { slug: "asturias", name: "Asturias", region: null, towns: ["Gijón", "Salinas", "Rodiles"] },
  { slug: "cantabria", name: "Cantabria", region: null, towns: ["Somo", "Santander", "Liencres"] },
  { slug: "galicia", name: "Galicia", region: null, towns: ["A Coruña", "Razo", "Pantín"] },
  { slug: "pais-vasco", name: "País Vasco", region: null, towns: ["Zarautz", "Mundaka", "Sopelana"] },
  { slug: "cadiz", name: "Cádiz", region: null, towns: ["El Palmar", "Tarifa", "Conil"] },
];

/** Agrupaciones de zonas con landing propia (docs/SEO.md: /tablas/canarias). */
export const ALL_REGIONS: { slug: string; name: string; zones: string[] }[] = [
  { slug: "canarias", name: "Canarias", zones: ALL_ZONES.filter((z) => z.region === "canarias").map((z) => z.slug) },
];

/**
 * TERRITORIO ACTIVO del lanzamiento (docs/DECISIONS.md, «Lanzamiento solo en Canarias»).
 * Es la única fuente de verdad en la web: selectores, filtros, publicar, landings, sitemap y textos
 * salen de aquí. Para ampliar a otra región o zona: añádela aquí y actívala también en la base de
 * datos (`zones.active`), que es quien impide publicar fuera del territorio.
 */
export const LAUNCH = {
  regions: ["canarias"] as readonly string[],
  /** «Tablas de surf de segunda mano en Canarias». */
  name: "Canarias",
  /** Opción «sin zona» de los selectores. */
  allLabel: "Todas las islas",
  /** Complemento de lugar sin zona elegida: «13 tablas en Canarias». */
  inAll: "en Canarias",
  /** Nombre de cada zona en los textos: «elige tu isla». */
  zoneNoun: "isla",
  /** Título de los selectores de zona. */
  zoneTitle: "Isla",
};

/** Zonas activas (las únicas que ve y puede elegir el usuario), en el orden del catálogo. */
export const ZONES: Zone[] = ALL_ZONES.filter((z) => z.region != null && LAUNCH.regions.includes(z.region));
export const REGIONS = ALL_REGIONS.filter((r) => LAUNCH.regions.includes(r.slug));
export const ACTIVE_ZONE_SLUGS = ZONES.map((z) => z.slug);

/** Zona o región ACTIVA por slug (undefined si no existe o está fuera del territorio). */
export const zoneBySlug = (slug: string) => ZONES.find((z) => z.slug === slug);
export const regionBySlug = (slug: string) => REGIONS.find((r) => r.slug === slug);
export const isActivePlace = (slug: string) => Boolean(zoneBySlug(slug) || regionBySlug(slug));

/**
 * Región que abarca TODO el territorio activo (hoy, Canarias). Filtrar por ella es lo mismo que no
 * filtrar: se trata como «Todas las islas» y su landing redirige a la general (sin contenido duplicado).
 */
export const coversTerritory = (slug: string) => {
  const r = regionBySlug(slug);
  return Boolean(r) && ACTIVE_ZONE_SLUGS.every((z) => r!.zones.includes(z));
};

/** Nombre de una zona o región ACTIVA, o undefined si el slug no existe o está fuera del territorio. */
export const placeName = (slug: string) => zoneBySlug(slug)?.name ?? regionBySlug(slug)?.name;

/** Nombre para mostrar de cualquier zona del catálogo (también las inactivas: anuncios antiguos). */
export const zoneLabel = (slug: string) => ALL_ZONES.find((z) => z.slug === slug)?.name ?? slug;

/** Longitudes de los selectores, en pulgadas (prototipo: LENS). */
export const LENGTH_STEPS = [66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 94, 96, 102, 108, 114];

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
