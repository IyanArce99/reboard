import { describe, expect, it } from "vitest";
import { describeMeasure, fieldToInches, parseInches, parseLitres, parseMeasures, readMeasure } from "@/lib/publish/parse";

// Medidas escritas como las escribe la gente (24-10-2026): comas, puntos, comillas del móvil,
// fracciones «½», «cm» escrito con «pies» elegido…

describe("parseInches", () => {
  it.each([
    ['21 1/2"', 21.5],
    ["21 1/2", 21.5],
    ["21-1/2", 21.5],
    ["21 y 1/2", 21.5],
    ["21½", 21.5],
    ["21 ½”", 21.5],
    ["21⁄2", null],
    ["2⅞", 2.875],
    ["2 7/8''", 2.875],
    ["21,5", 21.5],
    ["21.5 in", 21.5],
    ["21,5 pulgadas", 21.5],
    ["3/4", 0.75],
    ["21 3/2", null],
    ["abc", null],
    ["", null],
  ])("«%s» → %s", (text, inches) => {
    expect(parseInches(text)).toBe(inches);
  });
});

describe("readMeasure: la unidad escrita manda; si el número solo cuadra en la otra, se usa la otra", () => {
  it.each([
    // [campo, texto, unidad elegida, pulgadas, leído como]
    ["len", `6'4"`, "ft", 76, "ft"],
    ["len", "6.4", "ft", 76, "ft"],
    ["len", "193", "ft", 193 / 2.54, "cm"],
    ["len", "193 cm", "ft", 193 / 2.54, "cm"],
    ["len", "1,93 m", "ft", 193 / 2.54, "m"],
    ["len", "1,93", "cm", 193 / 2.54, "m"],
    ["len", "193", "cm", 193 / 2.54, "cm"],
    ["len", "6.4", "cm", 76, "ft"],
    ["len", `6'4`, "cm", 76, "ft"],
    ["len", `76"`, "ft", 76, "in"],
    ["len", `6'4 1/2"`, "ft", 76.5, "ft"],
    ["width", "20 1/2", "ft", 20.5, "in"],
    ["width", "20,5", "ft", 20.5, "in"],
    ["width", "52", "ft", 52 / 2.54, "cm"],
    ["width", "52", "cm", 52 / 2.54, "cm"],
    ["width", "20,5", "cm", 20.5, "in"],
    ["width", '20 1/2"', "cm", 20.5, "in"],
    ["thick", "2 5/8", "ft", 2.625, "in"],
    ["thick", "6,7", "ft", 6.7 / 2.54, "cm"],
    ["thick", "6,7", "cm", 6.7 / 2.54, "cm"],
    ["thick", "2,75", "cm", 2.75, "in"],
  ] as const)("%s «%s» (%s) → %d %s", (key, text, unit, inches, as) => {
    const r = readMeasure(key, text, unit);
    expect(r?.as).toBe(as);
    expect(r?.inches).toBeCloseTo(inches, 3);
  });

  it("no inventa cuando no se entiende", () => {
    expect(readMeasure("len", "seis pies", "ft")).toBeNull();
    expect(readMeasure("len", "80", "ft")).toBeNull(); // ¿80 pulgadas o 80 cm? Mejor preguntar.
    expect(fieldToInches("width", "", "ft")).toBeNull();
  });
});

describe("parseLitres", () => {
  it.each([
    ["34", 34],
    ["34,5", 34.5],
    ["34.5 L", 34.5],
    ["34 lts", 34],
    ["34 litros", 34],
    ["34l", 34],
    ["treinta", null],
  ])("«%s» → %s", (text, l) => {
    expect(parseLitres(text)).toBe(l);
  });
});

describe("describeMeasure: lo que se enseña bajo cada campo", () => {
  it("dice cómo se ha entendido", () => {
    expect(describeMeasure("len", "6.4", "ft")).toEqual({ ok: true, text: `6'4" · 193 cm` });
    expect(describeMeasure("width", "20½", "ft")?.text).toBe(`20 1/2" · 52,1 cm`);
    expect(describeMeasure("vol", "34,5", "ft")).toEqual({ ok: true, text: "34,5 litros" });
  });
  it("avisa cuando se lee en la otra unidad", () => {
    expect(describeMeasure("len", "193", "ft")).toEqual({ ok: true, text: `Lo hemos leído en cm: 6'4" · 193 cm` });
  });
  it("avisa de lo que no cuadra", () => {
    expect(describeMeasure("len", "3'", "ft")?.ok).toBe(false);
    expect(describeMeasure("width", "xx", "ft")?.text).toMatch(/No lo entendemos/);
    expect(describeMeasure("vol", "300", "ft")?.ok).toBe(false);
    expect(describeMeasure("len", "", "ft")).toBeNull();
  });
});

describe("parseMeasures (pegar las medidas tal cual)", () => {
  it.each([
    [`7'2 x 21 1/2 x 2 7/8 47L`, { len: `7'2"`, width: '21 1/2"', thick: '2 7/8"', vol: "47" }],
    [`6’4” × 20½” × 2⅝” — 34 L`, { len: `6'4"`, width: '20 1/2"', thick: '2 5/8"', vol: "34" }],
    [`6'4" x 20.5 x 2.6 34,5l`, { len: `6'4"`, width: '20 1/2"', thick: '2 5/8"', vol: "34,5" }],
    ["193 x 52 x 6,7 cm 34l", { len: `6'4"`, width: '20 1/2"', thick: '2 5/8"', vol: "34" }],
  ])("«%s»", (text, out) => {
    expect(parseMeasures(text)).toEqual(out);
  });
});
