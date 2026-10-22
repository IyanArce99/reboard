import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Copias de trabajo de agentes (git worktree): tienen su propio .next.
    ".claude/**",
    // Prototipo HTML de referencia (fuente de verdad del diseño, no es código de la app).
    "design/**",
    // Salidas de Playwright.
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
