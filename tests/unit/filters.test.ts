import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  activeFilterCount,
  emptyFilters,
  parseFilters,
  parseView,
  searchHref,
  toQuery,
  withFilters,
} from "@/lib/search/filters";

describe("parseFilters", () => {
  it("lee todos los parámetros de la URL", () => {
    const f = parseFilters({
      zona: "gran-canaria",
      distancia: "25",
      "litros-min": "45",
      "litros-max": "60,5",
      "largo-min": "84",
      "largo-max": "90",
      forma: "evolutiva,fish",
      construccion: "epoxy",
      "precio-min": "100",
      "precio-max": "200",
      marca: "torq",
      modelo: "fun-tet",
      estado: "buen-estado,como-nueva",
      vendedor: "tienda",
      "sin-reparaciones": "1",
      accesorios: "1",
      quillas: "fcs-ii",
      "ancho-min": "21",
      "grosor-min": "2.75",
      "para-mi": "45-60",
    });
    expect(f).toEqual({
      zone: "gran-canaria",
      dist: 25,
      volMin: 45,
      volMax: 60.5,
      lenMin: 84,
      lenMax: 90,
      shapes: ["evolutiva", "fish"],
      constructions: ["epoxy"],
      priceMin: 100,
      priceMax: 200,
      brand: "torq",
      model: "fun-tet",
      conditions: ["buen-estado", "como-nueva"],
      sellers: ["tienda"],
      noRepairs: true,
      accessories: true,
      fins: "fcs-ii",
      widthMin: 21,
      thickMin: 2.75,
      fit: { lo: 45, hi: 60 },
    });
  });

  it("ignora valores no válidos sin fallar", () => {
    const f = parseFilters({
      zona: "<script>",
      "litros-min": "abc",
      "precio-max": "-5",
      forma: "evolutiva,patinete",
      quillas: "inventadas",
      "para-mi": "x-y",
      marca: ["torq", "nsp"],
    });
    expect(f.zone).toBe("");
    expect(f.volMin).toBeNull();
    expect(f.priceMax).toBeNull();
    expect(f.shapes).toEqual(["evolutiva"]);
    expect(f.fins).toBe("");
    expect(f.fit).toBeNull();
    expect(f.brand).toBe("torq");
  });

  it("sin parámetros devuelve los filtros vacíos", () => {
    expect(parseFilters({})).toEqual(emptyFilters());
  });
});

describe("toQuery / searchHref", () => {
  it("ida y vuelta: parse(toQuery(f)) === f", () => {
    const f = withFilters({ zone: "asturias", dist: 25, shapes: ["shortboard"], volMin: 28, volMax: 32, fit: { lo: 30, hi: 34 } });
    const back = parseFilters(Object.fromEntries(new URLSearchParams(toQuery(f))));
    expect(back).toEqual(f);
  });

  it("la distancia solo se serializa con zona", () => {
    expect(toQuery(withFilters({ dist: 25 }))).toBe("");
  });

  it("orden estable de parámetros (las URLs no deben cambiar)", () => {
    const f = withFilters({ shapes: ["evolutiva"], zone: "gran-canaria", volMin: 45, volMax: 60, priceMax: 200, lenMin: 84, lenMax: 90 });
    expect(searchHref(f)).toBe(
      "/buscar?zona=gran-canaria&litros-min=45&litros-max=60&largo-min=84&largo-max=90&forma=evolutiva&precio-max=200",
    );
    expect(searchHref(emptyFilters())).toBe("/buscar");
  });

  it("serializa la vista solo si no es la de por defecto", () => {
    const f = withFilters({ zone: "cadiz" });
    expect(toQuery(f, { sort: "recientes", view: "grid", limit: PAGE_SIZE })).toBe("zona=cadiz");
    expect(toQuery(f, { sort: "precio", view: "list", limit: 48, showUnknown: true })).toBe(
      "zona=cadiz&orden=precio&vista=lista&ver=48&sin-litros=1",
    );
  });
});

describe("parseView", () => {
  it("valores por defecto y límites", () => {
    expect(parseView({})).toEqual({ sort: "recientes", view: "grid", limit: PAGE_SIZE, showUnknown: false });
    expect(parseView({ orden: "inventado" }).sort).toBe("recientes");
    expect(parseView({ ver: "30" }).limit).toBe(48); // redondea al siguiente múltiplo de 24
    expect(parseView({ ver: "999999" }).limit).toBe(2400);
  });
});

describe("activeFilterCount", () => {
  it("cuenta como los chips aplicados", () => {
    expect(activeFilterCount(emptyFilters())).toBe(0);
    expect(activeFilterCount(withFilters({ zone: "cadiz", dist: 10, shapes: ["fish", "hibrida"], volMin: 30 }))).toBe(5);
  });
});
