import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { localSupabaseEnv } from "./tests/integration/local-supabase";

// Tests de integración contra Supabase LOCAL (`npm run db:start` antes).
// El repositorio de Supabase se ejecuta fuera de Next: next/cache y next/headers se sustituyen por stubs.
const src = fileURLToPath(new URL("./src", import.meta.url));
const stub = (f: string) => fileURLToPath(new URL(`./tests/stubs/${f}`, import.meta.url));
const local = localSupabaseEnv();

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${src}/` },
      { find: /^server-only$/, replacement: stub("server-only.ts") },
      { find: /^next\/cache$/, replacement: stub("next-cache.ts") },
      { find: /^next\/headers$/, replacement: stub("next-headers.ts") },
    ],
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 300_000,
    fileParallelism: false,
    env: {
      REBOARD_DATA_SOURCE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: local.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.anonKey,
    },
  },
});
