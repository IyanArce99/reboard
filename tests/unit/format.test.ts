import { describe, expect, it } from "vitest";
import { ago, daysBetween, eur, fmtIn, ftLabel, inToCm } from "@/lib/domain/format";

describe("format", () => {
  it("eur usa el formato es-ES", () => {
    expect(eur(190)).toBe("190 €");
    expect(eur(12500)).toBe("12.500 €");
  });

  it("fmtIn redondea a octavos", () => {
    expect(fmtIn(21.5)).toBe('21 1/2"');
    expect(fmtIn(2.875)).toBe('2 7/8"');
    expect(fmtIn(19.25)).toBe('19 1/4"');
    expect(fmtIn(22)).toBe('22"');
    expect(fmtIn(2.98)).toBe('3"');
  });

  it("ftLabel convierte pulgadas a pies", () => {
    expect(ftLabel(86)).toBe(`7'2"`);
    expect(ftLabel(108)).toBe(`9'0"`);
  });

  it("inToCm redondea a cm", () => {
    expect(inToCm(86)).toBe(218);
  });

  it("ago y daysBetween", () => {
    const now = new Date("2026-10-22T10:00:00Z");
    expect(daysBetween("2026-10-22T09:00:00Z", now)).toBe(0);
    expect(daysBetween("2026-10-20T10:00:00Z", now)).toBe(2);
    expect(daysBetween("2026-10-30T10:00:00Z", now)).toBe(0); // nunca negativo
    expect(ago(0)).toBe("hoy");
    expect(ago(1)).toBe("ayer");
    expect(ago(5)).toBe("hace 5 días");
  });
});
