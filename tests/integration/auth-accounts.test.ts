// Cuentas (fase D) contra Supabase LOCAL: acceso con código por email (leído de Mailpit),
// plantilla en español, perfil propio y guardados bajo RLS.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listingDbId } from "@/lib/auth/shared";
import type { Database } from "@/lib/supabase/database.types";
import { buildDemoInventory } from "../fixtures/demo-inventory";
import { clearDemo, loadDemo } from "./demo-loader";
import { assertLocal, localSupabaseEnv, serviceClient } from "./local-supabase";

const env = localSupabaseEnv();
const MAILPIT = "http://127.0.0.1:54324";
const sb = serviceClient();
const run = Date.now().toString(36);
const emailA = `cuenta-a-${run}@reboard.test`;
const emailB = `cuenta-b-${run}@reboard.test`;
let listingIds: string[] = [];

function anon() {
  assertLocal(env.url);
  return createClient<Database>(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function lastMail(to: string) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const data = (await res.json()) as { messages?: { ID: string; Subject: string }[] };
    if (data.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${data.messages[0].ID}`)).json()) as { Subject: string; HTML: string };
      return msg;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No ha llegado ningún email a ${to}`);
}

async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = anon();
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  expect(error).toBeNull();
  const mail = await lastMail(email);
  expect(mail.Subject).toBe("Tu código de Reboard");
  const code = /(\d{6})/.exec(mail.HTML.replace(/<[^>]+>/g, " "))?.[1];
  expect(code, "el email trae un código de 6 cifras").toBeTruthy();
  const { data, error: verifyError } = await client.auth.verifyOtp({ email, token: code!, type: "email" });
  expect(verifyError).toBeNull();
  expect(data.user?.email).toBe(email);
  return client;
}

async function deleteUsers() {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@reboard.test") && u.email.startsWith("cuenta-")) await sb.auth.admin.deleteUser(u.id);
  }
}

beforeAll(async () => {
  await deleteUsers();
  await clearDemo(sb);
  const map = await loadDemo(sb, buildDemoInventory(20));
  listingIds = [...map.values()];
});

afterAll(async () => {
  await deleteUsers();
  await clearDemo(sb);
});

describe("acceso con código", () => {
  it("un código usado no sirve dos veces y uno inventado se rechaza", async () => {
    const client = anon();
    await client.auth.signInWithOtp({ email: emailB, options: { shouldCreateUser: true } });
    const mail = await lastMail(emailB);
    const code = /(\d{6})/.exec(mail.HTML.replace(/<[^>]+>/g, " "))![1];
    const wrong = code === "000000" ? "111111" : "000000";
    const bad = await client.auth.verifyOtp({ email: emailB, token: wrong, type: "email" });
    expect(bad.error?.code).toBe("otp_expired");
    const ok = await client.auth.verifyOtp({ email: emailB, token: code, type: "email" });
    expect(ok.error).toBeNull();
    const again = await anon().auth.verifyOtp({ email: emailB, token: code, type: "email" });
    expect(again.error).not.toBeNull();
  });
});

describe("cuenta y guardados", () => {
  let a: SupabaseClient<Database>;
  let userA: string;

  beforeAll(async () => {
    a = await signIn(emailA);
    userA = (await a.auth.getUser()).data.user!.id;
  });

  it("al entrar por primera vez se crea el perfil con nombre por defecto", async () => {
    const { data } = await a.from("profiles").select("display_name, seller_type").eq("id", userA).single();
    expect(data).toEqual({ display_name: "Surfista", seller_type: "particular" });
    // El rol no es legible por el usuario (privilegios por columna); se comprueba como servicio.
    const hidden = await a.from("profiles").select("role").eq("id", userA);
    expect(hidden.error).not.toBeNull();
    const { data: admin } = await sb.from("profiles").select("role").eq("id", userA).single();
    expect(admin?.role).toBe("user");
  });

  it("cambia su nombre visible, pero no su rol ni el perfil de otro", async () => {
    const { error } = await a.from("profiles").update({ display_name: "Iker" }).eq("id", userA);
    expect(error).toBeNull();
    const role = await a.from("profiles").update({ role: "admin" } as never).eq("id", userA);
    expect(role.error).not.toBeNull();

    const b = await signIn(`cuenta-c-${run}@reboard.test`);
    const userB = (await b.auth.getUser()).data.user!.id;
    const other = await b.from("profiles").update({ display_name: "Intruso" }).eq("id", userA).select();
    expect(other.data ?? []).toHaveLength(0);
    const { data } = await sb.from("profiles").select("display_name").eq("id", userA).single();
    expect(data?.display_name).toBe("Iker");
    expect(userB).not.toBe(userA);
  });

  it("guarda anuncios (fusión idempotente) y solo ve los suyos", async () => {
    const ids = listingIds.slice(0, 3).map((id) => listingDbId(id)!);
    expect(ids.every((n) => Number.isInteger(n))).toBe(true);

    // Lo que hace UserStateProvider al entrar: upsert sin duplicados de los guardados del dispositivo.
    for (let i = 0; i < 2; i++) {
      const { error } = await a
        .from("favorites")
        .upsert(
          ids.map((listing_id) => ({ listing_id })),
          { onConflict: "user_id,listing_id", ignoreDuplicates: true },
        );
      expect(error).toBeNull();
    }
    const mine = await a.from("favorites").select("listing_id");
    expect(mine.data?.map((r) => r.listing_id).sort()).toEqual([...ids].sort());

    const stranger = await signIn(`cuenta-d-${run}@reboard.test`);
    const theirs = await stranger.from("favorites").select("listing_id");
    expect(theirs.data).toEqual([]);
    // No puede guardar a nombre de otro.
    const forged = await stranger.from("favorites").insert({ listing_id: ids[0], user_id: userA } as never);
    expect(forged.error).not.toBeNull();

    const del = await a.from("favorites").delete().eq("listing_id", ids[0]);
    expect(del.error).toBeNull();
    const after = await a.from("favorites").select("listing_id");
    expect(after.data).toHaveLength(2);
  });

  it("sin sesión no se leen ni escriben guardados", async () => {
    const guest = anon();
    const read = await guest.from("favorites").select("listing_id");
    expect(read.error ?? read.data?.length).toBeTruthy();
    const write = await guest.from("favorites").insert({ listing_id: listingDbId(listingIds[0])! });
    expect(write.error).not.toBeNull();
  });
});
