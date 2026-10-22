// Genera .env.local para desarrollar contra Supabase LOCAL (valores de `supabase status`).
// Las claves locales son las de desarrollo por defecto de Supabase CLI, no credenciales reales.
// Uso: npm run env:local  (con `npm run db:start` antes). No sobrescribe un .env.local existente sin --force.
import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env.local") && !process.argv.includes("--force")) {
  console.error(".env.local ya existe. Usa `npm run env:local -- --force` para regenerarlo.");
  process.exit(1);
}
const out = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const env = Object.fromEntries(
  out.split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(env.API_URL ?? "")) throw new Error("Supabase local no está en marcha.");
const salt = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
writeFileSync(
  ".env.local",
  `# Generado por scripts/env-local.mjs para Supabase LOCAL. No se versiona.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=${env.API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${env.SERVICE_ROLE_KEY}
CONTACT_IP_SALT=${salt}
CRON_SECRET=local-cron-secret
# Claves de PRUEBA públicas de Cloudflare Turnstile (siempre pasan). Ver docs/SECURITY.md.
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
`,
);
console.log(".env.local creado para Supabase local .");
