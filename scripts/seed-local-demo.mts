// Carga el inventario DEMO en el Supabase LOCAL para desarrollar con datos (nunca en remoto:
// serviceClient() se niega a funcionar contra una URL que no sea local).
// Uso: npm run db:seed-demo [-- 100|1000]   ·  Vaciar: npm run db:reset
import { buildDemoInventory } from "../src/mocks/demo-inventory";
import { clearDemo, loadDemo } from "../tests/integration/demo-loader";
import { serviceClient } from "../tests/integration/local-supabase";

const n = Number(process.argv[2] ?? 100);
const sb = serviceClient();
await clearDemo(sb);
const map = await loadDemo(sb, buildDemoInventory(n));
console.log(`Cargados ${map.size} anuncios DEMO en Supabase local.`);
