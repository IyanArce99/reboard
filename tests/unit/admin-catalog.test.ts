import { describe, expect, it } from "vitest";
import {
  brandFromForm,
  findSimilar,
  lengthField,
  modelFromForm,
  moveFeatured,
  normalizeName,
  parseAliases,
  similarNames,
  sizeFromForm,
  toSlug,
} from "@/components/admin/catalog/schema";
import { parseSiteNotice, settingNumberSchema, siteNoticeSchema } from "@/components/admin/settings/schema";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("slugs y alias", () => {
  it("slug desde el nombre (sin acentos, 60 caracteres, sin guion final)", () => {
    expect(toSlug("Channel Islands")).toBe("channel-islands");
    expect(toSlug("Ñandú Surf · Tablas")).toBe("nandu-surf-tablas");
    expect(toSlug("a".repeat(59) + " b").length).toBeLessThanOrEqual(60);
    expect(toSlug("a".repeat(59) + " b")).not.toMatch(/-$/);
  });

  it("alias: recorta, quita vacíos, duplicados y el propio nombre", () => {
    expect(parseAliases(" Torq Surfboards, TORQ ,torq surfboards,, Torq-Surf ", "Torq")).toEqual(["Torq Surfboards", "Torq-Surf"]);
    expect(parseAliases("JS, J.S. Industries\nJS Surfboards", "JS Industries")).toEqual(["JS", "JS Surfboards"]);
  });

  it("marca: valida slug y longitudes; slug por defecto desde el nombre", () => {
    const ok = brandFromForm(fd({ name: "Pukas", aliases: "Pukas Surf", sort_order: "3", featured: "on" }));
    expect(ok.success && ok.data).toMatchObject({ slug: "pukas", aliases: ["Pukas Surf"], featured: true, sort_order: 3, intro: null });
    expect(brandFromForm(fd({ name: "X", slug: "Mal Slug" })).success).toBe(false);
    expect(brandFromForm(fd({ name: "x".repeat(61) })).success).toBe(false);
    expect(brandFromForm(fd({ name: "Pukas", sort_order: "1000" })).success).toBe(false);
    expect(brandFromForm(fd({ name: "Pukas", logo_path: "javascript:alert(1)" })).success).toBe(false);
    expect(brandFromForm(fd({ name: "Pukas", logo_path: "marcas/pukas.svg" })).success).toBe(true);
  });

  it("modelo: forma y construcción de la taxonomía", () => {
    expect(modelFromForm(fd({ brand_id: "4", name: "Mod Fun", shape: "evolutiva", construction: "epoxy" })).success).toBe(true);
    expect(modelFromForm(fd({ brand_id: "4", name: "Mod Fun", shape: "principiantes", construction: "epoxy" })).success).toBe(false);
    expect(modelFromForm(fd({ brand_id: "4", name: "Mod Fun", shape: "fish", construction: "carbono" })).success).toBe(false);
  });
});

describe("medidas del fabricante", () => {
  it("acepta pies, fracciones y comas; litros opcionales", () => {
    expect(lengthField(`7'2"`)).toBe(86);
    expect(lengthField("86")).toBe(86);
    const r = sizeFromForm(fd({ label: `7'2"`, length_in: `7'2`, width_in: "21 1/2", thickness_in: "2,875", volume_l: "" }));
    expect(r.success && r.data).toEqual({ label: `7'2"`, length_in: 86, width_in: 21.5, thickness_in: 2.875, volume_l: null, sort_order: 0 });
  });

  it("respeta los límites de la base de datos", () => {
    const base = { label: "x", length_in: "86", width_in: "21", thickness_in: "2.75" };
    expect(sizeFromForm(fd({ ...base, length_in: "40" })).success).toBe(false);
    expect(sizeFromForm(fd({ ...base, width_in: "31" })).success).toBe(false);
    expect(sizeFromForm(fd({ ...base, thickness_in: "1" })).success).toBe(false);
    expect(sizeFromForm(fd({ ...base, volume_l: "151" })).success).toBe(false);
    expect(sizeFromForm(fd({ ...base, volume_l: "abc" })).success).toBe(false);
    expect(sizeFromForm(fd({ ...base, volume_l: "55,4" })).success).toBe(true);
  });
});

describe("duplicados", () => {
  it("nombres parecidos al normalizar o con una letra de diferencia", () => {
    expect(normalizeName("Fun-Tet ")).toBe("funtet");
    expect(similarNames("Fun Tet", "fun-tet")).toBe(true);
    expect(similarNames("Mod Fish", "Mod Fsh")).toBe(true);
    expect(similarNames("Fish", "Gun")).toBe(false);
    expect(similarNames("Mod Fun", "Mod Fish")).toBe(false);
  });

  it("agrupa solo dentro de la misma marca y también por alias", () => {
    const models = [
      { id: 1, name: "Mod Fun", brand: 1 },
      { id: 2, name: "Mod-Fun", brand: 1 },
      { id: 3, name: "Mod Fun", brand: 2 },
      { id: 4, name: "Longboard", brand: 1 },
    ];
    expect(findSimilar(models, (m) => m.brand).map((g) => g.map((m) => m.id))).toEqual([[1, 2]]);
    const brands = [
      { id: 1, name: "Torq", aliases: ["Torq Surfboards"] },
      { id: 2, name: "TORQ Surfboards", aliases: [] },
      { id: 3, name: "NSP", aliases: [] },
    ];
    expect(findSimilar(brands).map((g) => g.map((b) => b.id))).toEqual([[1, 2]]);
  });
});

describe("orden de las destacadas", () => {
  const list = [
    { id: 10, sort_order: 1 },
    { id: 20, sort_order: 2 },
    { id: 30, sort_order: 3 },
  ];
  it("subir y bajar intercambia con la vecina", () => {
    expect(moveFeatured(list, 30, "up")).toEqual([
      { id: 30, sort_order: 2 },
      { id: 20, sort_order: 3 },
    ]);
    expect(moveFeatured(list, 10, "down")).toEqual([
      { id: 20, sort_order: 1 },
      { id: 10, sort_order: 2 },
    ]);
  });
  it("en los extremos no cambia nada; renumera huecos", () => {
    expect(moveFeatured(list, 10, "up")).toEqual([]);
    expect(moveFeatured([{ id: 1, sort_order: 5 }, { id: 2, sort_order: 9 }], 1, "up")).toEqual([
      { id: 1, sort_order: 1 },
      { id: 2, sort_order: 2 },
    ]);
  });
});

describe("configuración", () => {
  it("aviso: 280 caracteres, tono info|warning y texto para activarlo", () => {
    expect(siteNoticeSchema.safeParse({ active: true, text: "Mantenimiento", tone: "info" }).success).toBe(true);
    expect(siteNoticeSchema.safeParse({ active: true, text: "", tone: "info" }).success).toBe(false);
    expect(siteNoticeSchema.safeParse({ active: false, text: "x".repeat(281), tone: "info" }).success).toBe(false);
    expect(siteNoticeSchema.safeParse({ active: false, text: "", tone: "error" }).success).toBe(false);
    expect(parseSiteNotice({ active: "yes", text: 3 })).toEqual({ active: false, text: "", tone: "info" });
  });
  it("umbrales: enteros de 1 a 100", () => {
    expect(settingNumberSchema.safeParse("3").success).toBe(true);
    expect(settingNumberSchema.safeParse("0").success).toBe(false);
    expect(settingNumberSchema.safeParse("101").success).toBe(false);
    expect(settingNumberSchema.safeParse("2.5").success).toBe(false);
  });
});
