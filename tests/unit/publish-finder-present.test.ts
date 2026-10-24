import { describe, expect, it } from "vitest";
import { initialFinderState, isValidWeight, recommend, sanitizeFinderState } from "@/lib/finder/recommend";
import { availability, idFromSlugId, listingPath, listingTitle, postedText, sourceBadge } from "@/lib/listing/present";
import { fieldToInches, parseFeet, parseInches, parseLitres, parseMeasures } from "@/lib/publish/parse";
import { buildDemoInventory, DEMO_REFERENCE_DATE } from "../fixtures/demo-inventory";

describe("parse (medidas pegadas)", () => {
  it("interpreta el formato del prototipo", () => {
    expect(parseMeasures(`7'2 x 21 1/2 x 2 7/8 47L`)).toEqual({ len: `7'2"`, width: '21 1/2"', thick: '2 7/8"', vol: "47" });
    expect(parseMeasures("  ")).toEqual({});
    expect(parseMeasures("47,5 litros").vol).toBe("47,5");
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
    // Publicada hoy y «confirmada» hace 2 días en el fixture: publicar cuenta como confirmar, así que
    // se cuenta desde la publicación (no «confirmada hace 2 días» junto a «publicada hoy»).
    expect(availability(first, DEMO_REFERENCE_DATE)).toEqual({ text: "Disponible · confirmada hoy", tone: "success" });
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

describe("parseFeet: la longitud como la escribe la gente (bug de publicar, 24-10-2026)", () => {
  it.each([
    [`6'2"`, 74],
    [`6’2”`, 74], // teclado del iPhone
    [`6′2″`, 74], // primas
    [`6'2''`, 74], // dos apóstrofes
    [`6' 2`, 74],
    [`6'2`, 74],
    [`6'`, 72],
    ["6.2", 74],
    ["6,2", 74],
    ["6 2", 74],
    ["6-2", 74],
    ["6.10", 82],
    ["6 ft 2 in", 74],
    ["6 pies 2", 74],
    ["7", 84],
    [`9'0"`, 108],
    [`5'11"`, 71],
    [`6'2.5"`, 74.5],
  ])("«%s» → %d pulgadas", (text, inches) => {
    expect(parseFeet(text)).toBe(inches);
  });

  it.each(["abc", "", "6'13", "6.12", "190", "6'2'2", "6 x 2"])("«%s» no se entiende", (text) => {
    expect(parseFeet(text)).toBeNull();
  });
});

describe("nombre del vendedor en la ficha", () => {
  it("«Surfista» (el nombre por defecto) no se muestra como nombre", async () => {
    const { sellerName, soldBy } = await import("@/lib/listing/present");
    const { buildDemoInventory } = await import("../fixtures/demo-inventory");
    const base = buildDemoInventory(20)[0];
    const withSeller = (name: string, type: "particular" | "tienda" | "escuela") => ({ ...base, seller: { ...base.seller, name, type } });
    expect(sellerName(withSeller("Daniel", "particular"))).toBe("Daniel");
    expect(soldBy(withSeller("Daniel", "particular"))).toEqual({ name: "Daniel", rest: " · Particular" });
    expect(soldBy(withSeller("Escuela Playa Chica", "escuela"))).toEqual({ name: "Escuela Playa Chica", rest: " · Escuela" });
    expect(sellerName(withSeller("Surfista", "particular"))).toBeNull();
    expect(soldBy(withSeller("Surfista", "particular"))).toEqual({ name: null, rest: "un particular" });
    expect(soldBy(withSeller("Surfista", "escuela"))).toEqual({ name: null, rest: "una escuela" });
  });
});

describe("editar un anuncio: la marca se conserva (QA-1, auditoría 24-10-2026)", () => {
  it("«Sin marca» sigue siendo «Sin marca» y «Shaper local» sigue siendo «Shaper local»", async () => {
    const { draftFromListing, NO_BRAND_OPTION, SHAPER_LOCAL } = await import("@/lib/publish/draft");
    const base = buildDemoInventory(20)[0];
    expect(draftFromListing({ ...base, brand: null }).brand).toBe(NO_BRAND_OPTION);
    expect(draftFromListing({ ...base, brand: SHAPER_LOCAL }).brand).toBe(SHAPER_LOCAL);
    expect(draftFromListing({ ...base, brand: "Torq" }).brand).toBe("Torq");
  });
});

describe("confirmar medidas: una sola vez y sin perder el origen (cierre de auditoría)", () => {
  it("confirmAll: catálogo → catok (sigue siendo del fabricante), texto → ok", async () => {
    const { confirmAll, pendingCount, emptyDraft } = await import("@/lib/publish/draft");
    const src = { len: "cat", width: "cat", thick: "ai", vol: "ok" } as const;
    expect(confirmAll({ ...src })).toEqual({ len: "catok", width: "catok", thick: "ok", vol: "ok" });
    expect(pendingCount({ ...emptyDraft(), src: confirmAll({ ...src }) })).toBe(0);
  });

  it("al editar, lo que era del fabricante sigue siéndolo", async () => {
    const { draftFromListing } = await import("@/lib/publish/draft");
    const base = buildDemoInventory(20)[0];
    const d = draftFromListing({
      ...base,
      length: { value: 86, source: "manufacturer" },
      width: { value: 21.5, source: "seller" },
    });
    expect(d.src.len).toBe("catok");
    expect(d.src.width).toBe("ok");
  });
});

describe("reservada (7 días, solo anuncios a la venta)", () => {
  it("vigente 7 días; caducada o en un anuncio vendido no cuenta", async () => {
    const { isReserved, availability } = await import("@/lib/listing/present");
    const base = buildDemoInventory(20)[0];
    const now = new Date("2026-10-24T12:00:00Z");
    const hace = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
    expect(isReserved({ ...base, status: "disponible", reservedAt: hace(1) }, now)).toBe(true);
    expect(isReserved({ ...base, status: "disponible", reservedAt: hace(8) }, now)).toBe(false);
    expect(isReserved({ ...base, status: "vendida", reservedAt: hace(1) }, now)).toBe(false);
    expect(isReserved({ ...base, status: "disponible", reservedAt: null }, now)).toBe(false);
    expect(availability({ ...base, status: "disponible", reservedAt: hace(1) }, now)).toEqual({
      text: "Reservada · si no se cierra, vuelve a estar disponible",
      tone: "warning",
    });
  });
});

describe("TablaFinder: sin softboards si no se recomiendan (revisión UX, 24-10-2026)", () => {
  it("una evolutiva de espuma no encaja si la recomendación es de rígidas", async () => {
    const { typeOk } = await import("@/lib/finder/listings");
    const base = buildDemoInventory(20)[0];
    const soft = { ...base, shape: "evolutiva" as const, construction: "softboard" as const };
    const rigid = { ...base, shape: "evolutiva" as const, construction: "epoxy" as const };
    expect(typeOk(soft, ["evolutiva", "midlength"])).toBe(false);
    expect(typeOk(rigid, ["evolutiva", "midlength"])).toBe(true);
    expect(typeOk(soft, ["softboard", "evolutiva"])).toBe(true);
  });
});
