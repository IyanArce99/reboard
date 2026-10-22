// Inventario de URLs con su código HTTP esperado. Si una tarea cambia una URL o un código,
// este test falla: hay que justificarlo en docs/DECISIONS.md.
import { expect, test } from "@playwright/test";

const OK = [
  "/",
  "/buscar",
  "/buscar?forma=evolutiva&zona=gran-canaria&litros-min=45&litros-max=60",
  "/tablas/evolutiva",
  "/tablas/softboard",
  "/tablas/principiantes",
  "/tablas/gran-canaria",
  "/tablas/canarias",
  "/tablas/gran-canaria/evolutiva",
  "/tablas/pais-vasco/principiantes",
  "/anuncio/torq-fun-tet-7-2-gran-canaria-a1040",
  "/calculadora-litros",
  "/comparar",
  "/guardado",
  "/alertas",
  "/vender",
  "/vender/publicar",
  "/vender/publicar?editar=a1040",
  "/panel",
  "/marcas/torq",
  "/marcas/torq/fun-tet",
  "/marcas/channel-islands/ci-mid",
  "/tiendas",
  "/tiendas/marea-boards",
  "/guias",
  "/creditos",
  "/guias/que-revisar-al-comprar-una-tabla-usada",
  "/guias/que-tabla-comprar-despues-de-una-softboard",
  "/sistema",
  "/robots.txt",
  "/sitemap.xml",
  "/api/tablas/recuento?zona=gran-canaria",
  "/api/tablas?litros-min=45&litros-max=60",
  "/api/anuncios?ids=a1040,a1096",
];

const NOT_FOUND = [
  "/no-existe",
  "/tablas/nope",
  "/tablas/gran-canaria/nope",
  "/tablas/evolutiva/gran-canaria",
  "/anuncio/x-a9999",
  "/anuncio/sin-id",
  "/marcas/nope",
  "/marcas/torq/nope",
  "/tiendas/nope",
  "/guias/nope",
];

test.describe("códigos HTTP", () => {
  for (const url of OK) {
    test(`200 ${url}`, async ({ request }) => {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });
  }

  for (const url of NOT_FOUND) {
    test(`404 ${url}`, async ({ request }) => {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status()).toBe(404);
    });
  }

  test("308 al slug canónico del anuncio", async ({ request }) => {
    const res = await request.get("/anuncio/slug-viejo-a1040", { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()["location"]).toMatch(/\/anuncio\/torq-fun-tet-7-2-gran-canaria-a1040$/);
  });
});

test.describe("SEO", () => {
  test("datos DEMO: noindex global y robots bloqueando todo", async ({ request, page }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \//);
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("canonical de /buscar apunta a la landing equivalente", async ({ page }) => {
    await page.goto("/buscar?forma=evolutiva&zona=gran-canaria");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/tablas\/gran-canaria\/evolutiva$/);
  });

  test("la ficha tiene JSON-LD Product y canonical propio", async ({ page }) => {
    await page.goto("/anuncio/torq-fun-tet-7-2-gran-canaria-a1040");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /a1040$/);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((t) => t.includes('"@type":"Product"'))).toBe(true);
  });
});
