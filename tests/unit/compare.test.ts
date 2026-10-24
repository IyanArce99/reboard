// Comparador: selección guardada, filas agrupadas, rango de TablaFinder y «Diferencias principales».
import { describe, expect, it } from "vitest";
import {
  MAX_COMPARE,
  compareGroups,
  compareItemOf,
  compareSummary,
  fitOf,
  fitText,
  joinLetters,
  sanitizeCompare,
} from "@/lib/compare/compare";
import type { Listing } from "@/lib/domain/types";
import { DEMO_REFERENCE_DATE, buildDemoInventory } from "../fixtures/demo-inventory";

const now = DEMO_REFERENCE_DATE;
const base = buildDemoInventory(100).find((l) => l.status === "disponible" && l.volume.value != null && l.length.value != null)!;

/** Tabla de prueba a partir de una real, cambiando solo lo necesario. */
function board(p: Partial<Listing> & { vol?: number | null; len?: number | null }): Listing {
  const { vol, len, ...rest } = p;
  return {
    ...base,
    repairs: null,
    ...rest,
    volume: vol === undefined ? base.volume : { value: vol, source: vol == null ? null : "seller" },
    length: len === undefined ? base.length : { value: len, source: len == null ? null : "seller" },
  };
}

describe("selección guardada (localStorage)", () => {
  it("descarta ids antiguos o mal formados, duplicados y lo que no es un objeto", () => {
    const raw = [
      { id: "a100001", label: "Torq 7'2\"", photo: "https://x.supabase.co/a.webp", shape: "evolutiva" },
      { id: "a100001", label: "duplicada" },
      { id: "1040", label: "id antiguo sin a" },
      { id: "a1;drop", label: "manipulada" },
      "basura",
      null,
      { id: "a100002" },
      { id: "a100003", label: "Foto rara", photo: "javascript:alert(1)", shape: "patinete" },
    ];
    expect(sanitizeCompare(raw)).toEqual([
      { id: "a100001", label: "Torq 7'2\"", photo: "https://x.supabase.co/a.webp", shape: "evolutiva" },
      { id: "a100002", label: "Tabla", photo: null, shape: undefined },
      { id: "a100003", label: "Foto rara", photo: null, shape: undefined },
    ]);
  });

  it("nunca más de 4, y cualquier cosa que no sea una lista se queda vacía", () => {
    expect(sanitizeCompare(Array.from({ length: 9 }, (_, i) => ({ id: `a10000${i}`, label: "x" })))).toHaveLength(MAX_COMPARE);
    expect(sanitizeCompare(undefined)).toEqual([]);
    expect(sanitizeCompare({ id: "a1" })).toEqual([]);
  });

  it("el elemento guardado lleva etiqueta corta, miniatura y silueta", () => {
    const item = compareItemOf(base);
    expect(item).toMatchObject({ id: base.id, shape: base.shape });
    expect(item.label).toContain(base.sizeLabel);
  });
});

describe("rango de TablaFinder", () => {
  const p = { lo: 35, hi: 42 };
  it("dentro, por debajo, por encima y sin litros (sin porcentajes)", () => {
    expect(fitOf(38, p)).toEqual({ state: "in", delta: 0 });
    expect(fitOf(35, p).state).toBe("in");
    expect(fitOf(32, p)).toEqual({ state: "below", delta: 3 });
    expect(fitOf(45.5, p)).toEqual({ state: "above", delta: 3.5 });
    expect(fitOf(null, p).state).toBe("unknown");
    expect(fitText(32, p)).toBe("Por debajo de tu rango (−3 L)");
    expect(fitText(45.5, p)).toBe("Por encima de tu rango (+3,5 L)");
    expect(fitText(null, p)).toBe("Sin litros indicados");
  });
});

describe("filas agrupadas", () => {
  const a = board({ id: "a1", price: 190, vol: 47 });
  const b = board({ id: "a2", price: 260, vol: null, repairs: "Golpe en la cola" });

  it("4 grupos; «Tu rango de litros» solo con perfil", () => {
    const g = compareGroups([a, b], { now, profile: null });
    expect(g.map((x) => x.title)).toEqual(["Precio y ubicación", "Medidas y volumen", "Forma y construcción", "Estado y accesorios"]);
    expect(g.flatMap((x) => x.rows).some((r) => r.key === "rango")).toBe(false);
    const withProfile = compareGroups([a, b], { now, profile: { lo: 40, hi: 50 } });
    const rango = withProfile.flatMap((x) => x.rows).find((r) => r.key === "rango")!;
    expect(rango.cells.map((c) => c.text)).toEqual(["Dentro de tu rango", "Sin litros indicados"]);
  });

  it("marca lo que cambia, «la más barata» como dato y nunca inventa: «Sin indicar»", () => {
    const rows = compareGroups([a, b], { now, profile: null }).flatMap((x) => x.rows);
    const by = (k: string) => rows.find((r) => r.key === k)!;
    expect(by("precio").diff).toBe(true);
    expect(by("precio").cells[0]).toEqual({ text: "190 € · la más barata", tone: "good" });
    expect(by("precio").cells[1].tone).toBe("default");
    expect(by("litros").cells[1]).toEqual({ text: "Sin indicar", tone: "missing" });
    expect(by("reparaciones").cells.map((c) => c.text)).toEqual(["Ninguna indicada", "Declara reparaciones"]);
    expect(by("tipo").diff).toBe(false);
  });

  it("con el mismo precio no hay «más barata»", () => {
    const rows = compareGroups([board({ id: "a1", price: 200 }), board({ id: "a2", price: 200 })], { now, profile: null }).flatMap((x) => x.rows);
    const precio = rows.find((r) => r.key === "precio")!;
    expect(precio.diff).toBe(false);
    expect(precio.cells.every((c) => !c.text.includes("barata"))).toBe(true);
  });
});

describe("«Diferencias principales» (deterministas y prudentes)", () => {
  it("dos tablas: precio, litros, longitud, reparaciones y misma isla", () => {
    const a = board({ id: "a1", price: 180, vol: 38, len: 84, zone: "gran-canaria" });
    const b = board({ id: "a2", price: 260, vol: 44, len: 86, zone: "gran-canaria", repairs: "Golpe reparado" });
    const t = compareSummary([a, b], now).map((s) => s.text);
    expect(t).toContain("La A cuesta 80 € menos que la B.");
    expect(t).toContain("La B tiene 6 L más que la A (44 L frente a 38 L).");
    expect(t.some((x) => x.startsWith("La B es 5 cm más larga que la A"))).toBe(true);
    expect(t).toContain("La B declara reparaciones; la A no indica ninguna.");
    expect(t).toContain("Las dos están en Gran Canaria.");
    // Nada de «mejor», «recomendada» ni «perfecta».
    expect(t.join(" ")).not.toMatch(/mejor|recomend|perfect/i);
  });

  it("sin litros no se afirma nada sobre el volumen", () => {
    const t = compareSummary([board({ id: "a1", vol: 40 }), board({ id: "a2", vol: null })], now).map((s) => s.text);
    expect(t.some((x) => x.includes("L más"))).toBe(false);
    expect(t).toContain("La B no indica los litros: no se pueden comparar en volumen.");
  });

  it("cuatro tablas: rango de precios con las más baratas empatadas e islas distintas", () => {
    const ls = [
      board({ id: "a1", price: 150, zone: "tenerife" }),
      board({ id: "a2", price: 150, zone: "gran-canaria" }),
      board({ id: "a3", price: 300, zone: "tenerife" }),
      board({ id: "a4", price: 440, zone: "lanzarote" }),
    ];
    const t = compareSummary(ls, now).map((s) => s.text);
    expect(t[0]).toBe("Las más baratas son la A y B (150 €); la más cara, la D (440 €): 290 € de diferencia.");
    expect(t).toContain("En islas distintas: A y C en Tenerife; B en Gran Canaria; D en Lanzarote.");
  });

  it("tipos y construcción solo si cambian, agrupados por valor", () => {
    const ls = [
      board({ id: "a1", shape: "evolutiva", construction: "epoxy" }),
      board({ id: "a2", shape: "evolutiva", construction: "pu" }),
      board({ id: "a3", shape: "fish", construction: "epoxy" }),
    ];
    const t = compareSummary(ls, now).map((s) => s.text);
    expect(t).toContain("Tipos distintos: evolutiva (A y B) y fish (C).");
    expect(t).toContain("Construcción distinta: epoxy (A y C) y PU (B).");
    const same = compareSummary([board({ id: "a1" }), board({ id: "a2" })], now).map((s) => s.key);
    expect(same).not.toContain("tipo");
    expect(same).not.toContain("construccion");
  });

  it("avisa si una ya no se puede contactar (vendida)", () => {
    const t = compareSummary([board({ id: "a1" }), board({ id: "a2", status: "vendida" })], now).map((s) => s.text);
    expect(t).toContain("La B está vendida: ya no se puede contactar.");
  });

  it("mismo resultado para los mismos datos, y nada con una sola tabla", () => {
    const ls = [board({ id: "a1", price: 100 }), board({ id: "a2", price: 120 })];
    expect(compareSummary(ls, now)).toEqual(compareSummary(ls, now));
    expect(compareSummary([ls[0]], now)).toEqual([]);
  });

  it("une letras en castellano", () => {
    expect(joinLetters(["A"])).toBe("A");
    expect(joinLetters(["A", "B"])).toBe("A y B");
    expect(joinLetters(["A", "B", "C"])).toBe("A, B y C");
  });
});
