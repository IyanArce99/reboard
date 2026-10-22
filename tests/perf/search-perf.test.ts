// Rendimiento de la capa de datos de Supabase (sin la caché de Next) con 100, 1.000 y 10.000
// anuncios DEMO en Supabase LOCAL. Mide latencia extremo a extremo (PostgREST + Postgres).
// Ejecutar: npm run perf:local (con `npm run db:start` antes). Deja la base local vacía al terminar.

import { afterAll, describe, expect, it } from "vitest";
import { supabaseRepository as db } from "@/lib/data/supabase-repository";
import { emptyFilters, withFilters, type Filters } from "@/lib/search/filters";
import { buildDemoInventory } from "@/mocks/demo-inventory";
import { clearDemo, loadDemo } from "../integration/demo-loader";
import { serviceClient } from "../integration/local-supabase";

const sb = serviceClient();
const RUNS = 15;

async function time(fn: () => Promise<unknown>) {
  const out: number[] = [];
  await fn(); // calentamiento
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now();
    await fn();
    out.push(performance.now() - t);
  }
  out.sort((a, b) => a - b);
  return { p50: out[Math.floor(RUNS / 2)], p95: out[Math.ceil(RUNS * 0.95) - 1] };
}

const COMPLEX: Filters = withFilters({ zone: "canarias", shapes: ["evolutiva", "midlength"], volMin: 45, volMax: 70, priceMax: 400 });
const results: string[] = [];

afterAll(async () => {
  await clearDemo(sb);
  console.log(
    "\n| Anuncios | Operación | p50 (ms) | p95 (ms) |\n|---:|---|---:|---:|\n" + results.join("\n") + "\n",
  );
});

describe("rendimiento local", () => {
  for (const n of [100, 1000, 10000]) {
    it(`${n} anuncios`, async () => {
      await clearDemo(sb);
      const inventory = buildDemoInventory(n);
      const t0 = performance.now();
      await loadDemo(sb, inventory);
      results.push(`| ${n.toLocaleString("es-ES")} | carga | ${Math.round(performance.now() - t0)} | — |`);
      const sample = (await db.search(emptyFilters(), { limit: 1 })).items[0];
      const ops: [string, () => Promise<unknown>][] = [
        ["búsqueda sin filtros (24)", () => db.search(emptyFilters(), { sort: "recientes", limit: 24 })],
        ["búsqueda compleja (24)", () => db.search(COMPLEX, { sort: "precio", limit: 24 })],
        ["búsqueda página 10", () => db.search(emptyFilters(), { sort: "precio", limit: 24, offset: 216 })],
        ["facetas sin filtros", () => db.facets(emptyFilters())],
        ["facetas con filtros", () => db.facets(COMPLEX)],
        ["recuento", () => db.count(COMPLEX)],
        ["ficha (byId)", () => db.byId(sample.id)],
        ["similares", () => db.similar(sample, 4)],
      ];
      for (const [name, fn] of ops) {
        const r = await time(fn);
        results.push(`| ${n.toLocaleString("es-ES")} | ${name} | ${r.p50.toFixed(1)} | ${r.p95.toFixed(1)} |`);
        // Umbral orientativo para una base local: avisa de regresiones graves.
        expect(r.p95, `${name} con ${n}`).toBeLessThan(1500);
      }
    }, 900_000);
  }
});
