// Cuentas (fase D). Solo existen con la base de datos real: con el inventario DEMO no hay
// usuarios y los guardados viven en el dispositivo.

import "server-only";
import { dataSource } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const authEnabled = () => dataSource() === "supabase" && isSupabaseConfigured();
