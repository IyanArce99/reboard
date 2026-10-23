import { defineConfig, devices } from "@playwright/test";

// E2E del panel de administración contra Supabase LOCAL (sesiones reales, códigos de Mailpit).
// Requisitos: `npm run db:start`, `.env.local` de Supabase local (`npm run env:local`) y `npm run build`.
// No se ejecuta en CI hasta que haya Supabase allí (docs/ADMIN.md §Tests).
const PORT = 3210;

export default defineConfig({
  testDir: "tests/e2e-admin",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "admin-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "admin-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
