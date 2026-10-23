#!/usr/bin/env node
// Asigna el rol de administrador de Reboard a UN usuario existente (docs/ADMIN.md §Primer admin).
//
// Seguro e idempotente:
// - El usuario se indica explícitamente: --user <uuid> o --email <email> (el email debe estar verificado).
//   Nunca se elige «el primer usuario» ni por dominio de correo.
// - Si ya es admin, no cambia nada.
// - Sin --confirm solo muestra lo que haría.
// - Contra una URL que no sea local exige además --remote y escribir el ref del proyecto.
// - Queda en la auditoría (admin_audit_log, acción grant_admin_bootstrap).
//
// Variables: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY. Solo en tu terminal:
// la clave service role nunca se guarda en el repositorio ni se pega en un chat.
//
// Uso local:      node scripts/grant-admin.mjs --email tu@correo.es --confirm
// Uso remoto:     SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//                 node scripts/grant-admin.mjs --email tu@correo.es --remote <ref> --confirm

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name) => args.includes(`--${name}`);

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno de esta terminal.");

const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);
if (!local) {
  const ref = arg("remote");
  if (!ref) fail(`La URL ${url} no es local. Para producción añade --remote <ref del proyecto>.`);
  if (!url.startsWith(`https://${ref}.supabase.co`)) fail(`--remote ${ref} no coincide con ${url}.`);
}

const userId = arg("user");
const email = arg("email")?.trim().toLowerCase();
if (!!userId === !!email) fail("Indica exactamente uno: --user <uuid> o --email <email verificado>.");
if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) fail("--user no es un UUID válido.");

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser() {
  if (userId) {
    const { data, error } = await sb.auth.admin.getUserById(userId);
    if (error || !data.user) fail(`No existe ningún usuario con id ${userId}.`);
    return data.user;
  }
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`No se han podido leer los usuarios: ${error.message}`);
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 1000) break;
  }
  fail(`No existe ningún usuario con el email ${email}. Primero tiene que entrar una vez en la web.`);
}

const user = await findUser();
if (!user.email_confirmed_at) fail(`El email de ${user.email} no está verificado: que entre una vez con su código.`);

const { data: profile, error: pErr } = await sb.from("profiles").select("id, role, suspended_at").eq("id", user.id).single();
if (pErr || !profile) fail("El usuario no tiene perfil (¿se creó antes de las migraciones?).");
if (profile.suspended_at) fail("La cuenta está suspendida: reactívala antes de darle el rol admin.");

console.log(`Destino: ${user.email} (${user.id}) · rol actual: ${profile.role} · ${local ? "Supabase LOCAL" : `REMOTO ${url}`}`);
if (profile.role === "admin") {
  console.log("✓ Ya es administrador. No se cambia nada.");
  process.exit(0);
}
if (!flag("confirm")) {
  console.log("Simulación: añade --confirm para asignar el rol admin.");
  process.exit(0);
}

const { error: uErr } = await sb.from("profiles").update({ role: "admin" }).eq("id", user.id);
if (uErr) fail(`No se ha podido asignar el rol: ${uErr.message}`);
const { error: aErr } = await sb.rpc("admin_log", {
  p_actor: null,
  p_action: "grant_admin_bootstrap",
  p_entity_type: "role",
  p_entity_id: user.id,
  p_reason: "Asignación inicial con scripts/grant-admin.mjs",
  p_before: { role: profile.role },
  p_after: { role: "admin" },
});
if (aErr) console.warn(`! Rol asignado, pero no se ha podido escribir la auditoría: ${aErr.message}`);
console.log(`✓ ${user.email} ya es administrador. Siguiente paso recomendado: /admin/seguridad para activar el segundo factor.`);
