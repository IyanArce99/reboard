import { defineConfig, devices } from "@playwright/test";

// E2E contra el build de producción (`npm run build` antes).
// - `e2e`: rutas, códigos HTTP y recorridos clave. Se ejecuta en CI.
// - `visual`: capturas de referencia de las pantallas clave. Solo local (las capturas
//   dependen del sistema operativo y de las fuentes), para comparar antes y después de un cambio.
//   Se ejecutan de una en una (npm run test:visual): en paralelo, la carga produce desplazamientos
//   de subpíxel que no son cambios de diseño.
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  projects: [
    { name: "e2e", testIgnore: /visual\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "visual", testMatch: /visual\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
