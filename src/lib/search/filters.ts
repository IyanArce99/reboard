// Estado de búsqueda. Vive en la URL (searchParams) para que sea enlazable (CLAUDE.md).
// Este módulo no depende del servidor: lo usan también las islas cliente.

import {
  CONDITIONS,
  CONSTRUCTIONS,
  FIN_SYSTEMS,
  isActivePlace,
  coversTerritory,
  SELLER_TYPES,
  SHAPES,
  slugify,
  type Condition,
  type Construction,
  type SellerType,
  type Shape,
} from "@/lib/domain/taxonomy";

export interface Filters {
  /** Slug de zona o de región activa ('' = todo el territorio activo, «Todas las islas»). */
  zone: string;
  /** Distancia máxima en km; solo aplica con una zona concreta. */
  dist: number | null;
  volMin: number | null;
  volMax: number | null;
  /** Pulgadas. */
  lenMin: number | null;
  lenMax: number | null;
  shapes: Shape[];
  constructions: Construction[];
  priceMin: number | null;
  priceMax: number | null;
  /** Slug de marca, o 'sin-marca'. */
  brand: string;
  model: string;
  conditions: Condition[];
  sellers: SellerType[];
  noRepairs: boolean;
  accessories: boolean;
  /** Slug del sistema de quillas: fcs-ii | futures | quillas-blandas. */
  fins: string;
  widthMin: number | null;
  thickMin: number | null;
  /** «Solo mi rango de litros»: rango de litros del perfil de surfista. */
  fit: { lo: number; hi: number } | null;
}

export const SORTS = [
  ["recientes", "Más recientes"],
  ["precio", "Más baratas primero"],
  ["precio-desc", "Más caras primero"],
  ["litros", "Menos litros primero"],
  ["distancia", "Más cerca"],
] as const;
export type Sort = (typeof SORTS)[number][0];

export interface ViewState {
  sort: Sort;
  view: "grid" | "list";
  /** Anuncios mostrados («Ver más tablas» suma 24). */
  limit: number;
  /** Mostrar aparte los anuncios con litros sin indicar. */
  showUnknown: boolean;
}

export const PAGE_SIZE = 24;

export const emptyFilters = (): Filters => ({
  zone: "",
  dist: null,
  volMin: null,
  volMax: null,
  lenMin: null,
  lenMax: null,
  shapes: [],
  constructions: [],
  priceMin: null,
  priceMax: null,
  brand: "",
  model: "",
  conditions: [],
  sellers: [],
  noRepairs: false,
  accessories: false,
  fins: "",
  widthMin: null,
  thickMin: null,
  fit: null,
});

export const defaultView = (): ViewState => ({ sort: "recientes", view: "grid", limit: PAGE_SIZE, showUnknown: false });

export const FIN_OPTIONS = FIN_SYSTEMS.map((label) => ({ slug: slugify(label), label }));
export const finLabel = (slug: string) => FIN_OPTIONS.find((f) => f.slug === slug)?.label ?? slug;

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const numOrNull = (v: string | string[] | undefined) => {
  const s = first(v).replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const list = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]) =>
  [...new Set(first(v).split(",").filter((x): x is T => (allowed as readonly string[]).includes(x)))];
const flag = (v: string | string[] | undefined) => first(v) === "1";
const slug = (v: string | string[] | undefined) => {
  const s = first(v);
  return /^[a-z0-9-]{1,60}$/.test(s) ? s : "";
};

/** Lee los filtros de los searchParams (tolerante: ignora valores no válidos). */
export function parseFilters(raw: Raw): Filters {
  const fitRaw = first(raw["para-mi"]).match(/^(\d{1,3})-(\d{1,3})$/);
  return {
    zone: isActivePlace(slug(raw.zona)) && !coversTerritory(slug(raw.zona)) ? slug(raw.zona) : "",
    dist: numOrNull(raw.distancia),
    volMin: numOrNull(raw["litros-min"]),
    volMax: numOrNull(raw["litros-max"]),
    lenMin: numOrNull(raw["largo-min"]),
    lenMax: numOrNull(raw["largo-max"]),
    shapes: list(raw.forma, SHAPES),
    constructions: list(raw.construccion, CONSTRUCTIONS),
    priceMin: numOrNull(raw["precio-min"]),
    priceMax: numOrNull(raw["precio-max"]),
    brand: slug(raw.marca),
    model: slug(raw.modelo),
    conditions: list(raw.estado, CONDITIONS),
    sellers: list(raw.vendedor, SELLER_TYPES),
    noRepairs: flag(raw["sin-reparaciones"]),
    accessories: flag(raw.accesorios),
    fins: FIN_OPTIONS.some((f) => f.slug === first(raw.quillas)) ? first(raw.quillas) : "",
    widthMin: numOrNull(raw["ancho-min"]),
    thickMin: numOrNull(raw["grosor-min"]),
    fit: fitRaw ? { lo: +fitRaw[1], hi: +fitRaw[2] } : null,
  };
}

export function parseView(raw: Raw): ViewState {
  const sort = first(raw.orden);
  const limit = numOrNull(raw.ver);
  return {
    sort: (SORTS.some(([v]) => v === sort) ? sort : "recientes") as Sort,
    view: first(raw.vista) === "lista" ? "list" : "grid",
    limit: limit && limit > PAGE_SIZE ? Math.min(Math.ceil(limit / PAGE_SIZE) * PAGE_SIZE, 2400) : PAGE_SIZE,
    showUnknown: flag(raw["sin-litros"]),
  };
}

/** Serializa filtros (y opcionalmente la vista) a una query string estable. */
export function toQuery(f: Filters, v?: Partial<ViewState>): string {
  const p = new URLSearchParams();
  const set = (k: string, val: string | number | null | undefined) => {
    if (val !== null && val !== undefined && val !== "") p.set(k, String(val));
  };
  set("zona", f.zone);
  if (f.zone) set("distancia", f.dist);
  set("litros-min", f.volMin);
  set("litros-max", f.volMax);
  set("largo-min", f.lenMin);
  set("largo-max", f.lenMax);
  set("forma", f.shapes.join(","));
  set("construccion", f.constructions.join(","));
  set("precio-min", f.priceMin);
  set("precio-max", f.priceMax);
  set("marca", f.brand);
  set("modelo", f.model);
  set("estado", f.conditions.join(","));
  set("vendedor", f.sellers.join(","));
  if (f.noRepairs) p.set("sin-reparaciones", "1");
  if (f.accessories) p.set("accesorios", "1");
  set("quillas", f.fins);
  set("ancho-min", f.widthMin);
  set("grosor-min", f.thickMin);
  if (f.fit) p.set("para-mi", `${f.fit.lo}-${f.fit.hi}`);
  if (v) {
    if (v.sort && v.sort !== "recientes") p.set("orden", v.sort);
    if (v.view === "list") p.set("vista", "lista");
    if (v.limit && v.limit > PAGE_SIZE) p.set("ver", String(v.limit));
    if (v.showUnknown) p.set("sin-litros", "1");
  }
  return p.toString();
}

export const searchHref = (f: Filters, v?: Partial<ViewState>) => {
  const q = toQuery(f, v);
  return q ? `/buscar?${q}` : "/buscar";
};

export const withFilters = (p: Partial<Filters>): Filters => ({ ...emptyFilters(), ...p });

export const hasVolumeFilter = (f: Filters) => f.volMin != null || f.volMax != null;

/** Número de filtros activos (como los chips aplicados del prototipo). */
export function activeFilterCount(f: Filters) {
  return (
    (f.zone ? 1 : 0) +
    (f.zone && f.dist ? 1 : 0) +
    (hasVolumeFilter(f) ? 1 : 0) +
    (f.lenMin != null || f.lenMax != null ? 1 : 0) +
    f.shapes.length +
    f.constructions.length +
    (f.priceMin != null || f.priceMax != null ? 1 : 0) +
    (f.brand ? 1 : 0) +
    (f.model ? 1 : 0) +
    f.conditions.length +
    f.sellers.length +
    (f.noRepairs ? 1 : 0) +
    (f.accessories ? 1 : 0) +
    (f.fins ? 1 : 0) +
    (f.widthMin != null ? 1 : 0) +
    (f.thickMin != null ? 1 : 0) +
    (f.fit ? 1 : 0)
  );
}
