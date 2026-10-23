import { describe, expect, it } from "vitest";
import { initialFinderState, isValidWeight, recommend, sanitizeFinderState } from "@/lib/finder/recommend";
import { availability, idFromSlugId, listingPath, listingTitle, postedText, sourceBadge } from "@/lib/listing/present";
import { fieldToInches, parseFeet, parseInches, parseLitres, parseMeasures } from "@/lib/publish/parse";
import { buildDemoInventory, DEMO_REFERENCE_DATE } from "../fixtures/demo-inventory";

describe("parse (medidas pegadas)", () => {
  it("interpreta el formato del prototipo", () => {
    expect(parseMeasures(`7'2 x 21 1/2 x 2 7/8 47L`)).toEqual({ len: `7'2"`, width: '21 1/2"', thick: '2 7/8"', vol: "47" });
    expect(parseMeasures("  ")).toEqual({});
    expect(parseMeasures("47,5 litros").vol).toBe("47.5");
  });

  it("convierte a pulgadas", () => {
    expect(parseFeet(`7'2"`)).toBe(86);
    expect(parseFeet(`9'`)).toBe(108);
    expect(parseFeet("abc")).toBeNull();
    expect(parseInches('21 1/2"')).toBe(21.5);
    expect(parseInches("2 7/8")).toBe(2.875);
    expect(parseInches("21,5")).toBe(21.5);
    expect(parseInches("")).toBeNull();
    expect(fieldToInches("len", "218", "cm")).toBeCloseTo(85.83, 2);
    expect(fieldToInches("width", '21 1/2"', "ft")).toBe(21.5);
    expect(parseLitres("47 L")).toBe(47);
    expect(parseLitres("x")).toBeNull();
  });
});

describe("recommend (asistente, lógica orientativa)", () => {
  const base = { ...initialFinderState(), w: "75" };

  it("requiere peso válido y nivel", () => {
    expect(isValidWeight("29")).toBe(false);
    expect(isValidWeight("75")).toBe(true);
    expect(recommend({ ...base, lvl: null })).toBeNull();
  });

  it("coincide con la fórmula del prototipo (wzRec)", () => {
    const r = recommend({ ...base, lvl: "learn", freq: "mid", waves: "med", goals: [] })!;
    expect([r.lo, r.hi]).toEqual([64, 79]);
    const r2 = recommend({ ...base, lvl: "learn", freq: "low", waves: "small", goals: ["learn"] })!;
    expect([r2.lo, r2.hi]).toEqual([74, 92]);
    expect(r2.levelName).toBe("Iniciación");
  });

  it("no propone bajar más de un 20 % de golpe", () => {
    const r = recommend({ ...base, lvl: "turn", freq: "mid", waves: "med", goals: [], cur: "Shortboard", curVol: "60" })!;
    expect(r.lo).toBe(48);
    expect(r.hi).toBeGreaterThanOrEqual(r.lo + 4);
    expect(r.note).toContain("20 %");
  });

  it("olas grandes excluyen longboard y softboard", () => {
    const r = recommend({ ...base, lvl: "learn", freq: "mid", waves: "big", goals: [] })!;
    expect(r.types).not.toContain("longboard");
    expect(r.types).not.toContain("softboard");
  });

  it("sanitiza el estado guardado", () => {
    expect(sanitizeFinderState("basura")).toEqual(initialFinderState());
  });
});

describe("present", () => {
  const all = buildDemoInventory(100);
  const first = all[0];

  it("URLs de anuncio y extracción del id", () => {
    expect(listingPath(first)).toBe("/anuncio/torq-fun-tet-7-2-gran-canaria-a1040");
    expect(idFromSlugId("torq-fun-tet-7-2-gran-canaria-a1040")).toBe("a1040");
    expect(idFromSlugId("x-a100000")).toBe("a100000");
    expect(idFromSlugId("sin-id")).toBeNull();
  });

  it("títulos", () => {
    expect(listingTitle(first)).toBe(`Torq Fun TET 7'2"`);
    expect(listingTitle({ ...first, brand: "Torq", model: null })).toBe(`Torq 7'2"`);
    expect(listingTitle({ ...first, brand: null, model: null })).toBe(`Evolutiva sin marca 7'2"`);
  });

  it("disponibilidad y fecha", () => {
    expect(availability(first, DEMO_REFERENCE_DATE)).toEqual({ text: "Disponible · confirmada hace 2 días", tone: "success" });
    const sold = all.find((l) => l.status === "vendida")!;
    expect(availability(sold, DEMO_REFERENCE_DATE).tone).toBe("error");
    expect(postedText(first, DEMO_REFERENCE_DATE)).toBe("Publicada hoy");
  });

  it("origen del dato", () => {
    expect(sourceBadge(null, null).tone).toBe("none");
    expect(sourceBadge(47, null).tone).toBe("none");
    expect(sourceBadge(47, "manufacturer").text).toBe("Según el fabricante");
    expect(sourceBadge(47, "seller").text).toBe("Según el vendedor");
  });
});
