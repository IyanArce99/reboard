import { describe, expect, it } from "vitest";
import { SHAPER_LOCAL, applyCatalogSize, emptyDraft, type PublishDraft } from "@/lib/publish/draft";
import { ListingInput, draftToInput, firstIssueText, listingSlugFor, toE164 } from "@/lib/publish/schema";
import { photoPathOk } from "@/lib/publish/save";
import { DEMO_CATALOG } from "../fixtures/demo-inventory";

const torq = DEMO_CATALOG.find((m) => m.brand === "Torq" && m.slug === "fun-tet")!;
const size = torq.sizes.find((s) => s.label === `7'2"`)!;

function catalogDraft(): PublishDraft {
  const d: PublishDraft = {
    ...emptyDraft("asturias"),
    brand: "Torq",
    model: torq.model,
    shape: torq.shape,
    construction: torq.construction,
    condition: "buen-estado",
    price: "250",
    town: "Salinas",
    phone: "600 111 222",
  };
  return applyCatalogSize(d, size);
}

describe("toE164", () => {
  it.each([
    ["600 111 222", "+34600111222"],
    ["+34 600-111-222", "+34600111222"],
    ["0034600111222", "+34600111222"],
    ["+351 912 345 678", "+351912345678"],
  ])("%s → %s", (input, out) => {
    expect(toE164(input)).toBe(out);
  });
  it.each(["", "12345", "abc", "+0123456789"])("rechaza %s", (v) => {
    expect(toE164(v)).toBeNull();
  });
});

describe("draftToInput (origen de cada medida)", () => {
  it("medida del catálogo sin tocar → 'manufacturer' y enlazada a la medida", () => {
    const v = ListingInput.parse(draftToInput(catalogDraft(), DEMO_CATALOG));
    expect(v).toMatchObject({ brandSlug: "torq", modelSlug: "fun-tet", catalogSize: `7'2"`, lengthSource: "manufacturer", widthSource: "manufacturer" });
    expect(v.lengthIn).toBeCloseTo(size.lengthIn, 1);
    expect(v.phone).toBe("+34600111222");
  });

  it("medida que el vendedor escribe → 'seller'; sin valor, sin origen", () => {
    const d = { ...catalogDraft(), vol: "", width: `21 3/4"`, src: { len: "cat" as const, width: "ok" as const, thick: "cat" as const } };
    const v = ListingInput.parse(draftToInput(d, DEMO_CATALOG));
    expect(v.widthSource).toBe("seller");
    expect(v.widthIn).toBeCloseTo(21.75, 3);
    expect(v.volumeL).toBeNull();
    expect(v.volumeSource).toBeNull();
  });

  it("sin catálogo nunca usa 'manufacturer'", () => {
    const d: PublishDraft = { ...catalogDraft(), brand: SHAPER_LOCAL, model: "", size: "" };
    const v = ListingInput.parse(draftToInput(d, DEMO_CATALOG));
    expect(v).toMatchObject({ brandSlug: null, modelSlug: null, catalogSize: null, brandText: "Shaper local", lengthSource: "seller" });
  });

  it("explica el primer error en español", () => {
    const r = ListingInput.safeParse(draftToInput({ ...catalogDraft(), price: "" }, DEMO_CATALOG));
    expect(r.success).toBe(false);
    if (!r.success) expect(firstIssueText(r.error)).toMatch(/precio/i);
  });
});

describe("listingSlugFor", () => {
  const v = { brandText: null, sizeLabel: `6'4"`, zoneSlug: "cantabria", shape: "fish" as const };
  it("con marca y modelo, como los anuncios del catálogo", () => {
    expect(listingSlugFor({ ...v, sizeLabel: `7'2"`, zoneSlug: "asturias" }, "Torq", "Fun TET")).toBe("torq-fun-tet-7-2-asturias");
  });
  it("artesanal o shaper local", () => {
    expect(listingSlugFor(v, null, null)).toBe("fish-artesanal-6-4-cantabria");
    expect(listingSlugFor({ ...v, brandText: "Shaper local" }, null, null)).toBe("shaper-local-6-4-cantabria");
  });
});

describe("photoPathOk", () => {
  const u = "11111111-2222-3333-4444-555555555555";
  it("solo la carpeta del usuario y del anuncio, con nombre UUID", () => {
    expect(photoPathOk(`${u}/100001/${crypto.randomUUID()}.webp`, u, 100001)).toBe(true);
    expect(photoPathOk(`${u}/100001/${crypto.randomUUID()}.jpg`, u, 100001)).toBe(true);
    expect(photoPathOk(`${u}/100002/${crypto.randomUUID()}.webp`, u, 100001)).toBe(false);
    expect(photoPathOk(`${u}/100001/../x.webp`, u, 100001)).toBe(false);
    expect(photoPathOk(`otro/100001/${crypto.randomUUID()}.webp`, u, 100001)).toBe(false);
  });
});
