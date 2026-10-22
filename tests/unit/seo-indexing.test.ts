import { describe, expect, it } from "vitest";
import { MIN_LISTINGS_COMBO, landingIndexable } from "@/lib/search/indexing";
import { LANDING_FORMS, LANDING_PLACES, landingDescription } from "@/lib/search/landings";

// Política de indexación de las landings (docs/seo-ux-audit.md §C.2).
describe("landingIndexable", () => {
  it("indexa un tipo o una zona con un anuncio, no sin ninguno", () => {
    expect(landingIndexable(null, "evolutiva", 1)).toBe(true);
    expect(landingIndexable("gran-canaria", null, 1)).toBe(true);
    expect(landingIndexable(null, "evolutiva", 0)).toBe(false);
    expect(landingIndexable("gran-canaria", null, 0)).toBe(false);
  });

  it("exige más inventario a una combinación zona + tipo", () => {
    expect(landingIndexable("gran-canaria", "evolutiva", MIN_LISTINGS_COMBO - 1)).toBe(false);
    expect(landingIndexable("gran-canaria", "evolutiva", MIN_LISTINGS_COMBO)).toBe(true);
  });
});

describe("landingDescription", () => {
  it("concuerda en singular y plural", () => {
    expect(landingDescription("gran-canaria", null, 1)).toMatch(/^1 tabla /);
    expect(landingDescription("gran-canaria", null, 2)).toMatch(/^2 tablas /);
    expect(landingDescription(null, "evolutiva", 1)).not.toMatch(/1 anuncios|1 tablas/);
  });

  it("no repite la misma descripción entre landings", () => {
    const all = [
      ...LANDING_FORMS.map((f) => landingDescription(null, f, 5)),
      ...LANDING_PLACES.map((p) => landingDescription(p, null, 5)),
      ...LANDING_PLACES.flatMap((p) => LANDING_FORMS.map((f) => landingDescription(p, f, 5))),
    ];
    expect(new Set(all).size).toBe(all.length);
  });
});
