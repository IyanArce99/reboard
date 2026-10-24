import { describe, expect, it, vi } from "vitest";
import { authErrorText, cleanDisplayName, listingDbId, safeNext } from "@/lib/auth/shared";
import { verifyTurnstile } from "@/lib/security/turnstile";

describe("safeNext (redirección tras entrar)", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/panel")).toBe("/panel");
    expect(safeNext("/buscar?zona=asturias")).toBe("/buscar?zona=asturias");
    expect(safeNext("/vender/publicar?editar=a12#fotos")).toBe("/vender/publicar?editar=a12#fotos");
  });
  it("lo que devuelve nunca sale del dominio", () => {
    for (const v of ["/%09/evil.com", "/./evil.com", "/../evil.com", "/a/../../evil.com"]) {
      expect(new URL(safeNext(decodeURIComponent(v)), "https://www.reboard.es").origin).toBe("https://www.reboard.es");
    }
  });
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "",
    null,
    undefined,
    // El navegador ignora tabuladores y saltos de línea: «/\t/evil.com» se resolvería como //evil.com.
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/\t\\evil.com",
  ])(
    "rechaza %s y usa /cuenta",
    (v) => {
      expect(safeNext(v)).toBe("/cuenta");
    },
  );
});

describe("listingDbId", () => {
  it("convierte el id público en el de la tabla", () => {
    expect(listingDbId("a123")).toBe(123);
  });
  it.each(["123", "a", "a12x", "b12", "a1234567890123456"])("rechaza %s", (v) => {
    expect(listingDbId(v)).toBeNull();
  });
});

describe("cleanDisplayName", () => {
  it("normaliza espacios y respeta 2–40 caracteres", () => {
    expect(cleanDisplayName("  Iker   Surf ")).toBe("Iker Surf");
    expect(cleanDisplayName("I")).toBeNull();
    expect(cleanDisplayName("x".repeat(41))).toBeNull();
  });
});

describe("authErrorText", () => {
  it("traduce los códigos de Supabase Auth", () => {
    expect(authErrorText({ code: "otp_expired" })).toMatch(/caducado/);
    expect(authErrorText({ code: "over_email_send_rate_limit" })).toMatch(/demasiados/i);
    expect(authErrorText({ status: 429 })).toMatch(/Demasiados/);
    expect(authErrorText({ message: "boom" })).toMatch(/No ha funcionado/);
    expect(authErrorText(null)).toBe("");
  });
});

describe("verifyTurnstile (falla cerrado)", () => {
  const ok = () => Promise.resolve(new Response(JSON.stringify({ success: true })));

  it("sin clave secreta, rechaza", async () => {
    const fetchImpl = vi.fn<typeof fetch>(ok);
    expect(await verifyTurnstile("t", { secret: "", fetchImpl })).toEqual({ ok: false, reason: "not-configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sin token, rechaza sin llamar a Cloudflare", async () => {
    const fetchImpl = vi.fn<typeof fetch>(ok);
    expect(await verifyTurnstile(null, { secret: "s", fetchImpl })).toEqual({ ok: false, reason: "missing-token" });
    expect(await verifyTurnstile("x".repeat(3000), { secret: "s", fetchImpl })).toEqual({ ok: false, reason: "missing-token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("token válido: envía secreto, token e IP", async () => {
    const fetchImpl = vi.fn<typeof fetch>(ok);
    expect(await verifyTurnstile("tok", { secret: "s", ip: "1.2.3.4", fetchImpl })).toEqual({ ok: true });
    const body = fetchImpl.mock.calls[0][1]!.body as URLSearchParams;
    expect(body.get("secret")).toBe("s");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("respuesta negativa, error HTTP o de red: rechaza", async () => {
    const no = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ success: false }))));
    expect(await verifyTurnstile("t", { secret: "s", fetchImpl: no })).toEqual({ ok: false, reason: "invalid" });
    const http = vi.fn(() => Promise.resolve(new Response("", { status: 500 })));
    expect(await verifyTurnstile("t", { secret: "s", fetchImpl: http })).toEqual({ ok: false, reason: "unavailable" });
    const net = vi.fn(() => Promise.reject(new Error("offline")));
    expect(await verifyTurnstile("t", { secret: "s", fetchImpl: net })).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("verifyTurnstile: acción y dominio (SEC-4)", () => {
  const reply = (data: object) => vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(data))));
  const hostnames = ["reboard.es", "www.reboard.es"];

  it("acepta la acción y el dominio esperados", async () => {
    const fetchImpl = reply({ success: true, action: "contacto", hostname: "www.reboard.es" });
    expect(await verifyTurnstile("t", { secret: "s", action: "contacto", hostnames, fetchImpl })).toEqual({ ok: true });
  });

  it("rechaza un token resuelto en otro formulario", async () => {
    const fetchImpl = reply({ success: true, action: "reportar", hostname: "www.reboard.es" });
    expect(await verifyTurnstile("t", { secret: "s", action: "contacto", hostnames, fetchImpl })).toEqual({ ok: false, reason: "invalid" });
  });

  it("rechaza un token resuelto en otra web", async () => {
    const fetchImpl = reply({ success: true, action: "contacto", hostname: "copia-de-reboard.example" });
    expect(await verifyTurnstile("t", { secret: "s", action: "contacto", hostnames, fetchImpl })).toEqual({ ok: false, reason: "invalid" });
  });

  it("con las claves de prueba de Cloudflare no comprueba acción ni dominio (local y CI)", async () => {
    const fetchImpl = reply({ success: true, action: "", hostname: "example.com" });
    const secret = "1x0000000000000000000000000000000AA";
    expect(await verifyTurnstile("t", { secret, action: "contacto", hostnames, fetchImpl })).toEqual({ ok: true });
  });

  it("dominios permitidos a partir de la URL de la web", async () => {
    const { allowedHostnames } = await import("@/lib/security/turnstile");
    expect(allowedHostnames("https://www.reboard.es")).toEqual(["reboard.es", "www.reboard.es"]);
    expect(allowedHostnames("http://localhost:3000")).toEqual([]);
    expect(allowedHostnames(undefined)).toEqual([]);
  });
});

describe("rateLimit (SEC-5)", () => {
  it("deja pasar hasta el límite, luego 429 con Retry-After, y se reinicia con la ventana", async () => {
    const { rateLimit, resetRateLimits } = await import("@/lib/security/rate-limit");
    resetRateLimits();
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("x", "1.1.1.1", 3, 60_000, t0 + i)).toBeNull();
    const blocked = rateLimit("x", "1.1.1.1", 3, 60_000, t0 + 10_000);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBe("50");
    // Otra IP u otra API llevan su propia cuenta.
    expect(rateLimit("x", "2.2.2.2", 3, 60_000, t0 + 10_000)).toBeNull();
    expect(rateLimit("y", "1.1.1.1", 3, 60_000, t0 + 10_000)).toBeNull();
    // Pasada la ventana, vuelve a contar desde cero.
    expect(rateLimit("x", "1.1.1.1", 3, 60_000, t0 + 60_001)).toBeNull();
  });
});

describe("hasSessionCookie (PERF-4: supabase-js solo con sesión)", () => {
  it("detecta la cookie de sesión de Supabase, también troceada", async () => {
    const { hasSessionCookie } = await import("@/lib/supabase/session-hint");
    expect(hasSessionCookie("")).toBe(false);
    expect(hasSessionCookie("rb_zona=tenerife; theme=x")).toBe(false);
    expect(hasSessionCookie("sb-127-auth-token=base64-abc")).toBe(true);
    expect(hasSessionCookie("rb_zona=x; sb-abcdefgh-auth-token.0=base64-a; sb-abcdefgh-auth-token.1=b")).toBe(true);
    // El verificador PKCE no es una sesión.
    expect(hasSessionCookie("sb-abcdefgh-auth-token-code-verifier=x")).toBe(false);
  });
});
