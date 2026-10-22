import { describe, expect, it, vi } from "vitest";
import { authErrorText, cleanDisplayName, listingDbId, safeNext } from "@/lib/auth/shared";
import { verifyTurnstile } from "@/lib/security/turnstile";

describe("safeNext (redirección tras entrar)", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/panel")).toBe("/panel");
    expect(safeNext("/buscar?zona=asturias")).toBe("/buscar?zona=asturias");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined])(
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
  const ok = (_url?: string | URL | Request, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({ success: true })));

  it("sin clave secreta, rechaza", async () => {
    const fetchImpl = vi.fn(ok);
    expect(await verifyTurnstile("t", { secret: "", fetchImpl })).toEqual({ ok: false, reason: "not-configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sin token, rechaza sin llamar a Cloudflare", async () => {
    const fetchImpl = vi.fn(ok);
    expect(await verifyTurnstile(null, { secret: "s", fetchImpl })).toEqual({ ok: false, reason: "missing-token" });
    expect(await verifyTurnstile("x".repeat(3000), { secret: "s", fetchImpl })).toEqual({ ok: false, reason: "missing-token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("token válido: envía secreto, token e IP", async () => {
    const fetchImpl = vi.fn(ok);
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
