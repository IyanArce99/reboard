// Paridad entre repositorios (tarea C3): el inventario DEMO cargado en Supabase LOCAL debe dar
// los mismos resultados con supabaseRepository que con mockRepository.
// Diferencias esperadas y documentadas (docs/DECISIONS.md, fase C):
//  - Sin coordenadas: el filtro `dist` no aplica y «distancia» ordena primero la zona (sin km).
//  - Empates de orden: se comparan las secuencias de la clave de orden y los conjuntos de ids.
//  - Origen 'manufacturer' sin medida de catálogo se guarda como 'seller' (lo exige la base de datos).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mockRepository as mock } from "../fixtures/mock-repository";
import { supabaseRepository as db } from "@/lib/data/supabase-repository";
import type { Listing } from "@/lib/domain/types";
import { emptyFilters, withFilters, type Filters, type Sort } from "@/lib/search/filters";
import { buildDemoInventory } from "../fixtures/demo-inventory";
import { clearDemo, loadDemo } from "./demo-loader";
import { serviceClient } from "./local-supabase";

const sb = serviceClient();
const inventory = buildDemoInventory(100);
let toMock = new Map<string, string>(); // public_id de la base de datos → id del mock

beforeAll(async () => {
  await clearDemo(sb);
  const map = await loadDemo(sb, inventory);
  toMock = new Map([...map].map(([mockId, dbId]) => [dbId, mockId]));
});
afterAll(async () => {
  await clearDemo(sb);
});

const ids = (ls: Listing[]) => ls.map((l) => toMock.get(l.id) ?? l.id);
const sorted = (xs: string[]) => [...xs].sort();

const CASES: [string, Partial<Filters>][] = [
  ["todo", {}],
  ["evolutiva GC con litros, largo y precio", { shapes: ["evolutiva"], lenMin: 84, lenMax: 90, volMin: 45, volMax: 60, priceMax: 200, zone: "gran-canaria" }],
  ["Torq en Tenerife", { brand: "torq", zone: "tenerife" }],
  ["sin resultados", { shapes: ["longboard"], zone: "lanzarote", priceMax: 150 }],
  ["región canarias", { zone: "canarias" }],
  ["softboard", { constructions: ["softboard"] }],
  ["principiantes", { volMin: 55 }],
  ["sin marca", { brand: "sin-marca" }],
  ["modelo", { model: "fun-tet" }],
  ["estado + vendedor", { conditions: ["como-nueva", "muy-buen-estado"], sellers: ["particular"] }],
  ["tiendas y escuelas", { sellers: ["tienda", "escuela"] }],
  ["sin reparaciones + accesorios", { noRepairs: true, accessories: true }],
  ["quillas blandas", { fins: "quillas-blandas" }],
  ["anchura y grosor", { widthMin: 21.5, thickMin: 2.875 }],
  ["solo para mí", { fit: { lo: 45, hi: 60 } }],
  ["precio rango", { priceMin: 200, priceMax: 300 }],
  ["varias formas", { shapes: ["fish", "hibrida", "shortboard"] }],
];

const KEY: Record<Exclude<Sort, "distancia">, (l: Listing) => number> = {
  recientes: (l) => -new Date(l.publishedAt).getTime(),
  precio: (l) => l.price,
  "precio-desc": (l) => -l.price,
  litros: (l) => l.volume.value ?? 0,
};

describe("paridad mock ↔ Supabase (inventario DEMO en local)", () => {
  it.each(CASES)("search, count y orden: %s", async (_, p) => {
    const f = withFilters(p);
    for (const sort of Object.keys(KEY) as (keyof typeof KEY)[]) {
      const [a, b] = await Promise.all([mock.search(f, { sort, limit: 2400 }), db.search(f, { sort, limit: 2400 })]);
      expect(b.total, `${sort} total`).toBe(a.total);
      expect(sorted(ids(b.items)), `${sort} conjunto`).toEqual(sorted(ids(a.items)));
      expect(b.items.map(KEY[sort]), `${sort} orden`).toEqual(a.items.map(KEY[sort]));
    }
    expect(await db.count(f)).toBe(await mock.count(f));
  });

  it.each(CASES)("facetas: %s", async (_, p) => {
    const f = withFilters(p);
    const [a, b] = await Promise.all([mock.facets(f), db.facets(f)]);
    expect(b.anyZone).toBe(a.anyZone);
    const nonZero = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).filter(([, n]) => n > 0));
    expect(nonZero(b.zones)).toEqual(nonZero(a.zones));
    expect(nonZero(b.shapes)).toEqual(nonZero(a.shapes));
    expect(nonZero(b.brands)).toEqual(nonZero(a.brands));
  });

  it("paginación", async () => {
    const f = emptyFilters();
    const [a, b] = await Promise.all([
      mock.search(f, { sort: "precio", limit: 24, offset: 24 }),
      db.search(f, { sort: "precio", limit: 24, offset: 24 }),
    ]);
    expect(b.items.map((l) => l.price)).toEqual(a.items.map((l) => l.price));
    expect(b.total).toBe(a.total);
  });

  it("litros sin indicar", async () => {
    const f = withFilters({ volMin: 45, volMax: 60, shapes: ["evolutiva"] });
    const [a, b] = await Promise.all([mock.unknownVolume(f, 50), db.unknownVolume(f, 50)]);
    expect(b.total).toBe(a.total);
    expect(sorted(ids(b.items))).toEqual(sorted(ids(a.items)));
  });

  it("estados: vendidas y excluir zona", async () => {
    const f = emptyFilters();
    const [a, b] = await Promise.all([
      mock.search(f, { limit: 50, statuses: ["vendida"] }),
      db.search(f, { limit: 50, statuses: ["vendida"] }),
    ]);
    expect(sorted(ids(b.items))).toEqual(sorted(ids(a.items)));
    const [c, d] = await Promise.all([
      mock.search(f, { limit: 500, excludeZone: "gran-canaria" }),
      db.search(f, { limit: 500, excludeZone: "gran-canaria" }),
    ]);
    expect(d.total).toBe(c.total);
  });

  it("«distancia» sin km: primero la zona del usuario", async () => {
    const res = await db.search(emptyFilters(), { sort: "distancia", here: "tenerife", limit: 200 });
    const firstOther = res.items.findIndex((l) => l.zone !== "tenerife");
    expect(firstOther).toBeGreaterThan(0);
    expect(res.items.slice(firstOther).some((l) => l.zone === "tenerife")).toBe(false);
  });

  it("ficha: mismo anuncio, mismos datos", async () => {
    for (const m of inventory.slice(0, 20)) {
      const dbId = [...toMock].find(([, mid]) => mid === m.id)![0];
      const l = (await db.byId(dbId))!;
      expect(l, m.id).toBeTruthy();
      const normalize = (x: Listing) => ({
        ...x,
        id: m.id,
        isDemo: true,
        distanceKm: null,
        photos: [],
        seller: { ...x.seller, id: null },
        // La base de datos no admite 'manufacturer' sin medida de catálogo.
        volume: { ...x.volume, source: x.volume.source && "x" },
        width: { ...x.width, source: x.width.source && "x" },
        thickness: { ...x.thickness, source: x.thickness.source && "x" },
        length: { ...x.length, source: "x" },
        constructionSource: "x",
        publishedAt: new Date(x.publishedAt).toISOString(),
        confirmedAt: new Date(x.confirmedAt).toISOString(),
        // «pendiente» se deriva de confirmedAt y de la fecha actual: el mock usa una fecha fija
        // (DEMO_REFERENCE_DATE) y Supabase la real. confirmedAt ya se compara exactamente.
        status: x.status === "pendiente" ? "disponible" : x.status,
      });
      expect(normalize(l)).toEqual(normalize(m));
    }
  });

  it("byIds, similares, vendedor, tiendas, precios por modelo y fichas prerenderizables", async () => {
    const some = inventory.slice(0, 5);
    const dbIds = some.map((m) => [...toMock].find(([, mid]) => mid === m.id)![0]);
    expect(ids(await db.byIds([...dbIds].reverse(), ))).toEqual(some.map((m) => m.id).reverse());

    for (const m of some) {
      const l = (await db.byId(dbIds[some.indexOf(m)]))!;
      const [a, b] = await Promise.all([mock.similar(m, 4), db.similar(l, 4)]);
      const key = (x: Listing, base: Listing) => `${x.zone === base.zone}|${new Date(x.publishedAt).getTime()}`;
      expect(b.map((x) => key(x, l)), `similares de ${m.id}`).toEqual(a.map((x) => key(x, m)));
      expect(await db.countBySeller(l)).toBe(await mock.countBySeller(m));
    }

    for (const shop of await mock.shops()) {
      const [a, b] = await Promise.all([mock.shopListings(shop.slug), db.shopListings(shop.slug)]);
      expect(sorted(ids(b)), shop.slug).toEqual(sorted(ids(a)));
    }

    const [pa, pb] = await Promise.all([mock.modelPrices(), db.modelPrices()]);
    const norm = (r: Record<string, number[]>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [...v].sort((x, y) => x - y)]));
    expect(norm(pb)).toEqual(norm(pa));

    const params = await db.listingParams(1000);
    expect(params).toHaveLength(inventory.length); // publicadas, pendientes y vendidas
  });

  it("catálogo y tiendas", async () => {
    const [ca, cb] = await Promise.all([mock.catalog(), db.catalog()]);
    const bySlug = (xs: typeof ca) => [...xs].sort((a, b) => a.slug.localeCompare(b.slug));
    expect(bySlug(cb)).toEqual(bySlug(ca));
    const [sa, sbs] = await Promise.all([mock.shops(), db.shops()]);
    expect(sbs.map((s) => s.slug).sort()).toEqual(sa.map((s) => s.slug).sort());
  });
});
