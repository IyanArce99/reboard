import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { POPULAR_BRANDS, REFERENCE_BRANDS, slugify } from "@/lib/domain/taxonomy";
import { orderBrands, visibleBrandCount } from "@/lib/publish/draft";

describe("orderBrands (selector de marca al publicar)", () => {
  const known = ["Aipa", "Album", "BIC", "Channel Islands", "Firewire", "NSP", "Pukas", "Softech", "Tokoro", "Torq"];

  it("pone primero Torq, NSP y Softech y deja el resto por orden alfabético", () => {
    const out = orderBrands(known, []);
    expect(out.slice(0, 3)).toEqual(["Torq", "NSP", "Softech"]);
    expect(out.slice(-3)).toEqual(["Aipa", "Album", "Tokoro"]);
  });

  it("no pierde ni duplica marcas (el listado completo sigue accesible)", () => {
    const out = orderBrands(known, ["Torq", "Haydenshapes"]);
    expect(new Set(out).size).toBe(out.length);
    expect([...out].sort()).toEqual([...new Set([...known, "Haydenshapes"])].sort());
  });

  it("con destacadas del panel, van primero en su orden (aunque no sean las habituales)", () => {
    const out = orderBrands(known, ["Haydenshapes"], ["Softech", "Tokoro", "Torq", "NoExiste"]);
    expect(out.slice(0, 3)).toEqual(["Softech", "Tokoro", "Torq"]);
    expect(out).not.toContain("NoExiste");
    expect(out[3]).toBe("Haydenshapes");
    expect(new Set(out).size).toBe(out.length);
  });

  it("nunca se ocultan destacadas tras «Ver todas las marcas»", () => {
    expect(visibleBrandCount(3)).toBe(12);
    expect(visibleBrandCount(15)).toBe(15);
  });

  it("las marcas con modelos de catálogo van tras las habituales", () => {
    const out = orderBrands(known, ["Haydenshapes"]);
    expect(out.indexOf("Haydenshapes")).toBeGreaterThan(out.indexOf("Torq"));
    expect(out.indexOf("Haydenshapes")).toBeLessThan(out.indexOf("Aipa"));
  });
});

describe("marcas de referencia", () => {
  it("la lista del código coincide con la migración (nombre y slug)", () => {
    const sql = readFileSync("supabase/migrations/20261024090000_reference_brands.sql", "utf8");
    const rows = [...sql.matchAll(/\('([a-z0-9-]+)', '([^']+)'\)/g)].map((m) => [m[1], m[2]]);
    expect(rows.map(([, name]) => name)).toEqual(REFERENCE_BRANDS);
    for (const [slug, name] of rows) expect(slug).toBe(slugify(name));
  });

  it("todas las marcas habituales están en la lista de referencia", () => {
    for (const b of POPULAR_BRANDS) expect(REFERENCE_BRANDS).toContain(b);
  });
});

describe("marcas destacadas (panel)", () => {
  it("la migración del panel destaca las habituales en el mismo orden (fallback sin base de datos)", () => {
    const sql = readFileSync("supabase/migrations/20261025090100_admin_panel.sql", "utf8");
    const block = /from \(values ([\s\S]+?)\)\s+as v\(slug, ord\)/.exec(sql)?.[1] ?? "";
    const slugs = [...block.matchAll(/\('([a-z0-9-]+)', (\d+)\)/g)].sort((a, b) => Number(a[2]) - Number(b[2])).map((m) => m[1]);
    expect(slugs).toEqual(POPULAR_BRANDS.map(slugify));
  });
});
