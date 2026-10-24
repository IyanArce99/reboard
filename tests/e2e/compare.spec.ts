// Comparador: descubrir, añadir, barra, /comparar, TablaFinder, casos especiales y móvil.
// Datos: inventario DEMO de Supabase local (npm run db:seed-demo), por slug (tests/e2e/demo-data.ts).
import { expect, test, type Page } from "@playwright/test";
import { STATE_KEY, demoListing, demoPublished, demoSold, state } from "./demo-data";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  return errors;
}

const tray = (page: Page) => page.getByRole("complementary", { name: "Comparación de tablas" });
const addButtons = (page: Page) => page.getByRole("button", { name: /^Comparar\s*:/ });
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").compare ?? [], STATE_KEY);

test("buscar → añadir dos → comparar → ver tabla → volver sin perder la selección", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/buscar");
  await expect(tray(page)).toHaveCount(0);

  await addButtons(page).first().click();
  await expect(tray(page)).toContainText("1 tabla");
  await expect(tray(page)).toContainText("Añade otra");
  await expect(page.getByRole("button", { name: /^Comparando\s*:/ })).toHaveCount(1);

  await addButtons(page).first().click();
  await expect(tray(page)).toContainText("2 tablas");
  await tray(page).getByRole("link", { name: /Comparar 2 tablas/ }).click();
  await expect(page).toHaveURL(/\/comparar$/);
  await expect(page.getByRole("heading", { level: 1, name: "Compara tablas de surf" })).toBeVisible();
  await expect(page.getByText(/2.*de 4 tablas/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diferencias principales" })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("rowheader", { name: /Precio/ })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: /Litros/ })).toBeVisible();

  await page.getByRole("link", { name: /^Ver tabla/ }).first().click();
  await expect(page).toHaveURL(/\/anuncio\//);
  // En la ficha (escritorio) se ve la barra y el acceso al comparador.
  await expect(tray(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/comparar$/);
  await expect(page.getByRole("table")).toBeVisible();
  expect(await stored(page)).toHaveLength(2);
  expect(errors).toEqual([]);
});

test("hasta 4; la quinta avisa; quitar desde la barra; vaciar; se conserva al recargar", async ({ page }) => {
  await page.goto("/buscar");
  for (let i = 0; i < 4; i++) await addButtons(page).first().click();
  await expect(tray(page)).toContainText("4 tablas");
  await addButtons(page).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Puedes comparar hasta 4 tablas" })).toBeVisible();
  expect(await stored(page)).toHaveLength(4);

  await page.reload();
  await expect(tray(page)).toContainText("4 tablas");

  const first = (await stored(page))[0] as { label: string };
  await tray(page).getByRole("button", { name: `Quitar ${first.label} de la comparación` }).click();
  await expect(tray(page)).toContainText("3 tablas");

  await tray(page).getByRole("button", { name: "Vaciar" }).click();
  await expect(tray(page)).toHaveCount(0);
  expect(await stored(page)).toEqual([]);
});

test("teclado: «Comparar» se activa con Enter y anuncia su estado", async ({ page }) => {
  await page.goto("/buscar");
  const btn = addButtons(page).first();
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Comparando\s*:/ }).first()).toHaveAttribute("aria-pressed", "true");
});

test("/comparar: TablaFinder, tabla vendida, anuncio eliminado e ids antiguos", async ({ page }) => {
  const errors = trackErrors(page);
  const torq = await demoListing("torq-fun-tet-7-2-gran-canaria"); // 47 L
  const sold = await demoSold();
  await page.addInitScript(
    ([k, v]) => localStorage.setItem(k, v),
    [
      STATE_KEY,
      state(
        [
          { id: torq.id, label: torq.label },
          { id: "a999999999", label: "Ya no existe" },
          { id: "1040", label: "Id del inventario antiguo" },
          { id: sold.id, label: sold.label },
        ],
        { lo: 45, hi: 55, level: "Iniciación", weight: 75 },
      ),
    ],
  );
  await page.goto("/comparar");
  // El id con formato antiguo se descarta al leer; el que ya no existe se quita con aviso.
  await expect(page.getByText("Hemos quitado 1 tabla que ya no está en Reboard")).toBeVisible();
  await expect(page.getByText(/2.*de 4 tablas/)).toBeVisible();
  // Rango de TablaFinder, sin porcentajes.
  await expect(page.getByRole("heading", { name: "Tu rango orientativo: 45–55 L" })).toBeVisible();
  await expect(page.getByText("Dentro de tu rango").first()).toBeVisible();
  await expect(page.getByText(/%/)).toHaveCount(0);
  // La vendida se marca y el resumen lo dice.
  await expect(page.getByRole("article", { name: /^Tabla B/ }).getByText("Vendida")).toBeVisible();
  await expect(page.getByText("La B está vendida: ya no se puede contactar.")).toBeVisible();
  expect(await stored(page)).toEqual([expect.objectContaining({ id: torq.id }), expect.objectContaining({ id: sold.id })]);

  // «Solo lo que cambia» deja solo filas distintas.
  await page.getByLabel("Solo lo que cambia").check();
  await expect(page.getByText("Igual en todas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("/comparar sin perfil invita a TablaFinder; vacío y con una sola tabla ofrecen salidas útiles", async ({ page }) => {
  const [a, b] = await demoPublished(2);
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [STATE_KEY, state([{ id: a.id, label: a.label }, { id: b.id, label: b.label }])]);
  await page.goto("/comparar");
  await expect(page.getByRole("link", { name: "Calcular mis litros" })).toHaveAttribute("href", "/calculadora-litros");

  await page.getByRole("button", { name: /^Quitar .* de la comparación$/ }).first().click();
  await expect(page.getByRole("heading", { name: "Añade otra tabla para compararla" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buscar tablas parecidas" })).toHaveAttribute("href", /\/buscar\?forma=/);

  await page.getByRole("button", { name: "Vaciar comparación" }).click();
  await expect(page.getByRole("heading", { name: "Todavía no has elegido tablas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buscar tablas" })).toBeVisible();
});

for (const width of [320, 375, 390, 430]) {
  test(`móvil ${width} px: 4 tablas, dos a la vez, sin desbordar la página`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
    const four = await demoPublished(4);
    await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [STATE_KEY, state(four.map((x) => ({ id: x.id, label: x.label })))]);
    const page = await ctx.newPage();
    const errors = trackErrors(page);
    await page.goto("/comparar");
    await expect(page.getByRole("heading", { name: "Diferencias principales" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

    const chips = page.getByRole("group", { name: "Tablas que ves en la comparación" });
    await expect(chips.getByRole("button", { pressed: true })).toHaveCount(2);
    await chips.getByRole("button", { name: /^Tabla C/ }).click();
    await expect(chips.getByRole("button", { name: /^Tabla C/ })).toHaveAttribute("aria-pressed", "true");
    await expect(chips.getByRole("button", { pressed: true })).toHaveCount(2);
    // Sin tabla de escritorio: lista de datos con dos columnas.
    await expect(page.getByRole("table")).toHaveCount(0);
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test("móvil: en la ficha no hay barra (está la de contacto) pero sí el acceso al comparador", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const [a, b] = await demoPublished(2);
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [STATE_KEY, state([{ id: a.id, label: a.label }, { id: b.id, label: b.label }])]);
  const page = await ctx.newPage();
  await page.goto(a.path);
  await expect(page.getByRole("link", { name: "Ver comparación (2)" })).toBeVisible();
  await expect(tray(page)).toBeHidden();
  await page.goto("/buscar");
  await expect(tray(page)).toBeVisible();
  await expect(tray(page).getByRole("link", { name: /Comparar/ })).toBeVisible();
  await ctx.close();
});

test("enlace compartido: sin selección propia, la comparación pasa a ser la tuya", async ({ page }) => {
  const [a, b] = await demoPublished(2);
  await page.goto(`/comparar?ids=${a.id},${b.id}`);
  await expect(page.getByText(/2.*de 4 tablas/)).toBeVisible();
  await expect(page).toHaveURL(/\/comparar$/);
  expect((await stored(page)).map((c: { id: string }) => c.id)).toEqual([a.id, b.id]);
  // La barra recibe nombre y miniatura reales (no «Tabla»).
  expect((await stored(page)).every((c: { label: string }) => c.label !== "Tabla")).toBe(true);
});

test("enlace compartido: con otra selección, se muestra sin tocar la tuya y eliges", async ({ page }) => {
  const [a, b, c, d] = await demoPublished(4);
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [STATE_KEY, state([{ id: c.id, label: c.label }, { id: d.id, label: d.label }])]);
  await page.goto(`/comparar?ids=${a.id},${b.id}`);
  await expect(page.getByText("Estás viendo una comparación que te han compartido")).toBeVisible();
  expect((await stored(page)).map((x: { id: string }) => x.id)).toEqual([c.id, d.id]);
  await page.getByRole("button", { name: "Usar esta comparación" }).click();
  await expect(page).toHaveURL(/\/comparar$/);
  await expect(page.getByText("Estás viendo una comparación que te han compartido")).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).map((x: { id: string }) => x.id)).toEqual([a.id, b.id]);
});

test("compartir: copia el enlace de la comparación y el de la ficha (escritorio)", async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const [a, b] = await demoPublished(2);
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [STATE_KEY, state([{ id: a.id, label: a.label }, { id: b.id, label: b.label }])]);
  const page = await ctx.newPage();
  await page.goto("/comparar");
  await page.getByRole("button", { name: "Compartir comparación" }).click();
  await expect(page.getByText("Enlace copiado")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/comparar?ids=${a.id},${b.id}`);

  await page.goto(a.path);
  await page.getByRole("button", { name: "Compartir", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`${a.path}$`));
  await ctx.close();
});
