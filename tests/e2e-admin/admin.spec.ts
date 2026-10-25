// Panel de administración en un navegador real, contra Supabase LOCAL (docs/ADMIN.md §Tests).
// Usuarios de prueba @reboard.test que se crean entrando con el código de Mailpit y se borran al final.
import { expect, test, type Page } from "@playwright/test";
import { deleteTestUsers, lastCode } from "../integration/auth-helpers";
import { serviceClient } from "../integration/local-supabase";

const sb = serviceClient();
const SECTIONS: [string, RegExp][] = [
  ["/admin/reportes", /Reportes/],
  ["/admin/mensajes", /Mensajes/],
  ["/admin/anuncios", /Anuncios/],
  ["/admin/usuarios", /Usuarios/],
  ["/admin/tiendas", /Tiendas/],
  ["/admin/alertas", /Alertas/],
  ["/admin/catalogo", /Marcas|Catálogo/],
  ["/admin/configuracion", /Configuración/],
  ["/admin/auditoria", /Auditoría/],
  ["/admin/seguridad", /Segundo factor/],
];

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  return errors;
}

async function login(page: Page, email: string, next = "/admin") {
  // Correos de ejecuciones anteriores a esta dirección: fuera, para no leer un código caducado.
  await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`, { method: "DELETE" });
  await page.goto(`/entrar?siguiente=${encodeURIComponent(next)}`);
  await page.locator("#login-email").fill(email);
  await page.getByRole("button", { name: "Enviarme el código" }).click({ timeout: 30_000 });
  const { code } = await lastCode(email);
  await page.locator("#login-code").fill(code);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30_000 });
}

async function userId(email: string) {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email)!.id;
}

const notFound = (page: Page) => expect(page.getByRole("heading", { name: /Esta ola ya pasó/i })).toBeVisible();

test.describe.serial("panel de administración", () => {
  let prefix = "";
  test.beforeAll(async ({}, info) => {
    prefix = `admin-e2e-${info.project.name}-`;
    await deleteTestUsers(sb, prefix);
  });
  test.afterAll(async () => {
    const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const ids = data.users.filter((u) => u.email?.startsWith(prefix)).map((u) => u.id);
    if (ids.length) await sb.from("profiles").update({ role: "user" }).in("id", ids);
    await deleteTestUsers(sb, prefix);
  });

  test("1. un usuario anónimo no accede a /admin: se le pide entrar", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/entrar\?siguiente=(%2F|\/)admin$/);
  });

  test("2. un usuario normal autenticado no accede (404, sin revelar el panel)", async ({ page }) => {
    await login(page, `${prefix}user@reboard.test`, "/");
    for (const path of ["/admin", "/admin/usuarios", "/admin/configuracion"]) {
      await page.goto(path);
      await notFound(page);
      await expect(page.getByRole("navigation", { name: "Secciones del panel" })).toHaveCount(0);
    }
  });

  test("3. un admin accede, navega por todas las secciones sin errores y el panel no se indexa", async ({ page, isMobile }) => {
    const errors = trackErrors(page);
    const email = `${prefix}admin@reboard.test`;
    await login(page, email, "/");
    // Primer admin: como scripts/grant-admin.mjs (service role), nunca desde la app.
    await sb.from("profiles").update({ role: "user" }).eq("role", "admin");
    await sb.from("profiles").update({ role: "admin" }).eq("id", await userId(email));

    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Panel" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // Sin la cabecera del marketplace: el panel tiene su propia navegación.
    await expect(page.getByRole("link", { name: "Vender mi tabla" })).toHaveCount(0);

    for (const [path, title] of SECTIONS) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(title);
    }
    if (isMobile) {
      await page.goto("/admin");
      await page.locator("[data-admin-shell]").getByRole("button", { name: "Menú" }).click();
      const nav = page.getByRole("navigation", { name: "Secciones del panel" });
      await expect(nav).toBeVisible();
      await nav.getByRole("link", { name: "Usuarios" }).click();
      await expect(page).toHaveURL(/\/admin\/usuarios/);
    } else {
      // Teclado: la navegación lateral es alcanzable con Tab y el foco es visible.
      await page.goto("/admin");
      await page.getByRole("navigation", { name: "Secciones del panel" }).getByRole("link", { name: "Reportes" }).focus();
      await page.keyboard.press("Tab");
      const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
      expect(outline).not.toBe("none");
    }
    expect(errors).toEqual([]);
  });

  test("4. robots.txt bloquea /admin", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/\/admin|Disallow: \/$/m);
  });

  test("4b. una acción desde la interfaz (ocultar con motivo) se aplica y queda en la auditoría", async ({ page }, info) => {
    const errors = trackErrors(page);
    const email = `${prefix}admin@reboard.test`;
    const sellerEmail = `${prefix}user@reboard.test`;
    // Anuncio de prueba del usuario normal (creado con service role, solo en local).
    const { data: l } = await sb
      .from("listings")
      .insert({
        slug: "admin-e2e-tabla",
        status: "published",
        seller_id: await userId(sellerEmail),
        size_label: `7'0"`,
        length_in: 84,
        shape: "evolutiva",
        construction: "pu",
        condition: "buen-estado",
        price_eur: 200,
        zone_slug: "lanzarote",
        town: "Famara",
      })
      .select("public_id")
      .single();
    await sb.from("profiles").update({ role: "admin" }).eq("id", await userId(email));
    await login(page, email, `/admin/anuncios/${l!.public_id}`);

    await page.getByRole("button", { name: "Ocultar temporalmente" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Ocultar temporalmente" }).click();
    await expect(dialog.getByRole("alert")).toContainText("motivo");
    await dialog.getByLabel(/Motivo/).fill("Fotos de otra tabla (prueba E2E)");
    await dialog.getByRole("button", { name: "Ocultar temporalmente" }).click();
    await expect(page.getByText(/Oculto temporalmente/).first()).toBeVisible();

    await page.goto(`/admin/auditoria?entidad=${l!.public_id}`);
    await expect(page.getByText("Fotos de otra tabla (prueba E2E)").first()).toBeVisible();
    const { data: row } = await sb.from("admin_audit_log").select("action, actor_id").eq("entity_id", l!.public_id!).order("id", { ascending: false }).limit(1).single();
    expect(row).toEqual({ action: "hide", actor_id: await userId(email) });

    // Capturas de cada sección para revisar el diseño (test-results/).
    for (const [path] of [["/admin"], ...SECTIONS]) {
      await page.goto(path);
      await page.screenshot({ path: info.outputPath(`${path.replaceAll("/", "_")}.png`), fullPage: true });
    }
    await page.goto(`/admin/anuncios/${l!.public_id}`);
    await page.screenshot({ path: info.outputPath(`_admin_anuncio.png`), fullPage: true });
    expect(errors).toEqual([]);
  });

  test("4c. el aviso de la web se cambia desde Configuración sin desplegar (y se audita)", async ({ page }) => {
    const email = `${prefix}admin@reboard.test`;
    const text = `Aviso de prueba ${Date.now()}`;
    await sb.from("profiles").update({ role: "admin" }).eq("id", await userId(email));
    await login(page, email, "/admin/configuracion");
    const form = page.getByRole("form", { name: "Aviso en la web" });
    await form.getByRole("checkbox").check();
    await form.locator('textarea[name="text"]').fill(text);
    await form.getByRole("button", { name: "Guardar aviso" }).click();
    await expect(page.getByText("Configuración guardada.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(text)).toBeVisible();
    // En el panel no se muestra la cabecera pública (ni el aviso).
    await page.goto("/admin");
    await expect(page.getByText(text)).toBeHidden();
    // Se deja como estaba.
    await page.goto("/admin/configuracion");
    await form.getByRole("checkbox").uncheck();
    await form.getByRole("button", { name: "Guardar aviso" }).click();
    await expect(page.getByText("Configuración guardada.")).toBeVisible();
    const { data } = await sb.from("admin_audit_log").select("action").eq("entity_type", "setting").eq("entity_id", "site_notice").limit(1);
    expect(data?.length).toBe(1);
  });

  test("4d. los mensajes de /contacto se ven en Mensajes y se marcan como atendidos", async ({ page }, info) => {
    const email = `${prefix}admin@reboard.test`;
    const from = `contacto-${info.project.name}-${Date.now()}@test.invalid`;
    // El formulario público lo guarda con service role (aquí, directamente: el envío real lo cubre e2e).
    await sb.from("contact_messages").insert({ topic: "tienda", email: from, message: "Tengo una escuela y quiero publicar." });
    await sb.from("profiles").update({ role: "admin" }).eq("id", await userId(email));
    await login(page, email, "/admin/mensajes");
    const card = page.locator("article:visible").filter({ hasText: from });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: "Responder por email" })).toHaveAttribute("href", new RegExp(`^mailto:${from}`));
    await card.getByRole("button", { name: "Marcar como atendido" }).click();
    await expect(page.locator("article:visible").filter({ hasText: from })).toHaveCount(0);
    await page.goto("/admin/mensajes?estado=atendidos");
    await expect(page.locator("article:visible").filter({ hasText: from })).toBeVisible();
    await sb.from("contact_messages").delete().eq("email", from);
  });

  test("5. al revocar el rol, el acceso se pierde en la siguiente petición", async ({ page }) => {
    const email = `${prefix}admin@reboard.test`;
    await login(page, email, "/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Panel" })).toBeVisible();
    await sb.from("profiles").update({ role: "user" }).eq("id", await userId(email));
    await page.reload();
    await notFound(page);
  });
});
