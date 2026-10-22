// Contrato de ListingRepository. Hoy se ejecuta contra el mock; en la tarea C3 se ejecutará
// también contra la implementación de Supabase sembrada con el mismo inventario DEMO
// (los valores esperados salen del mismo `matches()` que fija search-characterization).

import { describe, expect, it } from "vitest";
import { mockRepository as repo } from "@/lib/data/mock-repository";
import { isActiveStatus } from "@/lib/domain/taxonomy";
import { emptyFilters, withFilters, type Filters } from "@/lib/search/filters";
import { countMatches, matches, sortListings } from "@/lib/search/match";
import { buildDemoInventory } from "@/mocks/demo-inventory";

const all = buildDemoInventory(100);
const active = all.filter((l) => isActiveStatus(l.status));
const expected = (f: Filters) => active.filter((l) => matches(l, f));

const FILTERS: Filters[] = [
  emptyFilters(),
  withFilters({ shapes: ["evolutiva"], zone: "gran-canaria" }),
  withFilters({ zone: "canarias", volMin: 45, volMax: 60 }),
  withFilters({ brand: "torq", priceMax: 300 }),
  withFilters({ shapes: ["longboard"], zone: "lanzarote", priceMax: 150 }),
];

describe("ListingRepository (contrato)", () => {
  it.each(FILTERS.map((f) => [JSON.stringify(f), f] as const))("search y count: %s", async (_, f) => {
    const exp = sortListings(expected(f), "precio", "gran-canaria");
    const page = await repo.search(f, { sort: "precio", limit: 5, offset: 2, here: "gran-canaria" });
    expect(page.total).toBe(exp.length);
    expect(page.items.map((l) => l.id)).toEqual(exp.slice(2, 7).map((l) => l.id));
    expect(await repo.count(f)).toBe(exp.length);
  });

  it("search por estado y excluyendo zona", async () => {
    const sold = await repo.search(emptyFilters(), { limit: 10, statuses: ["vendida"] });
    expect(sold.items.every((l) => l.status === "vendida")).toBe(true);
    expect(sold.total).toBe(all.filter((l) => l.status === "vendida").length);
    const other = await repo.search(emptyFilters(), { limit: 100, excludeZone: "gran-canaria" });
    expect(other.items.some((l) => l.zone === "gran-canaria")).toBe(false);
    expect(other.total).toBe(active.filter((l) => l.zone !== "gran-canaria").length);
  });

  it("unknownVolume: misma búsqueda salvo los litros, solo sin litros", async () => {
    const f = withFilters({ volMin: 45, volMax: 60 });
    const page = await repo.unknownVolume(f, 3);
    const exp = active.filter((l) => l.volume.value == null && matches(l, f, true));
    expect(page.total).toBe(exp.length);
    expect(page.items.map((l) => l.id)).toEqual(exp.slice(0, 3).map((l) => l.id));
  });

  it("facets: cada dimensión ignora su propio filtro", async () => {
    const f = withFilters({ zone: "tenerife", dist: 10, shapes: ["fish"], brand: "torq", model: "mod-fish" });
    const facets = await repo.facets(f);
    expect(facets.anyZone).toBe(countMatches(active, { ...f, zone: "", dist: null }));
    expect(facets.zones["canarias"]).toBe(countMatches(active, { ...f, zone: "canarias", dist: null }));
    expect(facets.zones["asturias"]).toBe(countMatches(active, { ...f, zone: "asturias", dist: null }));
    expect(facets.shapes["evolutiva"]).toBe(countMatches(active, { ...f, shapes: ["evolutiva"] }));
    expect(facets.brands["sin-marca"]).toBe(countMatches(active, { ...f, brand: "sin-marca", model: "" }));
  });

  it("byId / byIds: cualquier estado, en orden, ignorando los que no existen", async () => {
    expect((await repo.byId("a1096"))?.status).toBe("vendida");
    expect(await repo.byId("a9999")).toBeNull();
    expect((await repo.byIds(["a1047", "a9999", "a1040"])).map((l) => l.id)).toEqual(["a1047", "a1040"]);
  });

  it("similar: activos, sin el propio, primero la misma zona", async () => {
    const l = all[0];
    const sim = await repo.similar(l, 4);
    expect(sim).toHaveLength(4);
    expect(sim.some((x) => x.id === l.id)).toBe(false);
    expect(sim.every((x) => isActiveStatus(x.status))).toBe(true);
    expect(sim[0].zone).toBe(l.zone);
  });

  it("vendedor, tienda, precios por modelo y panel", async () => {
    const shop = await repo.shopListings("marea-boards");
    expect(shop.length).toBeGreaterThan(0);
    expect(shop.every((l) => l.seller.name === "Marea Boards")).toBe(true);
    expect(await repo.shopListings("no-existe")).toEqual([]);
    expect(await repo.countBySeller(shop[0])).toBe(active.filter((l) => l.seller.name === "Marea Boards").length);
    const prices = await repo.modelPrices();
    expect(prices["fun-tet"]?.length).toBe(active.filter((l) => l.modelSlug === "fun-tet").length);
    const own = await repo.sellerListings(null);
    expect(own).toHaveLength(3);
    expect(new Set(own.map((l) => l.status))).toEqual(new Set(["disponible", "pendiente", "vendida"]));
  });

  it("listingParams incluye todas las fichas (también vendidas)", async () => {
    const params = await repo.listingParams();
    expect(params).toHaveLength(all.length);
    expect(params[0]).toEqual({ slug: "torq-fun-tet-7-2-gran-canaria", id: "a1040" });
  });
});
