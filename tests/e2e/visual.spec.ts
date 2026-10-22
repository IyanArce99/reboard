// Capturas de referencia de las pantallas clave (proyecto `visual`, solo local).
// Uso: `npm run test:visual` para comparar; `npm run test:visual -- --update-snapshots` tras un
// cambio visual aprobado. Las referencias dependen del sistema operativo (sufijo -win32, -linux…).
import { expect, test } from "@playwright/test";

const SCREENS: [string, string][] = [
  ["home", "/"],
  ["buscar", "/buscar?forma=evolutiva&zona=gran-canaria"],
  ["buscar-vacio", "/buscar?forma=longboard&zona=lanzarote&precio-max=150"],
  ["landing", "/tablas/gran-canaria/evolutiva"],
  ["ficha", "/anuncio/torq-fun-tet-7-2-gran-canaria-a1040"],
  ["ficha-vendida", "/anuncio/alba-a1096"],
  ["calculadora", "/calculadora-litros"],
  ["modelo", "/marcas/torq/fun-tet"],
];

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    for (const [name, url] of SCREENS) {
      test(name, async ({ page }) => {
        await page.goto(url, { waitUntil: "networkidle" });
        // Fotos remotas (Unsplash) y fuentes: esperar a que carguen para no comparar huecos.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
          await document.fonts.ready;
        });
        await page.waitForLoadState("networkidle");
        // Los elementos sticky (cabecera, panel de la ficha) se duplican al coser la captura de
        // página completa según el scroll: se fijan en su sitio para que la referencia sea estable.
        await page.evaluate(() => {
          for (const el of document.querySelectorAll<HTMLElement>("body *")) {
            if (getComputedStyle(el).position === "sticky") el.style.position = "static";
          }
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "sin scroll horizontal").toBe(0);
        await expect(page).toHaveScreenshot(`${name}-${viewport.name}.png`, { fullPage: true });
      });
    }
  });
}
