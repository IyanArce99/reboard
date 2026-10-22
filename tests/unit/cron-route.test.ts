import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const SECRET = "secreto-de-cron-de-prueba-123456";

describe("/api/cron/expirar", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("REBOARD_DATA_SOURCE", "mock");
  });
  afterEach(() => vi.unstubAllEnvs());

  const call = async (auth?: string) => {
    const { GET } = await import("@/app/api/cron/expirar/route");
    return GET(new NextRequest("http://localhost/api/cron/expirar", { headers: auth ? { authorization: auth } : {} }));
  };

  it("rechaza sin cabecera, con secreto erróneo o sin CRON_SECRET configurado", async () => {
    expect((await call()).status).toBe(401);
    expect((await call(`Bearer ${SECRET}x`)).status).toBe(401);
    expect((await call(SECRET)).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
  });

  it("con el secreto correcto se ejecuta (sin base de datos, no hace nada)", async () => {
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: "sin base de datos" });
  });
});
