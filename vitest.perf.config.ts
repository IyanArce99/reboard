import { defineConfig } from "vitest/config";
import integration from "./vitest.integration.config";

// Medición de rendimiento contra Supabase LOCAL (npm run perf:local). No forma parte de CI.
export default defineConfig({
  ...integration,
  test: { ...integration.test, include: ["tests/perf/**/*.test.ts"], testTimeout: 900_000 },
});
