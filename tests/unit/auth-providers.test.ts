import { describe, expect, it } from "vitest";
import { enabledProviders } from "@/lib/auth/providers";

describe("enabledProviders (botones de Google / Apple)", () => {
  it("sin variable no hay botones", () => {
    expect(enabledProviders("")).toEqual([]);
  });
  it("acepta mayúsculas y espacios, y respeta el orden Google → Apple", () => {
    expect(enabledProviders(" Apple , GOOGLE ")).toEqual(["google", "apple"]);
  });
  it("ignora proveedores desconocidos", () => {
    expect(enabledProviders("github,apple")).toEqual(["apple"]);
  });
});
