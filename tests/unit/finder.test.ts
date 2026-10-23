import { describe, expect, it } from "vitest";
import {
  BUDGETS,
  compatible,
  finderZone,
  resultFilters,
  typeFilters,
  widenOptions,
} from "@/lib/finder/listings";
import {
  FACTORS,
  FREQS,
  GOALS,
  K_MAX,
  K_MIN,
  LEVELS,
  MIN_SPAN,
  NO_BOARD,
  VOL_MAX,
  VOL_MIN,
  WAVES,
  WEIGHT_MAX,
  WEIGHT_MIN,
  adjustment,
  exampleRows,
  initialFinderState,
  isValidWeight,
  recommend,
  type FinderState,
  type GoalKey,
  type LevelKey,
  type Recommendation,
} from "@/lib/finder/recommend";
import { summaryOf } from "@/lib/finder/summary";
import { parseFilters, searchHref, toQuery } from "@/lib/search/filters";
import { buildDemoInventory } from "../fixtures/demo-inventory";

const state = (p: Partial<FinderState>): FinderState => ({ ...initialFinderState(), ...p });
const rec = (p: Partial<FinderState>) => recommend(state(p));
const range = (p: Partial<FinderState>) => {
  const r = rec(p)!;
  return [r.lo, r.hi];
};

describe("isValidWeight", () => {
  it("acepta solo enteros entre los límites", () => {
    expect(isValidWeight(String(WEIGHT_MIN))).toBe(true);
    expect(isValidWeight(String(WEIGHT_MAX))).toBe(true);
    expect(isValidWeight(String(WEIGHT_MIN - 1))).toBe(false);
    expect(isValidWeight(String(WEIGHT_MAX + 1))).toBe(false);
  });

  it("rechaza vacío, decimales, notación científica, espacios y texto", () => {
    for (const w of ["", " ", "75.5", "75,5", "1e2", " 75", "0x4b", "abc", "NaN", "-75", "1000"]) {
      expect(isValidWeight(w), w).toBe(false);
      expect(rec({ w, lvl: "learn" }), w).toBeNull();
    }
  });
});

describe("adjustment (k)", () => {
  it("vale 1 sin respuestas opcionales o con «No lo sé»", () => {
    expect(adjustment({ freq: null, waves: null, goals: [] })).toBe(1);
    expect(adjustment({ freq: "mid", waves: "unsure", goals: ["calm"] })).toBe(1);
  });

  it("se limita a [K_MIN, K_MAX] en las combinaciones extremas", () => {
    // Sin límite: 0,95 × 0,92 × 0,94 × 0,97 ≈ 0,797 y 1,08 × 1,05 × 1,03 × 1,04 ≈ 1,215.
    expect(adjustment({ freq: "high", waves: "big", goals: ["manio", "turns"] })).toBe(K_MIN);
    expect(adjustment({ freq: "low", waves: "small", goals: ["learn", "soft", "small"] })).toBe(K_MAX);
  });

  it("«aprender» y «dejar la softboard» no se acumulan", () => {
    expect(adjustment({ freq: null, waves: null, goals: ["learn", "soft"] })).toBeCloseTo(1.03);
  });
});

describe("recommend: fórmula", () => {
  it("rango de referencia = peso × factor del nivel", () => {
    expect(range({ w: "75", lvl: "learn" })).toEqual([64, 79]);
    expect(range({ w: "75", lvl: "ride" })).toEqual([45, 59]);
    expect(range({ w: "75", lvl: "turn" })).toEqual([35, 44]);
    expect(range({ w: "75", lvl: "pro" })).toEqual([27, 33]);
  });

  it("los factores caen dentro de reglas orientativas habituales (≈0,8–1,0+ / ≈0,55–0,7 / ≈0,38–0,45 L/kg)", () => {
    expect(FACTORS.learn[0]).toBeGreaterThanOrEqual(0.8);
    expect(FACTORS.pro[1]).toBeLessThanOrEqual(0.45);
    // Cada nivel pide menos volumen que el anterior.
    const order: LevelKey[] = ["learn", "ride", "turn", "pro"];
    for (let i = 1; i < order.length; i++) {
      expect(FACTORS[order[i]][0]).toBeLessThan(FACTORS[order[i - 1]][0]);
      expect(FACTORS[order[i]][1]).toBeLessThan(FACTORS[order[i - 1]][1]);
    }
  });

  it("la combinación más ajustada ya no baja de ≈0,32 L/kg", () => {
    const r = rec({ w: "75", lvl: "pro", freq: "high", waves: "big", goals: ["manio", "turns"] })!;
    expect([r.lo, r.hi]).toEqual([24, 30]);
  });

  it("ajusta por frecuencia y olas", () => {
    const [lo] = range({ w: "75", lvl: "ride" });
    expect(range({ w: "75", lvl: "ride", freq: "low" })[0]).toBeGreaterThan(lo);
    expect(range({ w: "75", lvl: "ride", waves: "big" })[0]).toBeLessThan(lo);
  });

  it("devuelve el nombre corto del nivel y el peso", () => {
    const r = rec({ w: "60", lvl: "turn" })!;
    expect(r.levelName).toBe("Intermedio");
    expect(r.weight).toBe(60);
    expect(r.note).toBe("");
  });
});

describe("recommend: tabla actual (−20 %)", () => {
  const base = { w: "75", lvl: "turn" as const };

  it("no baja más de un 20 % respecto a la tabla actual", () => {
    const r = rec({ ...base, cur: "Shortboard", curVol: "60" })!;
    expect(r.lo).toBe(48);
    expect(r.hi).toBeGreaterThanOrEqual(r.lo + MIN_SPAN);
    expect(r.note).toContain("60 L");
  });

  it("si el tope supera el rango, hi se reajusta y nunca queda por debajo de lo", () => {
    const r = rec({ w: "60", lvl: "turn", cur: "Longboard", curVol: "90" })!;
    expect([r.lo, r.hi]).toEqual([72, 76]);
  });

  it("acepta decimales con coma y los muestra en formato español", () => {
    const r = rec({ ...base, cur: "Evolutiva", curVol: "60,5" })!;
    expect(r.lo).toBe(48);
    expect(r.note).toContain("60,5 L");
  });

  it("ignora los litros sin tabla elegida, con «No tengo tabla» o fuera de rango", () => {
    const ref = range(base);
    expect(range({ ...base, cur: null, curVol: "60" })).toEqual(ref);
    expect(range({ ...base, cur: NO_BOARD, curVol: "60" })).toEqual(ref);
    for (const curVol of ["999", "5", ",", "1.2.3", "abc", ""]) {
      expect(range({ ...base, cur: "Otra", curVol }), curVol).toEqual(ref);
    }
  });

  it("no aplica al nivel avanzado", () => {
    expect(range({ w: "75", lvl: "pro", cur: "Midlength", curVol: "50" })).toEqual(range({ w: "75", lvl: "pro" }));
  });
});

describe("recommend: límites y casos extremos", () => {
  it("40 kg avanzado: suelo de 15 L y anchura mínima", () => {
    const r = rec({ w: "40", lvl: "pro", freq: "high", waves: "big" })!;
    expect(r.lo).toBe(VOL_MIN);
    expect(r.hi).toBe(VOL_MIN + MIN_SPAN);
  });

  it("130 kg aprendiendo con todos los ajustes al alza: techo de 120 L y aviso", () => {
    const r = rec({ w: "130", lvl: "learn", freq: "low", waves: "small", goals: ["learn", "small"] })!;
    expect([r.lo, r.hi]).toEqual([VOL_MAX - MIN_SPAN, VOL_MAX]);
    expect(r.note).toContain("120 L");
  });

  it("sin techo no hay aviso", () => {
    expect(rec({ w: "100", lvl: "learn" })!.note).toBe("");
  });

  it("todas las combinaciones dan un rango entero, ordenado y acotado", () => {
    const freqs = [null, ...FREQS.map((f) => f[0])];
    const waves = [null, ...WAVES.map((w) => w[0])];
    const goalSets: GoalKey[][] = [[], GOALS.map((g) => g[0]), ["manio", "turns"], ["learn", "soft", "small"]];
    const curVols = ["", "20", "60", "150"];
    let n = 0;
    for (let w = WEIGHT_MIN; w <= WEIGHT_MAX; w += 5)
      for (const [lvl] of LEVELS)
        for (const freq of freqs)
          for (const wv of waves)
            for (const goals of goalSets)
              for (const curVol of curVols) {
                const r = rec({ w: String(w), lvl, freq, waves: wv, goals, cur: "Otra", curVol })!;
                const ok =
                  Number.isInteger(r.lo) &&
                  Number.isInteger(r.hi) &&
                  r.lo >= VOL_MIN &&
                  r.hi <= VOL_MAX &&
                  r.hi - r.lo >= MIN_SPAN &&
                  r.types.length >= 1 &&
                  r.types.length <= 3;
                if (!ok) throw new Error(`Rango no válido: ${JSON.stringify({ w, lvl, freq, wv, goals, curVol, r })}`);
                n++;
              }
    expect(n).toBeGreaterThan(10000);
  });

  it("olas potentes no proponen longboard ni softboard", () => {
    const r = rec({ w: "75", lvl: "learn", waves: "big", goals: ["calm"] })!;
    expect(r.types).not.toContain("longboard");
    expect(r.types).not.toContain("softboard");
    expect(r.types.length).toBeGreaterThan(0);
  });
});

describe("exampleRows (contenido SEO)", () => {
  it("se calcula con la misma fórmula", () => {
    const rows = exampleRows();
    expect(rows[0]).toEqual({ label: "60 kg · estoy aprendiendo", range: "51–63 L" });
    expect(rows).toHaveLength(5);
  });
});

describe("summaryOf («Tu perfil hasta ahora»)", () => {
  it("sin respuestas, no hay filas", () => {
    expect(summaryOf(initialFinderState())).toEqual([]);
  });

  it("solo lista lo contestado, sin «—» ni «Sin indicar»", () => {
    const s = summaryOf(state({ w: "75", lvl: "ride", waves: "small" }));
    expect(s.map((x) => x.step)).toEqual([1, 2, 5]);
    expect(s.map((x) => x.value).join(" ")).not.toMatch(/—|Sin indicar/);
    expect(s[0].value).toBe("75 kg");
  });

  it("un peso a medio escribir o fuera de rango no aparece", () => {
    expect(summaryOf(state({ w: "7" }))).toEqual([]);
  });

  it("la zona sale si se ha elegido, o siempre en el resultado", () => {
    expect(summaryOf(state({ w: "75" })).some((x) => x.step === 7)).toBe(false);
    expect(summaryOf(state({ w: "75" }), true).find((x) => x.step === 7)?.value).toBe("Toda España");
    expect(summaryOf(state({ budget: "250" })).find((x) => x.step === 7)?.value).toBe("Toda España · hasta 250 €");
  });
});

describe("enlaces del resultado a /buscar", () => {
  const r = rec({ w: "75", lvl: "ride" })!;

  it("llevan litros, forma, zona y presupuesto que /buscar sabe leer", () => {
    const f = resultFilters(r, "gran-canaria", 250);
    const q = new URLSearchParams(toQuery(f));
    expect(q.get("litros-min")).toBe(String(r.lo));
    expect(q.get("litros-max")).toBe(String(r.hi));
    expect(q.get("forma")).toBe(r.types.join(","));
    expect(q.get("zona")).toBe("gran-canaria");
    expect(q.get("precio-max")).toBe("250");
    expect(parseFilters(Object.fromEntries(q))).toEqual(f);
    expect(searchHref(f).startsWith("/buscar?")).toBe(true);
  });

  it("sin zona ni presupuesto, no añade parámetros vacíos", () => {
    const q = new URLSearchParams(toQuery(resultFilters(r, "", null)));
    expect(q.has("zona")).toBe(false);
    expect(q.has("precio-max")).toBe(false);
  });

  it("la softboard se filtra como construcción", () => {
    const learnBig: Recommendation = { ...r, types: ["softboard"] };
    const q = new URLSearchParams(toQuery(resultFilters(learnBig, "", null)));
    expect(q.get("construccion")).toBe("softboard");
    expect(q.has("forma")).toBe(false);
    const t = new URLSearchParams(toQuery(typeFilters(r, "canarias", 150, "softboard")));
    expect(t.get("construccion")).toBe("softboard");
    expect(t.get("zona")).toBe("canarias");
    expect(t.get("precio-max")).toBe("150");
  });

  it("las tarjetas de tipo conservan el presupuesto", () => {
    const f = typeFilters(r, "", 400, "fish");
    expect(f.shapes).toEqual(["fish"]);
    expect(f.priceMax).toBe(400);
    expect(parseFilters(Object.fromEntries(new URLSearchParams(toQuery(f))))).toEqual(f);
  });

  it("zona del paso 7: región, zona y «Otras zonas»", () => {
    expect(finderZone({ zone: "canarias", otherZone: "" })).toBe("canarias");
    expect(finderZone({ zone: "other", otherZone: "asturias" })).toBe("asturias");
    expect(finderZone({ zone: "other", otherZone: "no-existe" })).toBe("");
    expect(finderZone({ zone: "inventada", otherZone: "" })).toBe("");
  });

  it("los presupuestos rápidos son números o vacío", () => {
    for (const [v] of BUDGETS) expect(v === "" || Number.isFinite(Number(v))).toBe(true);
  });
});

describe("widenOptions (estado vacío)", () => {
  const r = rec({ w: "75", lvl: "ride" })!;

  it("sin inventario no ofrece contadores a cero", () => {
    expect(widenOptions([], r, "gran-canaria", 250)).toEqual([]);
  });

  it("solo ofrece las ampliaciones que encuentran algo", () => {
    const pool = buildDemoInventory(200).filter((l) => l.volume.value != null && l.shape !== "gun");
    const l = pool[0];
    const near: Recommendation = { ...r, lo: l.volume.value! - 1, hi: l.volume.value! + 1, types: [l.shape as Exclude<typeof l.shape, "gun">] };
    const other = pool.find((x) => x.zone !== l.zone)!.zone;
    // En otra zona y con presupuesto bajo no hay compatibles; ampliando a toda España, sí.
    expect(compatible([l], near, other, null)).toHaveLength(0);
    const opts = widenOptions([l], near, other, null);
    expect(opts.map((o) => o.key)).toContain("zone");
    expect(opts.every((o) => o.count > 0)).toBe(true);
    expect(opts.map((o) => o.label).join(" ")).not.toMatch(/\(0\)/);
    // Presupuesto: subir 100 € solo se ofrece si alcanza el precio.
    const cheap = widenOptions([l], near, "", Math.max(0, l.price - 50));
    expect(cheap.find((o) => o.key === "budget")?.budget).toBe(Math.max(0, l.price - 50) + 100);
    expect(widenOptions([l], near, "", Math.max(0, l.price - 500)).some((o) => o.key === "budget")).toBe(false);
  });
});
