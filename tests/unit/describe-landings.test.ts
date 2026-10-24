import { describe, expect, it } from "vitest";
import {
  alertText,
  appliedChips,
  emptyStateCopy,
  emptySuggestions,
  hasActiveFilters,
  resultsShortTitle,
  resultsTitle,
  searchCtaText,
  type CatalogNames,
} from "@/lib/search/describe";
import { emptyFilters, withFilters } from "@/lib/search/filters";
import {
  LANDING_FORMS,
  LANDING_PLACES,
  isLandingForm,
  isLandingPlace,
  landingFilters,
  landingPath,
  landingPathFor,
  landingIntro,
  landingTitle,
} from "@/lib/search/landings";

const names: CatalogNames = {
  brands: [{ slug: "torq", name: "Torq" }],
  models: [{ slug: "fun-tet", name: "Fun TET", brandSlug: "torq" }],
};

describe("títulos", () => {
  it("H1 dinámico como el prototipo", () => {
    expect(resultsTitle(withFilters({ shapes: ["evolutiva"], zone: "gran-canaria" }), names)).toBe("Tablas evolutivas de segunda mano en Gran Canaria");
    expect(resultsTitle(withFilters({ shapes: ["fish"] }), names)).toBe("Tablas fish de segunda mano en Canarias");
    expect(resultsTitle(withFilters({ constructions: ["softboard"] }), names)).toBe("Softboards (tablas de espuma) de segunda mano en Canarias");
    expect(resultsTitle(withFilters({ brand: "torq", zone: "tenerife" }), names)).toBe("Tablas Torq de segunda mano en Tenerife");
    expect(resultsTitle(withFilters({ brand: "sin-marca" }), names)).toBe("Tablas de surf de segunda mano en Canarias");
    expect(resultsTitle(withFilters({ zone: "canarias" }), names)).toBe("Tablas de surf de segunda mano en Canarias");
  });

  it("título corto de las migas", () => {
    expect(resultsShortTitle(withFilters({ shapes: ["gun"] }))).toBe("Gun / Step-up");
    expect(resultsShortTitle(withFilters({ zone: "la-palma" }))).toBe("La Palma");
    expect(resultsShortTitle(emptyFilters())).toBe("Resultados");
  });

  it("título de landing de principiantes", () => {
    expect(landingTitle("tenerife", "principiantes", "x")).toBe("Tablas de surf de segunda mano para principiantes en Tenerife");
    expect(landingTitle(null, "principiantes", "x")).toBe("Tablas de surf de segunda mano para principiantes en Canarias");
    expect(landingTitle(null, "evolutiva", "fallback")).toBe("fallback");
  });
});

describe("alertText", () => {
  it("describe los filtros", () => {
    expect(
      alertText(withFilters({ shapes: ["evolutiva"], volMin: 45, volMax: 60, priceMax: 200, zone: "gran-canaria" }), names),
    ).toBe("Evolutivas de 45 a 60 L, por menos de 200 €, en Gran Canaria");
    expect(alertText(withFilters({ volMin: 55 }), names)).toBe("Tablas de 55 L o más, en Canarias");
    expect(alertText(withFilters({ volMax: 40 }), names)).toBe("Tablas de hasta 40 L, en Canarias");
    expect(alertText(withFilters({ lenMax: 90 }), names)).toBe(`Tablas de hasta 7'6", en Canarias`);
    expect(alertText(withFilters({ lenMin: 84 }), names)).toBe(`Tablas desde 7'0", en Canarias`);
    expect(alertText(emptyFilters(), names)).toBe("Tablas en Canarias");
    expect(alertText(withFilters({ brand: "torq", lenMin: 84, lenMax: 90 }), names)).toBe(`Tablas Torq entre 7'0" y 7'6", en Canarias`);
  });
});

describe("chips aplicados y sugerencias", () => {
  it("quitar un chip elimina solo su filtro", () => {
    const f = withFilters({ zone: "el-hierro", dist: 10, shapes: ["fish", "hibrida"], brand: "torq", model: "fun-tet" });
    const chips = appliedChips(f, names);
    expect(chips.map((c) => c.label)).toEqual(["El Hierro", "< 10 km", "Fish", "Híbrida", "Torq", "Fun TET"]);
    expect(chips.find((c) => c.key === "zona")!.without).toMatchObject({ zone: "", dist: null });
    expect(chips.find((c) => c.key === "forma-fish")!.without.shapes).toEqual(["hibrida"]);
    expect(chips.find((c) => c.key === "marca")!.without).toMatchObject({ brand: "", model: "" });
  });

  it("chips de rangos sin ∞ ni 0", () => {
    const label = (p: Parameters<typeof withFilters>[0]) => appliedChips(withFilters(p), names).map((c) => c.label);
    expect(label({ volMin: 55 })).toEqual(["Desde 55 L"]);
    expect(label({ volMax: 40 })).toEqual(["Hasta 40 L"]);
    expect(label({ volMin: 45, volMax: 60 })).toEqual(["45–60 L"]);
    expect(label({ priceMax: 200 })).toEqual(["Hasta 200 €"]);
    expect(label({ priceMin: 100 })).toEqual(["Desde 100 €"]);
    expect(label({ thickMin: 2.75 })).toEqual(['Grosor ≥ 2,75"']);
    expect(label({ fit: { lo: 62, hi: 79 } })).toEqual(["Mi rango: 62–79 L"]);
  });

  it("sugerencias del estado vacío", () => {
    const s = emptySuggestions(withFilters({ shapes: ["longboard"], zone: "lanzarote", priceMax: 150, volMin: 60 }));
    expect(s.map((x) => x.label)).toEqual(["Todas las islas", "Hasta 200 €", "Desde 55 L", "Cualquier tipo", "Quitar todos los filtros"]);
  });
});

describe("landings", () => {
  it("formas y lugares válidos", () => {
    expect(LANDING_FORMS).toHaveLength(9);
    // Lanzamiento en Canarias: las 8 islas tienen landing; la península no, y «canarias» (todo el
    // territorio) tampoco, porque duplicaría las generales (proxy.ts la redirige).
    expect(LANDING_PLACES).toEqual(["gran-canaria", "tenerife", "lanzarote", "fuerteventura", "la-palma", "la-gomera", "el-hierro", "la-graciosa"]);
    expect(LANDING_PLACES).not.toContain("canarias");
    expect(isLandingForm("principiantes")).toBe(true);
    expect(isLandingForm("patinete")).toBe(false);
    expect(isLandingPlace("pais-vasco")).toBe(false);
    expect(isLandingPlace("la-graciosa")).toBe(true);
  });

  it("filtros de cada landing", () => {
    expect(landingFilters(null, "softboard").constructions).toEqual(["softboard"]);
    expect(landingFilters(null, "principiantes").volMin).toBe(55);
    expect(landingFilters("tenerife", "fish")).toMatchObject({ zone: "tenerife", shapes: ["fish"] });
    expect(landingPath("tenerife", "fish")).toBe("/tablas/tenerife/fish");
    expect(landingPath(null, "fish")).toBe("/tablas/fish");
  });

  it("intros: todas las formas tienen una y las de zona citan la zona", () => {
    for (const form of LANDING_FORMS) expect(landingIntro(null, form)).not.toBe("");
    expect(landingIntro("tenerife", "fish")).toContain("Tenerife");
    expect(landingIntro("tenerife", null)).not.toMatch(/distancia/);
  });

  it("canonical de /buscar hacia la landing equivalente", () => {
    expect(landingPathFor(withFilters({ shapes: ["evolutiva"], zone: "gran-canaria" }))).toBe("/tablas/gran-canaria/evolutiva");
    expect(landingPathFor(withFilters({ zone: "la-gomera" }))).toBe("/tablas/la-gomera");
    expect(landingPathFor(withFilters({ volMin: 55 }))).toBe("/tablas/principiantes");
    expect(landingPathFor(withFilters({ shapes: ["evolutiva"], priceMax: 200 }))).toBeNull();
    expect(landingPathFor(emptyFilters())).toBeNull();
  });
});

describe("estado sin resultados", () => {
  it("inventario vacío: no habla de filtros, con o sin ellos", () => {
    for (const f of [emptyFilters(), withFilters({ shapes: ["fish"], zone: "tenerife" })]) {
      const e = emptyStateCopy(f, 0);
      expect(e.kind).toBe("inventory");
      expect(e.title).toBe("Todavía no hay tablas publicadas");
      expect(`${e.title} ${e.text}`).not.toMatch(/filtros/);
    }
  });

  it("con inventario: «con estos filtros» solo si hay filtros activos", () => {
    expect(emptyStateCopy(withFilters({ shapes: ["fish"] }), 12)).toMatchObject({ kind: "filters", title: "No encontramos tablas con estos filtros" });
    const none = emptyStateCopy(emptyFilters(), 12);
    expect(none.kind).toBe("filters");
    expect(`${none.title} ${none.text}`).not.toMatch(/estos filtros/);
  });

  it("filtros activos", () => {
    expect(hasActiveFilters(emptyFilters())).toBe(false);
    expect(hasActiveFilters(withFilters({ zone: "tenerife" }))).toBe(true);
  });
});

describe("botón del buscador de la home", () => {
  it("sin inventario: «Buscar tablas», nunca «Ver alternativas»", () => {
    expect(searchCtaText(0, 0)).toBe("Buscar tablas");
  });
  it("con inventario", () => {
    expect(searchCtaText(0, 30)).toBe("Ver alternativas");
    expect(searchCtaText(1, 30)).toBe("Buscar 1 tabla");
    // Con poco inventario, sin cifra (pero «Ver alternativas» si los filtros no dan nada).
    expect(searchCtaText(1, 1)).toBe("Buscar tablas");
    expect(searchCtaText(12, 19)).toBe("Buscar tablas");
    expect(searchCtaText(0, 5)).toBe("Ver alternativas");
    expect(searchCtaText(1200, 3000, (n) => n.toLocaleString("es-ES"))).toMatch(/^Buscar 1.?200 tablas$/);
    // Sin total conocido, se comporta como antes.
    expect(searchCtaText(0, undefined)).toBe("Ver alternativas");
  });
});
