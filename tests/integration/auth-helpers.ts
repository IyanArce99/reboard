// Usuarios de prueba en Supabase LOCAL: acceso real con código leído de Mailpit.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { assertLocal, localSupabaseEnv } from "./local-supabase";

const MAILPIT = "http://127.0.0.1:54324";

export function anonClient() {
  const env = localSupabaseEnv();
  assertLocal(env.url);
  return createClient<Database>(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function lastCode(to: string): Promise<{ code: string; subject: string }> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const data = (await res.json()) as { messages?: { ID: string }[] };
    if (data.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${data.messages[0].ID}`)).json()) as { Subject: string; HTML: string };
      const code = /(\d{6})/.exec(msg.HTML.replace(/<[^>]+>/g, " "))?.[1];
      if (code) return { code, subject: msg.Subject };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No ha llegado ningún código a ${to}`);
}

/** Cliente con sesión iniciada para `email` (crea la cuenta si no existe). */
export async function signedInClient(email: string): Promise<{ client: SupabaseClient<Database>; userId: string }> {
  const client = anonClient();
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
  const { code } = await lastCode(email);
  const { data, error: verifyError } = await client.auth.verifyOtp({ email, token: code, type: "email" });
  if (verifyError || !data.user) throw verifyError ?? new Error("sin usuario");
  return { client, userId: data.user.id };
}

/** Borra los usuarios de prueba cuyo email empieza por `prefix` (y, en cascada, sus datos). */
export async function deleteTestUsers(sb: SupabaseClient<Database>, prefix: string) {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith(prefix) && u.email.endsWith("@reboard.test")) await sb.auth.admin.deleteUser(u.id);
  }
}
