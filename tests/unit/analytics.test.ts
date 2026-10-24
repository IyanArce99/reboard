import { describe, expect, it } from "vitest";
import { UNTRACKED_PATHS, cleanProps, countBand, priceBand, sanitizeReferrer, sanitizeUrl } from "@/lib/analytics/events";

describe("analítica: nada personal sale de la web", () => {
  it("URL: solo origen, ruta y UTM (fuera ids, «editar», «siguiente», filtros y gclid)", () => {
    expect(sanitizeUrl("https://www.reboard.es/vender/publicar?editar=a123")).toBe("https://www.reboard.es/vender/publicar");
    expect(sanitizeUrl("https://www.reboard.es/entrar?siguiente=%2Fpanel&email=a%40b.es")).toBe("https://www.reboard.es/entrar");
    expect(sanitizeUrl("https://www.reboard.es/buscar?zona=tenerife&litros-min=40&gclid=XYZ")).toBe("https://www.reboard.es/buscar");
    expect(sanitizeUrl("https://www.reboard.es/?utm_source=instagram&utm_medium=bio&utm_campaign=lanzamiento&fbclid=abc")).toBe(
      "https://www.reboard.es/?utm_source=instagram&utm_medium=bio&utm_campaign=lanzamiento",
    );
    expect(sanitizeUrl("no es una url")).toBeUndefined();
  });

  it("referente: solo el dominio", () => {
    expect(sanitizeReferrer("https://www.google.com/search?q=tabla+surf+gran+canaria")).toBe("https://www.google.com");
    expect(sanitizeReferrer("https://l.instagram.com/?u=https%3A%2F%2Fwww.reboard.es&e=AT0")).toBe("https://l.instagram.com");
    expect(sanitizeReferrer("$direct")).toBe("$direct");
  });

  it("propiedades: fuera claves sensibles aunque se añadan por error; textos y listas acotados", () => {
    const out = cleanProps({
      shape: "evolutiva",
      email: "a@b.es",
      phone: "+34600000000",
      seller_name: "Daniel",
      town: "Telde",
      weight: 75,
      level: "iniciacion",
      query: "tabla barata",
      listing_id: "a123",
      photos: 3,
      available: true,
      shapes: ["fish", "evolutiva"],
      island: null,
      nested: { x: 1 },
    });
    expect(out).toEqual({ shape: "evolutiva", photos: 3, available: true, shapes: ["fish", "evolutiva"], island: null });
    // Claves legítimas que terminan como una prohibida («context», «has_volume») sí salen.
    expect(cleanProps({ context: "publicar", has_volume: true, user_ip: "1.2.3.4" })).toEqual({ context: "publicar", has_volume: true });
  });

  it("tramos de precio y de recuento", () => {
    expect([99, 100, 250, 499, 500, 1200].map(priceBand)).toEqual(["<100", "100-199", "200-299", "300-499", "500+", "500+"]);
    expect([0, 3, 12, 40, 300].map(countBand)).toEqual(["0", "1-5", "6-20", "21-50", "50+"]);
  });

  it("rutas privadas que no se miden", () => {
    for (const p of ["/admin", "/admin/usuarios", "/moderacion", "/cuenta", "/panel", "/auth/confirm"]) expect(UNTRACKED_PATHS.test(p)).toBe(true);
    for (const p of ["/", "/buscar", "/anuncio/x-a1", "/vender/publicar", "/comparar", "/calculadora-litros", "/entrar"]) expect(UNTRACKED_PATHS.test(p)).toBe(false);
  });
});
