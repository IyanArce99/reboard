import { describe, expect, it } from "vitest";
import { exactBrand, matchBrands } from "@/lib/publish/brands";

const BRANDS = ["Torq", "NSP", "Softech", "Firewire", "Channel Islands", "JS Industries", "Pukas", "Catch Surf", "Olaian", "BIC"];
const FEATURED = ["Torq", "NSP", "Softech", "Firewire"];

describe("campo Marca (autocompletado)", () => {
  it("sin texto, sugiere las destacadas en su orden", () => {
    expect(matchBrands("", BRANDS, FEATURED)).toEqual(FEATURED);
  });
  it("primero las que empiezan así, luego por palabra y después las que lo contienen", () => {
    expect(matchBrands("fi", BRANDS, FEATURED)).toEqual(["Firewire"]);
    expect(matchBrands("isl", BRANDS, FEATURED)).toEqual(["Channel Islands"]);
    // «s»: empieza (Softech) → palabra que empieza (Catch Surf) → la contienen (NSP, JS Industries…).
    expect(matchBrands("s", BRANDS, FEATURED).slice(0, 3)).toEqual(["Softech", "Catch Surf", "NSP"]);
  });
  it("sin tildes, mayúsculas ni espacios", () => {
    expect(matchBrands("CHANNELISL", BRANDS, FEATURED)).toEqual(["Channel Islands"]);
    expect(matchBrands("js ind", BRANDS, FEATURED)).toEqual(["JS Industries"]);
    expect(exactBrand(" channel islands ", BRANDS)).toBe("Channel Islands");
    expect(exactBrand("Pukás", BRANDS)).toBe("Pukas");
  });
  it("una marca que no está no coincide (se usa tal cual se escribe)", () => {
    expect(matchBrands("Mayhem", BRANDS, FEATURED)).toEqual([]);
    expect(exactBrand("Mayhem", BRANDS)).toBeNull();
  });
});
