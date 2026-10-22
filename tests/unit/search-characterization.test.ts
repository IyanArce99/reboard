// Test de caracterización: fija el resultado ACTUAL de la búsqueda sobre el inventario DEMO
// (100 anuncios, semilla fija). Es la red de seguridad para cambiar el repositorio a consultas
// (tarea A6) y, más adelante, para comparar la implementación de Supabase (tarea C3).
// Si un cambio altera estos resultados a propósito, hay que documentarlo en docs/DECISIONS.md.

import { describe, expect, it } from "vitest";
import { isActiveStatus } from "@/lib/domain/taxonomy";
import { withFilters, type Filters, type Sort } from "@/lib/search/filters";
import { countMatches, matches, sortListings } from "@/lib/search/match";
import { buildDemoInventory } from "../fixtures/demo-inventory";

const all = buildDemoInventory(100);
const active = all.filter((l) => isActiveStatus(l.status));
const ids = (f: Filters) => active.filter((l) => matches(l, f)).map((l) => l.id);

const CASES: [string, Partial<Filters>][] = [
  ["todo", {}],
  ["preset evolutiva GC", { shapes: ["evolutiva"], lenMin: 84, lenMax: 90, volMin: 45, volMax: 60, priceMax: 200, zone: "gran-canaria" }],
  ["preset Torq Tenerife", { brand: "torq", zone: "tenerife" }],
  ["preset shortboard Gijón", { shapes: ["shortboard"], volMin: 28, volMax: 32, zone: "asturias", dist: 25 }],
  ["preset sin resultados", { shapes: ["longboard"], zone: "lanzarote", priceMax: 150 }],
  ["región canarias", { zone: "canarias" }],
  ["región ignora distancia", { zone: "canarias", dist: 5 }],
  ["softboard", { constructions: ["softboard"] }],
  ["principiantes", { volMin: 55 }],
  ["sin marca", { brand: "sin-marca" }],
  ["modelo", { model: "fun-tet" }],
  ["estado + vendedor", { conditions: ["como-nueva", "muy-buen-estado"], sellers: ["particular"] }],
  ["sin reparaciones + accesorios", { noRepairs: true, accessories: true }],
  ["quillas blandas", { fins: "quillas-blandas" }],
  ["anchura y grosor", { widthMin: 21.5, thickMin: 2.875 }],
  ["solo para mí", { fit: { lo: 45, hi: 60 } }],
  ["precio rango", { priceMin: 200, priceMax: 300 }],
];

describe("inventario DEMO", () => {
  it("es determinista", () => {
    expect(all).toHaveLength(101);
    expect(active).toHaveLength(100);
    expect(all[0].id).toBe("a1040");
    expect(buildDemoInventory(100).map((l) => l.id)).toEqual(all.map((l) => l.id));
  });

  it("nunca inventa litros: sin valor no hay origen", () => {
    for (const l of all) {
      if (l.volume.value == null) expect(l.volume.source).toBeNull();
      else expect(l.volume.source).not.toBeNull();
      expect(l.isDemo).toBe(true);
    }
  });
});

describe("búsqueda (caracterización)", () => {
  it("recuentos conocidos de los escenarios del prototipo", () => {
    expect(countMatches(active, withFilters({}))).toBe(100);
    expect(countMatches(active, withFilters({ shapes: ["evolutiva"], zone: "gran-canaria" }))).toBe(11);
    expect(countMatches(active, withFilters(CASES[1][1]))).toBe(5);
    expect(countMatches(active, withFilters(CASES[2][1]))).toBe(4);
    expect(countMatches(active, withFilters(CASES[4][1]))).toBe(0);
  });

  it.each(CASES)("%s", (_, p) => {
    expect(ids(withFilters(p))).toMatchSnapshot();
  });

  it("con filtro de litros, los anuncios sin litros solo salen con skipVolume", () => {
    const f = withFilters({ volMin: 45, volMax: 60 });
    const unknown = active.filter((l) => l.volume.value == null && matches(l, f, true));
    expect(unknown.length).toBeGreaterThan(0);
    for (const l of unknown) expect(matches(l, f)).toBe(false);
  });

  it.each<Sort>(["recientes", "precio", "precio-desc", "litros", "distancia"])("orden %s", (sort) => {
    expect(sortListings(active, sort, "gran-canaria").map((l) => l.id)).toMatchSnapshot();
  });
});
