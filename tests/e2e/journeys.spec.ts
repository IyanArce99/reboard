// Recorridos completos de comprador y vendedor, en escritorio (1366×768) y móvil (390×844).
// Contra el build de producción (:3100) y Supabase LOCAL con el inventario DEMO (npm run db:seed-demo)
// y Mailpit (código de acceso por email). El vendedor crea su cuenta y su anuncio y los borra al final
// desde la propia interfaz (panel → Eliminar, cuenta → Borrar la cuenta); si algo falla a medias, el
// afterAll borra el usuario con service role (solo local).
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { serviceClient } from "../integration/local-supabase";

const MAILPIT = "http://127.0.0.1:54324";

const VIEWPORTS = {
  escritorio: { viewport: { width: 1366, height: 768 } },
  movil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
} as const;
type Kind = keyof typeof VIEWPORTS;

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Los 404 de prefetch RSC tras cerrar sesión o borrar se registran aparte en el informe de QA.
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  return errors;
}

const h1 = (page: Page) => page.getByRole("heading", { level: 1 }).first();
const count = (page: Page) => page.getByText(/tablas? coincide/).first();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

async function newPage(browser: Browser, kind: Kind): Promise<[BrowserContext, Page]> {
  const ctx = await browser.newContext({ ...VIEWPORTS[kind], locale: "es-ES" });
  return [ctx, await ctx.newPage()];
}

async function otp(email: string, since: number) {
  for (let i = 0; i < 40; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=50`)).json()) as {
      messages: { ID: string; Created: string; To: { Address: string }[] }[];
    };
    const m = list.messages.find((x) => x.To.some((t) => t.Address.toLowerCase() === email) && new Date(x.Created).getTime() >= since - 2000);
    if (m) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { Text: string };
      const code = full.Text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No ha llegado el código a ${email} (¿Mailpit en ${MAILPIT}?)`);
}

// Fotos reales de tablas (banco editorial del proyecto), convertidas a JPEG de móvil (3000×4000 px),
// para probar la recodificación y la galería con imágenes de verdad y no con colores lisos.
const photos = () =>
  Promise.all(
    ["tabla-azul-arena", "tablas-orilla"].map(async (f, i) => ({
      name: `IMG_000${i + 1}.jpg`,
      mimeType: "image/jpeg",
      buffer: await sharp(readFileSync(`public/images/fotos/${f}.webp`)).resize(3000, 4000, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer(),
    })),
  );

for (const kind of Object.keys(VIEWPORTS) as Kind[]) {
  const mobile = kind === "movil";

  test(`comprador (${kind}): buscar, filtrar, ordenar, ficha, guardar, comparar, contacto y reporte`, async ({ browser }) => {
    test.setTimeout(90_000);
    const [ctx, page] = await newPage(browser, kind);
    const errors = trackErrors(page);

    // Home: propuesta y buscador (isla + litros + tipo).
    await page.goto("/");
    await expect(h1(page)).toContainText(/segunda mano/i);
    expect(await noOverflow(page)).toBe(0);
    await page.getByRole("button", { name: /^Isla/ }).click();
    const sheet = page.getByRole("dialog", { name: mobile ? "Buscar tablas" : "Isla" });
    await sheet.getByRole("button", { name: /^Tenerife \d+/ }).click();
    if (!mobile) await page.getByRole("button", { name: /^Litros/ }).click();
    await (mobile ? sheet : page.getByRole("dialog", { name: "Litros" })).getByRole("button", { name: /^35–45 L/ }).click();
    if (!mobile) await page.getByRole("button", { name: /^Tipo de tabla/ }).click();
    await (mobile ? sheet : page.getByRole("dialog", { name: "Tipo de tabla" })).getByRole("button", { name: /^Fish/ }).click();
    const cta = (mobile ? sheet : page).getByRole("link", { name: /^Buscar \d+ tablas?$/ });
    await expect(cta).toHaveAttribute("href", "/buscar?zona=tenerife&litros-min=35&litros-max=45&forma=fish");
    await expect(cta).toHaveText("Buscar 2 tablas");
    if (!mobile) await page.keyboard.press("Escape");
    await cta.click();
    await expect(count(page)).toHaveText("2 tablas coinciden");

    // Filtros: panel lateral (escritorio) u hoja a pantalla completa (móvil), con «Estado, quillas…».
    await page.goto("/buscar");
    const panel = mobile ? page.getByRole("dialog").first() : page.locator("#filtros");
    if (mobile) await page.getByRole("button", { name: "Filtros" }).click();
    await panel.getByRole("button", { name: /^Epoxy/ }).click();
    await panel.getByLabel("Precio máximo", { exact: true }).fill("300");
    await panel.getByRole("button", { name: /Estado, quillas/ }).click();
    await panel.getByRole("button", { name: /^Muy buen estado/ }).first().click();
    if (mobile) {
      await expect(panel.getByRole("button", { name: "Ver 10 tablas" })).toBeVisible();
      await panel.getByRole("button", { name: "Ver 10 tablas" }).click();
    }
    await expect(page).toHaveURL(/construccion=epoxy.*precio-max=300.*estado=muy-buen-estado/);
    await expect(count(page)).toHaveText("10 tablas coinciden");

    // Ordenar por precio.
    await page.goto("/buscar");
    await page.getByRole("combobox", { name: "Ordenar" }).selectOption({ label: "Más baratas primero" });
    await page.waitForURL(/orden=precio/);
    const prices = (await page.locator("main article:visible").allInnerTexts())
      .map((t) => Number(t.match(/(\d[\d.]*)\s*€/)?.[1].replace(/\./g, "")))
      .slice(0, 12);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    // Ficha: datos técnicos, guardar.
    await page.locator("main article h3 a:visible").first().click();
    await page.waitForURL(/\/anuncio\//);
    const listingUrl = page.url();
    await expect(page.getByRole("region", { name: "La tabla" })).toContainText("Longitud");
    expect(await noOverflow(page)).toBe(0);
    await page.getByRole("button", { name: /^Guardar$/ }).first().click();
    await expect(page.locator("header").getByRole("link", { name: "Guardadas (1)" })).toBeVisible();
    await page.goto("/guardado");
    await expect(page.locator("main article:visible")).toHaveCount(1);

    // Comparar dos tablas.
    await page.goto("/buscar");
    const add = page.getByRole("button", { name: /^Comparar\s*:/ });
    await add.nth(0).click();
    await add.nth(1).click();
    await page.getByRole("complementary", { name: "Comparación de tablas" }).getByRole("link", { name: /Comparar 2 tablas/ }).click();
    await expect(page).toHaveURL(/\/comparar$/);
    await expect(page.getByText("2 de 4 tablas")).toBeVisible();

    // Contacto: el diálogo abre y, al pasar Turnstile (claves de prueba), pide el teléfono solo.
    // El inventario DEMO no tiene teléfonos: queda el botón para reintentar. La revelación real se
    // prueba en el recorrido del vendedor.
    await page.goto(listingUrl);
    await page.getByRole("button", { name: mobile ? /^(WhatsApp|Llamar)$/ : /Contactar por WhatsApp|Llamar al vendedor/ }).last().click();
    const contact = page.getByRole("dialog", { name: /Contactar con/ });
    await expect(contact.getByRole("button", { name: /^Ver teléfono/ })).toBeEnabled({ timeout: 20_000 });
    await contact.getByRole("button", { name: "Cerrar" }).click();
    await expect(contact).toHaveCount(0);

    // Reportar sin sesión: pide entrar; Escape cierra y devuelve el foco.
    await page.getByRole("button", { name: "Reportar anuncio" }).click();
    const report = page.getByRole("dialog", { name: "Reportar anuncio" });
    await expect(report).toContainText("tienes que entrar en tu cuenta");
    await page.keyboard.press("Escape");
    await expect(report).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reportar anuncio" })).toBeFocused();

    expect(errors).toEqual([]);
    await ctx.close();
  });

  test.describe(`vendedor (${kind})`, () => {
    const email = `e2e-journey-${kind}-${Date.now()}@example.com`;

    test.afterAll(async () => {
      // Red de seguridad: si el test falló antes de borrar la cuenta desde la interfaz.
      const sb = serviceClient();
      const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
      const u = data.users.find((x) => x.email === email);
      if (u) {
        await sb.from("listings").delete().eq("seller_id", u.id);
        await sb.auth.admin.deleteUser(u.id);
      }
    });

    test(`publicar con medidas «sucias», verlo, gestionarlo en el panel, cuenta y salir`, async ({ browser }) => {
      test.setTimeout(150_000);
      const [ctx, page] = await newPage(browser, kind);
      const errors = trackErrors(page);
      page.on("dialog", (d) => void d.accept());

      // /vender → publicar
      await page.goto("/vender");
      await page.locator('main a[href="/vender/publicar"]:visible').first().click();
      await expect(h1(page)).toHaveText("Enséñanos tu tabla");
      await page.getByTestId("foto-galeria").setInputFiles(await photos());
      await expect(page.getByRole("img", { name: /Foto 2/ })).toBeVisible();
      await page.getByRole("button", { name: "Continuar" }).click();

      await expect(h1(page)).toHaveText("Cuéntanos qué tabla es");
      await page.getByRole("button", { name: "Otra marca" }).click();
      await page.locator("#pub-brand-other").fill("QA Journey");
      // Medidas como las escribe la gente: comillas tipográficas, ½, coma decimal y «L».
      await page.locator("#pub-len").fill("6’4”");
      await expect(page.locator("#pub-len-read")).toHaveText(`6'4" · 193 cm`);
      await page.locator("#pub-width").fill("20½");
      await expect(page.locator("#pub-width-read")).toContainText(`20 1/2"`);
      await page.locator("#pub-thick").fill(`2 5/8"`);
      await expect(page.locator("#pub-thick-read")).toContainText(`2 5/8"`);
      await page.locator("#pub-vol").fill("34,5 L");
      await expect(page.locator("#pub-vol-read")).toHaveText("34,5 litros");
      await page.getByRole("button", { name: "Híbrida" }).click();
      await page.getByRole("button", { name: "PU / Poliéster" }).click();
      expect(await noOverflow(page)).toBe(0);
      await page.getByRole("button", { name: "Continuar" }).click();

      await expect(h1(page)).toHaveText("¿En qué estado está?");
      await page.getByRole("button", { name: /^Muy buen estado/ }).click();
      await page.getByRole("button", { name: "Continuar" }).click();

      await expect(h1(page)).toHaveText("¿Por cuánto la vendes?");
      await page.getByRole("textbox", { name: "Precio" }).fill("280");
      await page.getByRole("button", { name: "La Palma" }).click();
      await page.locator("#pub-town").fill("Tazacorte");
      await page.locator("#pub-phone").fill("612 345 678");
      await page.getByRole("button", { name: "Revisar anuncio" }).click();
      await expect(h1(page)).toHaveText("Así quedará tu anuncio");

      // Acceso con código (Mailpit) incrustado en la revisión.
      await page.locator("#login-email").fill(email);
      const send = page.getByRole("button", { name: "Enviarme el código" });
      await expect(send).toBeEnabled({ timeout: 20_000 });
      const since = Date.now();
      await send.click();
      await page.locator("#login-code").fill(await otp(email, since));
      await page.getByRole("button", { name: /Entrar|Confirmar|Verificar|Continuar/ }).last().click();
      await page.locator("#pub-name").fill("QA Journey");
      await page.getByRole("button", { name: "Publicar gratis" }).click();
      await expect(h1(page)).toHaveText("Tu tabla está publicada", { timeout: 45_000 });
      let path = await page.getByRole("link", { name: /Ver mi anuncio/ }).getAttribute("href");
      expect(path).toMatch(/^\/anuncio\/qa-journey-6-4-la-palma-a\d+$/);
      const id = path!.match(/-(a\d+)$/)![1];

      // La ficha y la búsqueda lo muestran.
      await page.goto(path!);
      await expect(h1(page)).toContainText("QA Journey 6'4\"", { ignoreCase: true });
      // Galería con las dos fotos reales: flecha en escritorio, deslizar el dedo en móvil.
      await expect(page.getByText("1 / 2", { exact: true })).toBeVisible();
      if (mobile) {
        const gal = page.getByRole("img", { name: /QA Journey.*·/ }).first();
        const box = (await gal.boundingBox())!;
        const y = box.y + box.height / 2;
        await gal.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: box.x + box.width - 30, clientY: y }] });
        await gal.dispatchEvent("touchend", { changedTouches: [{ identifier: 1, clientX: box.x + 30, clientY: y }] });
      } else {
        await page.getByRole("button", { name: "Foto siguiente" }).click();
      }
      await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
      await expect(page.getByText("Tazacorte, La Palma", { exact: true }).first()).toBeVisible();
      await expect(async () => {
        await page.goto("/buscar?zona=la-palma");
        await expect(page.locator(`main a[href$="-${id}"]`).first()).toBeAttached({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });

      // Editar cambiando la marca a «Sin marca» (cambia el slug). QA-1: se guarda «Sin marca», no
      // «Shaper local». QA-2: la URL antigua redirige a la nueva (temporal) y la nueva responde 200.
      // Editar abre en la revisión (QA-7): «Editar la tabla» → cambio → «Volver a revisar» → guardar.
      await page.goto(`/vender/publicar?editar=${id}`);
      await expect(h1(page)).toHaveText("Revisa los cambios");
      await page.getByRole("button", { name: "Editar la tabla" }).click();
      await expect(h1(page)).toHaveText("Cuéntanos qué tabla es");
      await page.getByRole("button", { name: "Sin marca" }).click();
      await page.getByRole("button", { name: "Volver a revisar" }).click();
      await page.getByRole("button", { name: "Guardar cambios" }).click({ timeout: 20_000 });
      await expect(h1(page)).toHaveText("Cambios guardados", { timeout: 45_000 });
      const oldPath = path!;
      path = await page.getByRole("link", { name: /Ver mi anuncio/ }).getAttribute("href");
      expect(path).toMatch(new RegExp(`^/anuncio/hibrida-artesanal-6-4-la-palma-${id}$`));
      // Justo después de guardar: la URL nueva responde 200 y la antigua redirige a la nueva (307,
      // temporal). Antes, el proxy (caché de 60 s) y la página se redirigían en bucle.
      const fresh = await page.request.get(path!, { maxRedirects: 0 });
      expect(fresh.status()).toBe(200);
      const fromOld = await page.request.get(oldPath, { maxRedirects: 0 });
      expect(fromOld.status()).toBe(307);
      expect(fromOld.headers()["location"]).toContain(path!);
      await page.goto(`/vender/publicar?editar=${id}`);
      await page.getByRole("button", { name: "Editar la tabla" }).click();
      await expect(page.getByRole("button", { name: "Sin marca" })).toHaveAttribute("aria-pressed", "true");

      // Un comprador anónimo revela el contacto real (Turnstile de prueba + CONTACT_IP_SALT).
      const [buyerCtx, buyer] = await newPage(browser, kind);
      await buyer.goto(path!);
      await buyer.getByRole("button", { name: mobile ? /^WhatsApp$/ : /Contactar por WhatsApp/ }).last().click();
      const dlg = buyer.getByRole("dialog", { name: /Contactar con QA Journey/ });
      // Dos toques: «Contactar» y, en cuanto pasa Turnstile, ya sale «Abrir WhatsApp».
      await expect(dlg.locator('a[href^="https://wa.me/34612345678"]')).toBeVisible({ timeout: 20_000 });
      await expect(dlg.locator('a[href="tel:+34612345678"]')).toBeVisible();
      await buyerCtx.close();

      // Panel: contador, precio, confirmar, vendida, volver a publicar, retirar, eliminar.
      await page.goto("/panel");
      const row = page.locator("article:visible").filter({ has: page.locator(`a[href$="-${id}"]`) }).first();
      await expect(row).toContainText("Contacto mostrado 1 vez");
      await row.getByRole("button", { name: "Cambiar precio" }).click();
      await row.getByLabel("Nuevo precio (€)").fill("250");
      await row.getByRole("button", { name: "Guardar" }).click();
      await expect(row).toContainText("250 €");
      await row.getByRole("button", { name: "Confirmar disponibilidad" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Disponibilidad confirmada hoy" })).toBeVisible();
      await page.goto(path!);
      await expect(page.locator("main").first()).toContainText("250 €");

      await page.goto("/panel");
      await row.getByRole("button", { name: "Marcar vendida" }).click();
      await expect(page.getByRole("tab", { name: "Vendidos · 1" })).toBeVisible();
      await page.getByRole("tab", { name: /Vendidos/ }).click();
      await row.getByRole("button", { name: "Volver a publicar" }).click();
      await expect(page.getByRole("tab", { name: "Activos · 1" })).toBeVisible();
      await page.getByRole("tab", { name: /Activos/ }).click();
      await row.getByRole("button", { name: "Retirar" }).click();
      await expect(page.getByRole("tab", { name: "Caducados y retirados · 1" })).toBeVisible();
      await page.getByRole("tab", { name: /retirados/ }).click();
      await row.getByRole("button", { name: "Eliminar" }).click();
      await expect(page.getByText(/No tienes anuncios|Todavía no has publicado|Publica tu primera/i).first()).toBeVisible({ timeout: 10_000 });

      // Cuenta: nombre visible, accesos que no le corresponden.
      await page.goto("/cuenta");
      await page.getByLabel("Nombre visible").fill("QA Renombrado");
      await page.getByRole("button", { name: "Guardar nombre" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Nombre guardado." })).toBeVisible();
      await page.goto("/vender/publicar?editar=a116994");
      await expect(h1(page)).toHaveText("No puedes editar este anuncio");
      await page.goto("/moderacion");
      await expect(page.getByRole("heading", { name: "No tienes acceso" }).first()).toBeVisible();
      test.info().annotations.push({
        type: "moderacion-no-acceso",
        description: `encabezados «No tienes acceso»: ${await page.getByRole("heading", { name: "No tienes acceso" }).count()} (visibles: ${await page.locator("h2:visible", { hasText: "No tienes acceso" }).count()})`,
      });
      await page.goto("/admin");
      await expect(h1(page)).toHaveText("Esta ola ya pasó");

      // Cerrar sesión: lo privado vuelve a pedir entrar.
      await page.goto("/cuenta");
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await page.waitForURL((u) => new URL(u).pathname === "/");
      await page.goto("/panel");
      await page.waitForURL(/\/entrar\?siguiente=%2Fpanel/);

      // Volver a entrar y borrar la cuenta (limpieza desde la interfaz).
      await page.locator("#login-email").fill(email);
      await expect(send).toBeEnabled({ timeout: 20_000 });
      const since2 = Date.now();
      await send.click();
      await page.locator("#login-code").fill(await otp(email, since2));
      await page.getByRole("button", { name: /Entrar|Confirmar|Verificar|Continuar/ }).last().click();
      await page.waitForURL((u) => new URL(u).pathname === "/panel");
      await page.goto("/cuenta");
      await page.locator("summary:visible", { hasText: "Borrar la cuenta" }).first().click();
      await page.locator("#borrar:visible").fill("BORRAR");
      await page.locator("#borrar:visible").locator("xpath=ancestor::form").getByRole("button").last().click();
      await page.waitForURL((u) => new URL(u).pathname === "/");

      expect(errors).toEqual([]);
      await ctx.close();
    });
  });
}
