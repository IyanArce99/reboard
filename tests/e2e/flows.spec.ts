// Recorridos clave que no deben romperse: buscador, calculadora de litros, comparador y ficha.
import { expect, test, type Page } from "@playwright/test";

const STATE_KEY = "rb-usuario-v1";

/** Falla el test si hay errores de JavaScript o de hidratación en la página. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

const count = (page: Page) => page.getByText(/tablas? coincide/).first();

test("buscador: filtrar por forma y litros, y quitar un filtro", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/buscar");
  await expect(count(page)).toHaveText("100 tablas coinciden");

  await page.getByRole("button", { name: /^Fish · / }).click();
  await page.waitForURL(/forma=fish/);
  await expect(count(page)).toHaveText("13 tablas coinciden");

  await page.getByLabel("Litros mínimos").fill("35");
  await page.waitForURL(/litros-min=35/);
  await expect(count(page)).toHaveText("9 tablas coinciden");
  await expect(page.getByLabel("Litros mínimos")).toHaveValue("35");

  await page.getByRole("link", { name: /Quitar filtro Fish/ }).click();
  await page.waitForURL((u) => !u.search.includes("forma=fish"));
  await expect(count(page)).toHaveText("59 tablas coinciden");
  expect(errors).toEqual([]);
});

test("buscador: estado vacío con sugerencias", async ({ page }) => {
  await page.goto("/buscar?forma=longboard&zona=lanzarote&precio-max=150");
  await expect(page.getByRole("heading", { name: "No encontramos tablas con estos filtros" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quitar todos los filtros \(100\)/ })).toBeVisible();
});

test("home: la hoja de búsqueda actualiza el recuento", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Buscar 27 tablas" })).toBeVisible();
  await page.getByRole("button", { name: /Litros/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "45–60 L" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Buscar 8 tablas" })).toHaveAttribute(
    "href",
    "/buscar?zona=gran-canaria&litros-min=45&litros-max=60",
  );
});

test("calculadora de litros: recorrido completo y perfil guardado", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/calculadora-litros");
  await page.locator('input[inputmode="numeric"]').first().fill("75");
  for (let i = 0; i < 9; i++) {
    const opt = page.locator('[role="radio"], [role="checkbox"]').first();
    if (await opt.isVisible().catch(() => false)) await opt.click();
    const next = page.getByRole("button", { name: /Continuar|Ver mi recomendación|Siguiente/ }).last();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
  }
  await expect(page.getByText("74–92 L").first()).toBeVisible();
  const profile = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").profile, STATE_KEY);
  expect(profile).toMatchObject({ lo: 74, hi: 92, weight: 75 });

  await page.goto("/buscar");
  await expect(page.getByRole("button", { name: /Solo tablas para mí/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("comparador: dos tablas con diferencias y la más barata", async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(
    ([k, v]) => localStorage.setItem(k, v),
    [STATE_KEY, JSON.stringify({ saved: [], compare: [{ id: "a1040", label: "Torq 7'2" }, { id: "a1047", label: "Softech 7'0" }], alerts: [], profile: null })],
  );
  await page.goto("/comparar");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.getByText(/la más barata/)).toBeVisible();
  await expect(table.getByText(`Torq Fun TET 7'2"`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("ficha: contacto y anuncio vendido", async ({ page }) => {
  await page.goto("/anuncio/torq-fun-tet-7-2-gran-canaria-a1040");
  await page.getByRole("button", { name: "Contactar por WhatsApp" }).click();
  await expect(page.getByRole("dialog", { name: /Contactar con Daniel/ })).toBeVisible();

  await page.goto("/anuncio/x-a1096");
  await expect(page.getByText("Esta tabla ya se ha vendido")).toBeVisible();
  await expect(page.getByRole("button", { name: "No disponible" }).first()).toBeDisabled();
});

test("sin errores de hidratación con estado guardado", async ({ page }) => {
  await page.addInitScript(
    ([k, v]) => localStorage.setItem(k, v),
    [STATE_KEY, JSON.stringify({ saved: ["a1040"], compare: [{ id: "a1040", label: "Torq 7'2" }], alerts: [], profile: { lo: 45, hi: 60, level: "Iniciación", weight: 75 } })],
  );
  for (const url of ["/", "/buscar", "/tablas/evolutiva", "/anuncio/torq-fun-tet-7-2-gran-canaria-a1040", "/calculadora-litros", "/guardado", "/marcas/torq/fun-tet"]) {
    const errors = trackErrors(page);
    await page.goto(url, { waitUntil: "networkidle" });
    expect(errors, url).toEqual([]);
    page.removeAllListeners("pageerror");
    page.removeAllListeners("console");
  }
});
