import { describe, expect, it } from "vitest";
import { alertText, appliedChips, emptySuggestions, resultsShortTitle, resultsTitle, type CatalogNames } from "@/lib/search/describe";
import { emptyFilters, withFilters } from "@/lib/search/filters";
import {
  LANDING_FORMS,
  LANDING_PLACES,
  isLandingForm,
  isLandingPlace,
  landingFilters,
  landingPath,
  landingPathFor,
  landingTitle,
} from "@/lib/search/landings";

const names: CatalogNames = {
  brands: [{ slug: "torq", name: "Torq" }],
  models: [{ slug: "fun-tet", name: "Fun TET", brandSlug: "torq" }],
};

describe("títulos", () => {
  it("H1 dinámico como el prototipo", () => {
    expect(resultsTitle(withFilters({ shapes: ["evolutiva"], zone: "gran-canaria" }), names)).toBe("Evolutivas de segunda mano en Gran Canaria");
    expect(resultsTitle(withFilters({ shapes: ["fish"] }), names)).toBe("Tablas fish de segunda mano");
    expect(resultsTitle(withFilters({ constructions: ["softboard"] }), names)).toBe("Softboards de segunda mano");
    expect(resultsTitle(withFilters({ brand: "torq", zone: "tenerife" }), names)).toBe("Tablas Torq de segunda mano en Tenerife");
    expect(resultsTitle(withFilters({ brand: "sin-marca" }), names)).toBe("Tablas de surf de segunda mano");
    expect(resultsTitle(withFilters({ zone: "canarias" }), names)).toBe("Tablas de surf de segunda mano en Canarias");
  });

  it("título corto de las migas", () => {
    expect(resultsShortTitle(withFilters({ shapes: ["gun"] }))).toBe("Gun / Step-up");
    expect(resultsShortTitle(withFilters({ zone: "cadiz" }))).toBe("Cádiz");
    expect(resultsShortTitle(emptyFilters())).toBe("Resultados");
  });

  it("título de landing de principiantes", () => {
    expect(landingTitle("asturias", "principiantes", "x")).toBe("Tablas de surf para principiantes de segunda mano en Asturias");
    expect(landingTitle(null, "evolutiva", "fallback")).toBe("fallback");
  });
});

describe("alertText", () => {
  it("describe los filtros", () => {
    expect(
      alertText(withFilters({ shapes: ["evolutiva"], volMin: 45, volMax: 60, priceMax: 200, zone: "gran-canaria" }), names),
    ).toBe("Evolutivas de 45–60 L, por menos de 200 €, en Gran Canaria");
    expect(alertText(emptyFilters(), names)).toBe("Tablas, en toda España");
    expect(alertText(withFilters({ brand: "torq", lenMin: 84, lenMax: 90 }), names)).toBe(`Tablas Torq entre 7'0" y 7'6", en toda España`);
  });
});

describe("chips aplicados y sugerencias", () => {
  it("quitar un chip elimina solo su filtro", () => {
    const f = withFilters({ zone: "cadiz", dist: 10, shapes: ["fish", "hibrida"], brand: "torq", model: "fun-tet" });
    const chips = appliedChips(f, names);
    expect(chips.map((c) => c.label)).toEqual(["Cádiz", "< 10 km", "Fish", "Híbrida", "Torq", "Fun TET"]);
    expect(chips.find((c) => c.key === "zona")!.without).toMatchObject({ zone: "", dist: null });
    expect(chips.find((c) => c.key === "forma-fish")!.without.shapes).toEqual(["hibrida"]);
    expect(chips.find((c) => c.key === "marca")!.without).toMatchObject({ brand: "", model: "" });
  });

  it("sugerencias del estado vacío", () => {
    const s = emptySuggestions(withFilters({ shapes: ["longboard"], zone: "lanzarote", priceMax: 150, volMin: 60 }));
    expect(s.map((x) => x.label)).toEqual(["Toda España", "Hasta 200 €", "Litros 55–∞", "Cualquier forma", "Quitar todos los filtros"]);
  });
});

describe("landings", () => {
  it("formas y lugares válidos", () => {
    expect(LANDING_FORMS).toHaveLength(9);
    expect(LANDING_PLACES).toContain("canarias");
    expect(isLandingForm("principiantes")).toBe(true);
    expect(isLandingForm("patinete")).toBe(false);
    expect(isLandingPlace("pais-vasco")).toBe(true);
  });

  it("filtros de cada landing", () => {
    expect(landingFilters(null, "softboard").constructions).toEqual(["softboard"]);
    expect(landingFilters(null, "principiantes").volMin).toBe(55);
    expect(landingFilters("tenerife", "fish")).toMatchObject({ zone: "tenerife", shapes: ["fish"] });
    expect(landingPath("tenerife", "fish")).toBe("/tablas/tenerife/fish");
    expect(landingPath(null, "fish")).toBe("/tablas/fish");
  });

  it("canonical de /buscar hacia la landing equivalente", () => {
    expect(landingPathFor(withFilters({ shapes: ["evolutiva"], zone: "gran-canaria" }))).toBe("/tablas/gran-canaria/evolutiva");
    expect(landingPathFor(withFilters({ zone: "canarias" }))).toBe("/tablas/canarias");
    expect(landingPathFor(withFilters({ volMin: 55 }))).toBe("/tablas/principiantes");
    expect(landingPathFor(withFilters({ shapes: ["evolutiva"], priceMax: 200 }))).toBeNull();
    expect(landingPathFor(emptyFilters())).toBeNull();
  });
});
