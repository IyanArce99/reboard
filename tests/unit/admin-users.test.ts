import { describe, expect, it } from "vitest";
import {
  MAX_KEYS,
  auditDiff,
  banState,
  entityHref,
  isUuid,
  parseAuditFilters,
  parseUserFilters,
  shortValue,
} from "@/components/admin/users/format";

const ID = "d9b8efe7-5ff5-4e22-ac1d-ccec664f13bf";

describe("admin usuarios: filtros", () => {
  it("acepta búsqueda y estados válidos", () => {
    expect(parseUserFilters({ q: "  ana@x.es ", estado: "suspended" })).toEqual({ q: "ana@x.es", estado: "suspended" });
    expect(parseUserFilters({ estado: ["staff", "active"] }).estado).toBe("staff");
  });

  it("ignora estados desconocidos y recorta la búsqueda", () => {
    expect(parseUserFilters({ estado: "root" }).estado).toBeUndefined();
    expect(parseUserFilters({ estado: "" }).estado).toBeUndefined();
    expect(parseUserFilters({ q: "a".repeat(500) }).q).toHaveLength(200);
    expect(parseUserFilters({ q: "   " }).q).toBeUndefined();
  });

  it("isUuid", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid(ID.toUpperCase())).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(`${ID}'; drop table x`)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("admin auditoría: filtros", () => {
  it("pasa solo valores con formato válido", () => {
    const f = parseAuditFilters({ tipo: "user", accion: "Set_Role", actor: ID.toUpperCase(), entidad: "a123" });
    expect(f).toEqual({ tipo: "user", accion: "set_role", actor: ID, entidad: "a123", invalid: false });
  });

  it("descarta y avisa de lo no válido", () => {
    const f = parseAuditFilters({ tipo: "secret", accion: "drop table", actor: "yo", entidad: "x".repeat(81) });
    expect(f.tipo).toBeUndefined();
    expect(f.accion).toBeUndefined();
    expect(f.actor).toBeUndefined();
    expect(f.entidad).toBeUndefined();
    expect(f.invalid).toBe(true);
    expect(parseAuditFilters({}).invalid).toBe(false);
  });
});

describe("admin auditoría: enlaces a entidades", () => {
  it("enlaza cada tipo a su página", () => {
    expect(entityHref("user", ID)).toBe(`/admin/usuarios/${ID}`);
    expect(entityHref("role", ID)).toBe(`/admin/usuarios/${ID}`);
    expect(entityHref("listing", "a42")).toBe("/admin/anuncios/a42");
    expect(entityHref("brand", "firewire")).toBe("/admin/catalogo");
    expect(entityHref("model", "x")).toBe("/admin/catalogo");
    expect(entityHref("shop", "x")).toBe("/admin/tiendas");
  });

  it("no enlaza ids con formato inesperado", () => {
    expect(entityHref("user", "?")).toBeNull();
    expect(entityHref("listing", "../x")).toBeNull();
    expect(entityHref("otro", "1")).toBeNull();
  });
});

describe("admin auditoría: diferencias", () => {
  it("muestra solo las claves que cambian", () => {
    const { rows, more } = auditDiff({ role: "user", name: "A", updated_at: "1" }, { role: "admin", name: "A", updated_at: "2" });
    expect(rows).toEqual([{ key: "role", before: "user", after: "admin" }]);
    expect(more).toBe(0);
  });

  it("creación y borrado", () => {
    expect(auditDiff(null, { hidden_listings: 2 }).rows).toEqual([{ key: "hidden_listings", before: "—", after: "2" }]);
    expect(auditDiff({ slug: "x" }, null).rows).toEqual([{ key: "slug", before: "x", after: "—" }]);
    expect(auditDiff(null, null).rows).toEqual([]);
  });

  it("nunca muestra datos de contacto ni credenciales", () => {
    const { rows } = auditDiff({ contact_phone: "600111222", town: "A" }, { contact_phone: "600999888", town: "B" });
    expect(JSON.stringify(rows)).not.toContain("600");
    expect(rows.map((r) => r.key)).toEqual(["town", "(datos privados)"]);
  });

  it("recorta valores largos y limita el número de claves", () => {
    const long = "x".repeat(500);
    expect(shortValue(long)).toHaveLength(80);
    expect(shortValue(long).endsWith("…")).toBe(true);
    expect(shortValue({ a: 1 })).toBe('{"a":1}');
    expect(shortValue(null)).toBe("vacío");
    const after = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, i]));
    const d = auditDiff({}, after);
    expect(d.rows).toHaveLength(MAX_KEYS);
    expect(d.more).toBe(12 - MAX_KEYS);
  });

  it("valores que no son objetos se muestran enteros", () => {
    expect(auditDiff(3, 5).rows).toEqual([{ key: "valor", before: "3", after: "5" }]);
  });
});

describe("admin usuarios: bloqueo de acceso", () => {
  const now = Date.parse("2026-10-23T10:00:00Z");
  it("distingue sin bloqueo, temporal, indefinido y caducado", () => {
    expect(banState(null, now)).toEqual({ blocked: false, forever: false });
    expect(banState("2026-10-24T10:00:00Z", now)).toEqual({ blocked: true, forever: false });
    expect(banState("2126-10-01T10:00:00Z", now)).toEqual({ blocked: true, forever: true });
    expect(banState("2026-10-22T10:00:00Z", now)).toEqual({ blocked: false, forever: false });
    expect(banState("no es fecha", now)).toEqual({ blocked: false, forever: false });
  });
});
