// Lanzamiento solo en Canarias (docs/DECISIONS.md): territorio activo, búsqueda, publicar y SEO.
import { describe, expect, it } from "vitest";
import {
  ACTIVE_ZONE_SLUGS,
  ALL_ZONES,
  LAUNCH,
  REGIONS,
  ZONES,
  coversTerritory,
  isActivePlace,
  placeName,
  zoneLabel,
} from "@/lib/domain/taxonomy";
import { toRpcParams } from "@/lib/data/supabase-mapping";
import { applyCatalogSize, emptyDraft, type PublishDraft } from "@/lib/publish/draft";
import { ListingInput, draftToInput, firstIssueText } from "@/lib/publish/schema";
import { matches } from "@/lib/search/match";
import { emptyFilters, parseFilters, withFilters } from "@/lib/search/filters";
import { LANDING_PLACES, isLandingPlace } from "@/lib/search/landings";
import { DEMO_CATALOG, buildDemoInventory } from "../fixtures/demo-inventory";

const ISLANDS = ["gran-canaria", "tenerife", "lanzarote", "fuerteventura", "la-palma", "la-gomera", "el-hierro", "la-graciosa"];
const PENINSULA = ["asturias", "cantabria", "galicia", "pais-vasco", "cadiz"];

describe("territorio activo", () => {
  it("son las 8 islas; la península se conserva en el catálogo, inactiva", () => {
    expect(ACTIVE_ZONE_SLUGS).toEqual(ISLANDS);
    expect(ZONES.every((z) => z.region === "canarias")).toBe(true);
    expect(ALL_ZONES.map((z) => z.slug)).toEqual([...ISLANDS, ...PENINSULA]);
    expect(REGIONS.map((r) => r.slug)).toEqual(["canarias"]);
    for (const p of PENINSULA) {
      expect(isActivePlace(p)).toBe(false);
      expect(placeName(p)).toBeUndefined();
      // Un anuncio antiguo fuera del territorio sigue mostrando su nombre.
      expect(zoneLabel(p)).not.toBe(p);
    }
  });

  it("cada isla tiene su provincia y localidades", () => {
    for (const z of ZONES) {
      expect(["Las Palmas", "Santa Cruz de Tenerife"]).toContain(z.group);
      expect(z.towns.length).toBeGreaterThan(0);
    }
  });

  it("«canarias» abarca todo el territorio: equivale a «Todas las islas»", () => {
    expect(coversTerritory("canarias")).toBe(true);
    expect(coversTerritory("tenerife")).toBe(false);
    expect(LAUNCH.allLabel).toBe("Todas las islas");
  });
});

describe("búsqueda", () => {
  it("la URL solo admite islas: la península y «canarias» se ignoran", () => {
    expect(parseFilters({ zona: "tenerife" }).zone).toBe("tenerife");
    expect(parseFilters({ zona: "asturias" }).zone).toBe("");
    expect(parseFilters({ zona: "cadiz" }).zone).toBe("");
    expect(parseFilters({ zona: "canarias" }).zone).toBe("");
  });

  it("sin isla, la consulta a la base de datos pide solo las 8 islas", () => {
    expect(toRpcParams(emptyFilters()).zones).toEqual(ISLANDS);
    expect(toRpcParams(withFilters({ zone: "la-palma" })).zones).toEqual(["la-palma"]);
  });

  it("«Todas las islas» no devuelve anuncios de fuera de Canarias", () => {
    const [base] = buildDemoInventory(100);
    const inCadiz = { ...base, zone: "cadiz" };
    const inTenerife = { ...base, zone: "tenerife" };
    expect(matches(inCadiz, emptyFilters())).toBe(false);
    expect(matches(inTenerife, emptyFilters())).toBe(true);
  });

  it("el inventario DEMO (tests y local) está entero en Canarias", () => {
    expect(buildDemoInventory(100).every((l) => ISLANDS.includes(l.zone))).toBe(true);
  });
});

describe("publicar", () => {
  // Mismo borrador válido que en publish-schema.test.ts, cambiando solo la zona.
  const torq = DEMO_CATALOG.find((m) => m.brand === "Torq" && m.slug === "fun-tet")!;
  const size = torq.sizes.find((x) => x.label === `7'2"`)!;
  const draft = (zone: string): PublishDraft =>
    applyCatalogSize(
      {
        ...emptyDraft(zone),
        brand: "Torq",
        model: torq.model,
        shape: torq.shape,
        construction: torq.construction,
        condition: "buen-estado",
        price: "250",
        town: "Telde",
        phone: "600 111 222",
      },
      size,
    );

  it("acepta cualquiera de las 8 islas", () => {
    for (const z of ISLANDS) expect(ListingInput.safeParse(draftToInput(draft(z), DEMO_CATALOG)).success).toBe(true);
  });

  it("rechaza zonas de fuera de Canarias, con un mensaje claro (también en el servidor)", () => {
    for (const z of [...PENINSULA, "canarias", "inventada"]) {
      const r = ListingInput.safeParse(draftToInput(draft(z), DEMO_CATALOG));
      expect(r.success).toBe(false);
      if (!r.success) expect(firstIssueText(r.error)).toMatch(/Canarias/);
    }
  });
});

describe("SEO", () => {
  it("landings solo de las 8 islas; ninguna de la península ni de «canarias»", () => {
    expect(LANDING_PLACES).toEqual(ISLANDS);
    for (const p of [...PENINSULA, "canarias"]) expect(isLandingPlace(p)).toBe(false);
  });
});
