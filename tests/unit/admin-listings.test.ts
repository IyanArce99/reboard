import { describe, expect, it } from "vitest";
import {
  availableModeration,
  changedFields,
  cleanSearch,
  countByListing,
  groupReports,
  lastHideOrRemoveByListing,
  moderationView,
  nextDay,
  parseListingFilters,
  parseSearch,
  textSearchOr,
} from "@/components/admin/listings/model";
import { REPORT_REASONS, REPORT_REASON_LABEL } from "@/components/moderation/labels";

describe("filtros de /admin/anuncios", () => {
  it("acepta valores válidos", () => {
    expect(
      parseListingFilters({
        estado: "published",
        moderacion: "flagged",
        tipo: "fish",
        zona: "cadiz",
        desde: "2026-10-01",
        hasta: "2026-10-23",
        vendedor: "0D3C7B1E-1111-4222-8333-444455556666",
        q: "  Pyzel  ",
      }),
    ).toEqual({
      estado: "published",
      moderacion: "flagged",
      tipo: "fish",
      zona: "cadiz",
      desde: "2026-10-01",
      hasta: "2026-10-23",
      vendedor: "0d3c7b1e-1111-4222-8333-444455556666",
      q: "Pyzel",
    });
  });

  it("ignora lo que no es válido (nunca llega a la consulta)", () => {
    const f = parseListingFilters({
      estado: "borrado",
      moderacion: "hidden",
      tipo: "principiantes",
      zona: "Cádiz;drop",
      desde: "2026-02-30",
      hasta: "ayer",
      vendedor: "no-es-uuid",
      q: ["", "x"],
    });
    expect(Object.values(f).every((v) => v === undefined)).toBe(true);
  });

  it("usa el primer valor si el parámetro se repite", () => {
    expect(parseListingFilters({ estado: ["sold", "draft"] }).estado).toBe("sold");
  });

  it("«hasta» es inclusivo (día siguiente, también a fin de mes)", () => {
    expect(nextDay("2026-10-31")).toBe("2026-11-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
  });
});

describe("búsqueda", () => {
  it("quita caracteres que alterarían el filtro or() de PostgREST", () => {
    expect(cleanSearch('al,merrick)"*%\\ (x)')).toBe("al merrick x");
    expect(cleanSearch("Ñandú  6.2")).toBe("Ñandú 6.2");
    expect(cleanSearch("a".repeat(100))).toHaveLength(60);
  });

  it("id público exacto o texto", () => {
    expect(parseSearch("a100123")).toEqual({ kind: "id", id: 100123 });
    expect(parseSearch("A100123")).toEqual({ kind: "id", id: 100123 });
    expect(parseSearch("100123")).toEqual({ kind: "id", id: 100123 });
    expect(parseSearch("channel islands")).toEqual({ kind: "text", text: "channel islands" });
    expect(parseSearch(undefined)).toBeNull();
  });

  it("or() con marca libre, slug y marcas del catálogo", () => {
    expect(textSearchOr("Al Merrick", [3, 7])).toBe('brand_text.ilike."%Al Merrick%",slug.ilike."%al-merrick%",brand_id.in.(3,7)');
    expect(textSearchOr("pyzel", [])).toBe('brand_text.ilike."%pyzel%",slug.ilike."%pyzel%"');
  });
});

describe("estado de moderación", () => {
  it("distingue oculto de retirado por la última acción hide/remove", () => {
    expect(moderationView("visible", null)).toBe("visible");
    expect(moderationView("flagged", "hide")).toBe("flagged");
    expect(moderationView("removed", "hide")).toBe("hidden");
    expect(moderationView("removed", "remove")).toBe("removed");
    // Datos antiguos sin registro: se trata como retirado.
    expect(moderationView("removed", null)).toBe("removed");
  });

  it("toma la acción más reciente por anuncio (entrada ordenada de nueva a antigua)", () => {
    const m = lastHideOrRemoveByListing([
      { listing_id: 1, action: "restore" },
      { listing_id: 1, action: "hide" },
      { listing_id: 1, action: "remove" },
      { listing_id: 2, action: "remove" },
    ]);
    expect(m.get(1)).toBe("hide");
    expect(m.get(2)).toBe("remove");
    expect(m.has(3)).toBe(false);
  });

  it("acciones disponibles según el estado", () => {
    expect(availableModeration("visible", "published", 0)).toEqual({ hide: true, remove: true, restore: false, markSold: true, reports: false });
    expect(availableModeration("hidden", "published", 2)).toEqual({ hide: false, remove: true, restore: true, markSold: true, reports: true });
    expect(availableModeration("removed", "sold", 0)).toEqual({ hide: false, remove: false, restore: true, markSold: false, reports: false });
  });
});

describe("reportes", () => {
  it("cuenta por anuncio", () => {
    expect([...countByListing([{ listing_id: 1 }, { listing_id: 2 }, { listing_id: 1 }])]).toEqual([
      [1, 2],
      [2, 1],
    ]);
  });

  it("agrupa por anuncio: más reportes primero y, a igualdad, el más reciente", () => {
    const g = groupReports([
      { id: 1, listing_id: 10, created_at: "2026-10-01T10:00:00Z" },
      { id: 2, listing_id: 20, created_at: "2026-10-03T10:00:00Z" },
      { id: 3, listing_id: 10, created_at: "2026-10-02T10:00:00Z" },
      { id: 4, listing_id: 30, created_at: "2026-10-04T10:00:00Z" },
    ]);
    expect(g.map((x) => x.listingId)).toEqual([10, 30, 20]);
    expect(g[0].reports.map((r) => r.id)).toEqual([3, 1]);
  });

  it("los motivos coinciden con el enum report_reason y tienen etiqueta", () => {
    expect(REPORT_REASONS.map(([v]) => v).sort()).toEqual(["datos-falsos", "duplicado", "fotos", "fraude", "inapropiado", "otro", "vendida"]);
    expect(REPORT_REASON_LABEL.fotos).toBe("Fotografías que no corresponden");
    expect(REPORT_REASON_LABEL.fraude).toBe("Posible estafa");
  });
});

describe("edición de textos", () => {
  it("solo envía lo que cambia, recortado", () => {
    const initial = { description: "Hola", town: "El Palmar", fins: null, repairs: null };
    expect(changedFields(initial, { description: "Hola ", town: "Conil", fins: "", repairs: "  Ding en la cola " })).toEqual({
      town: "Conil",
      repairs: "Ding en la cola",
    });
    expect(changedFields(initial, { description: "" })).toEqual({ description: "" });
  });
});
