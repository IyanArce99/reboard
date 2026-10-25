// Recorridos clave que no deben romperse: buscador, calculadora de litros, comparador y ficha.
import { expect, test, type Page } from "@playwright/test";
import { demoListing, demoSold } from "./demo-data";

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

  await page.getByRole("button", { name: /^Fish \d/ }).click();
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

test("buscador: filtrar por marca con chips y elegir modelo", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/buscar");
  const panel = page.locator("#filtros");
  await expect(panel.getByRole("button", { name: /^Sin marca \d+$/ })).toBeVisible();
  await expect(panel.getByRole("combobox").filter({ hasText: "Cualquier modelo" })).toHaveCount(0);

  await panel.getByRole("button", { name: /^Torq \d/ }).click();
  await page.waitForURL(/marca=torq/);
  await expect(count(page)).toHaveText("26 tablas coinciden");
  await expect(panel.getByRole("button", { name: /^Torq \d/ })).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("combobox").filter({ hasText: "Cualquier modelo" })).toBeVisible();

  await panel.getByRole("button", { name: /^Torq \d/ }).click();
  await page.waitForURL((u) => !u.search.includes("marca="));
  await expect(count(page)).toHaveText("100 tablas coinciden");
  expect(errors).toEqual([]);
});

test("buscador: estado vacío con sugerencias", async ({ page }) => {
  await page.goto("/buscar?forma=longboard&zona=lanzarote&precio-max=150");
  await expect(page.getByRole("heading", { name: "No encontramos tablas con estos filtros" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quitar todos los filtros \(100\)/ })).toBeVisible();
});

test("home (escritorio): cada segmento abre su panel y el botón actualiza el recuento", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  // Sin isla elegida (no hay zona por defecto): todas las tablas publicadas.
  await expect(page.getByRole("link", { name: /^Buscar \d+ tablas$/ })).toBeVisible();
  await page.getByRole("button", { name: /Litros/ }).click();
  const panel = page.getByRole("dialog", { name: "Litros" });
  await panel.getByRole("button", { name: /45–60 L/ }).click();
  await expect(page.getByRole("link", { name: /^Buscar \d+ tablas?$/ })).toHaveAttribute("href", "/buscar?litros-min=45&litros-max=60");
  // Otro segmento cambia de panel; Escape lo cierra.
  await page.getByRole("button", { name: /Tipo de tabla/ }).click();
  await page.getByRole("dialog", { name: "Tipo de tabla" }).getByRole("button", { name: /^Evolutiva/ }).click();
  await expect(page.getByRole("link", { name: /^Buscar \d+ tablas?$/ })).toHaveAttribute("href", /forma=evolutiva/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("home (móvil): la hoja abre en la sección tocada y no roba el foco al escribir", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: /Litros/ }).click();
  const sheet = page.getByRole("dialog", { name: "Buscar tablas" });
  await expect(sheet.getByRole("heading", { name: "¿Cuántos litros?" })).toBeInViewport();
  const min = sheet.getByLabel("Mínimo");
  await min.click();
  await page.keyboard.type("40");
  await expect(min).toHaveValue("40");
  await expect(min).toBeFocused();
  await ctx.close();
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
  await expect(page.getByRole("button", { name: /Solo mi rango de litros/ })).toBeVisible();
  expect(errors).toEqual([]);
});

// El comparador tiene su propio archivo: tests/e2e/compare.spec.ts.

test("ficha: contacto y anuncio vendido", async ({ page }) => {
  const torq = await demoListing("torq-fun-tet-7-2-gran-canaria");
  const sold = await demoSold();
  await page.goto(torq.path);
  await page.getByRole("button", { name: "Contactar por WhatsApp" }).click();
  await expect(page.getByRole("dialog", { name: /Contactar con Daniel/ })).toBeVisible();

  await page.goto(sold.path);
  await expect(page.getByText("Esta tabla ya se ha vendido")).toBeVisible();
  // Vendida: sin botón de contacto; las parecidas suben bajo el aviso y la barra móvil lleva a ellas.
  await expect(page.getByRole("button", { name: /Contactar|Llamar/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tablas parecidas a la venta" })).toBeVisible();
  await expect(page.locator('a[href="#similares"]', { hasText: "Ver parecidas" })).toHaveCount(1); // barra móvil (oculta en escritorio)
  await expect(page.getByText(/^Pedía /).first()).toBeVisible();
});

test("sin errores de hidratación con estado guardado", async ({ page }) => {
  const torq = await demoListing("torq-fun-tet-7-2-gran-canaria");
  await page.addInitScript(
    ([k, v]) => localStorage.setItem(k, v),
    [STATE_KEY, JSON.stringify({ saved: [torq.id], compare: [{ id: torq.id, label: torq.label }], alerts: [], profile: { lo: 45, hi: 60, level: "Iniciación", weight: 75 } })],
  );
  for (const url of ["/", "/buscar", "/tablas/evolutiva", torq.path, "/calculadora-litros", "/guardado", "/comparar", "/marcas/torq/fun-tet"]) {
    // Solo errores de JavaScript y de hidratación: un 404 de red (p. ej., la precarga de un anuncio que
    // otro test acaba de borrar) no es un error de hidratación y hacía fallar este test a veces.
    const errors = trackErrors(page);
    await page.goto(url, { waitUntil: "networkidle" });
    expect(errors.filter((e) => !/^Failed to load resource/.test(e)), url).toEqual([]);
    page.removeAllListeners("pageerror");
    page.removeAllListeners("console");
  }
});

test("publicar: la foto se recodifica a WebP ≤ 1600 px y sin EXIF ni GPS", async ({ page }) => {
  const errors = trackErrors(page);
  const sharp = (await import("sharp")).default;
  const jpeg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#336699" } })
    .jpeg()
    .withExif({
      IFD0: { Make: "CamaraDePrueba" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "43/1 33/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "5/1 55/1 0/1" },
    })
    .toBuffer();
  expect(jpeg.includes(Buffer.from("Exif")), "la foto de partida lleva EXIF").toBe(true);

  await page.goto("/vender/publicar");
  await page.getByTestId("foto-galeria").setInputFiles({ name: "con-gps.jpg", mimeType: "image/jpeg", buffer: jpeg });
  const img = page.getByRole("img", { name: /Foto 1/ });
  await expect(img).toBeVisible();
  const out = await img.evaluate(async (el) => {
    const blob = await (await fetch((el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src)).blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const bitmap = await createImageBitmap(blob);
    const text = new TextDecoder("latin1").decode(bytes);
    return { type: blob.type, width: bitmap.width, height: bitmap.height, exif: text.includes("Exif") || text.includes("EXIF"), gps: text.includes("CamaraDePrueba") };
  });
  expect(out.type).toBe("image/webp");
  expect(Math.max(out.width, out.height)).toBe(1600);
  expect(out.exif).toBe(false);
  expect(out.gps).toBe(false);
  expect(errors).toEqual([]);
});

test("cabecera (escritorio): comprar, ¿qué tabla necesito?, guías, iconos y vender", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/buscar");
  const header = page.locator("header");
  const nav = header.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link", { name: "Comprar tablas" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "¿Qué tabla necesito?" })).toHaveAttribute("href", "/calculadora-litros");
  await expect(nav.getByRole("link", { name: "Guías" })).toHaveAttribute("href", "/guias");
  // Sin buscador en la cabecera; sin contador si no hay guardadas.
  await expect(header.getByRole("searchbox")).toHaveCount(0);
  await expect(header.getByText(/Buscar tablas por litros/)).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Guardadas", exact: true })).toHaveAttribute("href", "/guardado");
  await expect(header.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
  await header.getByRole("link", { name: "Vender mi tabla" }).click();
  await expect(page).toHaveURL(/\/vender\/publicar$/);
  await page.goto("/calculadora-litros");
  await expect(page.locator("header").getByRole("link", { name: "¿Qué tabla necesito?" })).toHaveAttribute("aria-current", "page");
  expect(errors).toEqual([]);
});

test("cabecera: el corazón muestra el contador solo con guardadas", async ({ page }) => {
  await page.addInitScript(
    ([k, v]) => localStorage.setItem(k, v),
    [STATE_KEY, JSON.stringify({ saved: ["a1040", "a1096"], compare: [], alerts: [], profile: null })] as const,
  );
  await page.goto("/guias");
  await expect(page.locator("header").getByRole("link", { name: "Guardadas 2" })).toBeVisible();
});

for (const width of [375, 768, 1024, 1440]) {
  test(`cabecera sin desbordamiento a ${width} px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: width < 760, hasTouch: width < 760 });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    const header = page.locator("header");
    const box = await header.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(66);
    // Vender se ve siempre en la barra: «Vender mi tabla» desde tablet y «Vender» en móvil.
    await expect(header.getByRole("link", { name: width >= 760 ? "Vender mi tabla" : "Vender" })).toBeVisible();
    if (width < 1024) {
      await header.getByRole("button", { name: "Menú" }).click();
      const menu = page.getByRole("dialog", { name: "Menú" });
      await expect(menu.getByRole("link", { name: "Comprar tablas" })).toBeVisible();
      await expect(menu.getByRole("link", { name: /¿Qué tabla necesito\?/ })).toHaveAttribute("href", "/calculadora-litros");
      await expect(menu.getByRole("link", { name: "Vender mi tabla" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(header.getByRole("button", { name: "Menú" })).toBeFocused();
    } else {
      await expect(header.getByRole("button", { name: "Menú" })).toBeHidden();
    }
    await ctx.close();
  });
}

// ——— Publicar: asistente de 5 pasos (modo demo) ———

async function photoFiles(colors: string[]) {
  const sharp = (await import("sharp")).default;
  return Promise.all(
    colors.map(async (c, i) => ({
      name: `foto-${i + 1}.jpg`,
      mimeType: "image/jpeg",
      buffer: await sharp({ create: { width: 900, height: 1200, channels: 3, background: c } }).jpeg().toBuffer(),
    })),
  );
}

const h1 = (page: Page) => page.getByRole("heading", { level: 1 });
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

/** Recorre los pasos 1–4 con datos válidos y deja el asistente en «Revisar». */
async function fillToReview(page: Page) {
  await page.goto("/vender/publicar");
  await expect(h1(page)).toHaveText("Enséñanos tu tabla");
  await page.getByTestId("foto-galeria").setInputFiles(await photoFiles(["#336699", "#88aa55"]));
  await expect(page.getByRole("img", { name: /Foto 2/ })).toBeVisible();
  expect(await noOverflow(page)).toBe(0);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(h1(page)).toHaveText("Cuéntanos qué tabla es");
  await page.getByRole("button", { name: "Shaper local" }).click();
  await page.getByLabel(/Escríbelas tal cual/).fill("6'4 x 20 1/2 x 2 5/8 34L");
  await page.getByRole("button", { name: "Rellenar" }).click();
  await expect(page.locator("#pub-len")).toHaveValue(`6'4"`);
  await expect(page.locator("#pub-vol")).toHaveValue("34");
  // Sin tipo no se avanza: el aviso explica qué falta.
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Elige el tipo de tabla." })).toBeVisible();
  await page.getByRole("button", { name: "Híbrida" }).click();
  await page.getByRole("button", { name: "PU / Poliéster" }).click();
  expect(await noOverflow(page)).toBe(0);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(h1(page)).toHaveText("¿En qué estado está?");
  await page.getByRole("button", { name: /^Muy buen estado/ }).click();
  await expect(page.getByRole("button", { name: /^Muy buen estado/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(h1(page)).toHaveText("¿Por cuánto la vendes?");
  await page.getByRole("textbox", { name: "Precio" }).fill("280");
  await page.getByRole("button", { name: "La Palma" }).click();
  await page.getByRole("button", { name: "Los Llanos de Aridane" }).click();
  await expect(page.getByLabel("Localidad", { exact: true })).toHaveValue("Los Llanos de Aridane");
  await page.getByLabel("Tu teléfono").fill("600 000 000");
  expect(await noOverflow(page)).toBe(0);
  await page.getByRole("button", { name: "Revisar anuncio" }).click();
  await expect(h1(page)).toHaveText("Así quedará tu anuncio");
  expect(await noOverflow(page)).toBe(0);
}

// Con Supabase (como corre esta suite) la revisión pide entrar con el código y publica de verdad:
// el recorrido completo (código, publicar, panel) está en journeys.spec.ts. Aquí, hasta la revisión.
test("publicar (escritorio): 5 pasos con vista previa en vivo hasta la revisión", async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await fillToReview(page);
  const preview = page.getByRole("complementary", { name: "Vista previa" });
  await expect(preview).toBeVisible();
  await expect(preview.getByText("280 €")).toBeVisible();
  await expect(preview.getByText(`Híbrida sin marca 6'4"`)).toBeVisible();
  await expect(preview.getByText("Los Llanos de Aridane, La Palma · Muy buen estado")).toBeVisible();
  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviarme el código" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("publicar (móvil): 5 pasos en una columna sin desbordar hasta la revisión", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  await fillToReview(page);
  // En móvil la vista previa lateral no se muestra: va arriba de la revisión.
  await expect(page.getByRole("complementary", { name: "Vista previa" })).toBeHidden();
  await expect(page.locator("#login-email")).toBeVisible();
  expect(await noOverflow(page)).toBe(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("publicar: ordenar y quitar fotos, con la portada siempre la primera", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/vender/publicar");
  await page.getByTestId("foto-galeria").setInputFiles(await photoFiles(["#336699", "#88aa55", "#aa5544"]));
  const list = page.getByRole("list", { name: "Tus fotos" });
  await expect(list.getByRole("img")).toHaveCount(3);
  const src = (name: RegExp) => list.getByRole("img", { name }).getAttribute("src");
  const [first, second] = [await src(/^Foto 1/), await src(/^Foto 2/)];
  await expect(list.getByRole("img", { name: /^Foto 1 \(portada\)/ })).toBeVisible();
  await expect(list.getByText("Portada")).toHaveCount(1);

  await page.getByRole("button", { name: "Usar la foto 2 como portada" }).click();
  expect(await src(/^Foto 1 \(portada\)/)).toBe(second);
  expect(await src(/^Foto 2/)).toBe(first);

  await page.getByRole("button", { name: "Quitar la foto 1" }).click();
  await expect(list.getByRole("img")).toHaveCount(2);
  expect(await src(/^Foto 1 \(portada\)/)).toBe(first);
  await expect(page.getByText("2 de 8 fotos.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("publicar: editar una sección desde la revisión no pierde datos", async ({ page }) => {
  const errors = trackErrors(page);
  await fillToReview(page);
  await page.getByRole("button", { name: "Editar estado" }).click();
  await expect(h1(page)).toHaveText("¿En qué estado está?");
  await expect(page.getByRole("button", { name: /^Muy buen estado/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Buen estado/ }).click();
  await page.getByRole("button", { name: "Volver a revisar" }).click();
  await expect(h1(page)).toHaveText("Así quedará tu anuncio");
  await expect(page.getByRole("region", { name: "Estado" }).getByText("Buen estado", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Precio y ubicación" }).getByText("280 €")).toBeVisible();
  await expect(page.getByRole("region", { name: "La tabla" }).getByText(`6'4" × 20 1/2" × 2 5/8" · 34 L`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("publicar: recupera el borrador (con fotos) al recargar", async ({ page }) => {
  test.slow(); // recarga, /vender y vuelta: con la suite en paralelo pasa de 30 s
  const errors = trackErrors(page);
  await page.goto("/vender/publicar");
  await page.getByTestId("foto-galeria").setInputFiles(await photoFiles(["#336699"]));
  await expect(page.getByRole("img", { name: /Foto 1/ })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Sin marca" }).click();
  await page.locator("#pub-len").fill(`7'2"`);
  await expect(page.getByRole("status").filter({ hasText: "Borrador guardado" })).toBeVisible();
  await page.waitForTimeout(600);

  await page.reload();
  await expect(page.getByText("Hemos recuperado el anuncio que dejaste a medias")).toBeVisible();
  await expect(h1(page)).toHaveText("Cuéntanos qué tabla es");
  await expect(page.locator("#pub-len")).toHaveValue(`7'2"`);
  await expect(page.getByRole("button", { name: "Sin marca" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Volver al paso 1: Fotos" }).click();
  await expect(page.getByRole("img", { name: /Foto 1/ })).toBeVisible();

  // /vender avisa del borrador a medias y lleva de vuelta.
  await page.goto("/vender");
  await expect(page.getByText("Tienes una tabla a medias.")).toBeVisible();
  await page.getByRole("link", { name: "Seguir publicando" }).click();
  await expect(page.getByRole("img", { name: /Foto 1/ }).or(page.locator("#pub-len"))).toBeVisible();
  await page.getByRole("button", { name: "Volver al paso 1: Fotos" }).click().catch(() => {});

  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Empezar de nuevo" }).click();
  await expect(h1(page)).toHaveText("Enséñanos tu tabla");
  await expect(page.getByRole("img", { name: /Foto 1/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("home: «Softboard» está entre los tipos del buscador y filtra por construcción", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Tipo de tabla/ }).click();
  const panel = page.getByRole("dialog", { name: "Tipo de tabla" });
  await panel.getByRole("button", { name: /^Softboard/ }).click();
  await expect(panel.getByRole("button", { name: /^Softboard/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /^Buscar \d+ tablas?$/ })).toHaveAttribute("href", /construccion=softboard/);
  // Combinada con un tipo: softboards evolutivas.
  await panel.getByRole("button", { name: /^Evolutiva/ }).click();
  await expect(page.getByRole("link", { name: /^Buscar \d+ tablas?$/ })).toHaveAttribute("href", /forma=evolutiva.*construccion=softboard|construccion=softboard.*forma=evolutiva/);
});

test("orden «Menos litros»: las tablas sin litros van al final", async ({ page }) => {
  await page.goto("/buscar?orden=litros");
  const cards = page.locator("main article");
  await expect(cards.first()).toBeVisible();
  await expect(cards.first()).not.toContainText("Litros sin indicar");
});

test("cabecera y pie vuelven al salir de «Publicar» y de /vender (navegación en cliente)", async ({ page }) => {
  // Next deja montada la página anterior: sus marcas no deben seguir ocultando nada.
  const publish = page.locator("[data-header-publish]").first();
  const home = page.getByRole("link", { name: /Reboard, inicio/ }).first();
  await page.goto("/");
  await expect(publish).toBeVisible();
  await publish.click();
  await page.waitForURL("**/vender/publicar");
  await expect(publish).toBeHidden();
  await expect(page.locator("footer")).toBeHidden();
  await home.click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(publish).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();

  await page.goto("/vender");
  await expect(publish).toBeHidden();
  await home.click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(publish).toBeVisible();
});
