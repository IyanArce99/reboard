import "server-only";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { authEnabled } from "@/lib/auth/config";
import { createUserClient } from "@/lib/supabase/server";

// Acceso al panel de administración (docs/ADMIN.md §Roles y permisos).
// La fuente de verdad es la base de datos: admin_status() comprueba rol admin (profiles.role, que el
// cliente no puede leer ni cambiar), cuenta no suspendida y MFA (aal2) cuando corresponde. Aquí solo
// se decide qué ver; cada consulta y cada acción vuelve a pasar por RLS o por funciones que comprueban
// is_admin() en la base de datos. El proxy y la interfaz no son la barrera de seguridad.

export type AdminStatus = "anon" | "none" | "needs_mfa" | "admin";

export async function adminContext() {
  // Todo el panel depende de la petición (sesión, hora actual): nada se prerenderiza.
  await connection();
  if (!authEnabled()) return { status: "none" as AdminStatus, sb: null, user: null };
  const sb = await createUserClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { status: "anon" as AdminStatus, sb, user: null };
  const { data: status, error } = await sb.rpc("admin_status");
  const s: AdminStatus = !error && (status === "admin" || status === "needs_mfa") ? status : "none";
  return { status: s, sb, user: data.user };
}

/** Para páginas: anónimo → entrar; sin permiso → 404 (no se revela el panel); falta MFA → /admin/seguridad. */
export async function requireAdminPage(path = "/admin") {
  const ctx = await adminContext();
  if (ctx.status === "anon") redirect(`/entrar?siguiente=${encodeURIComponent(path)}`);
  if (ctx.status === "none") notFound();
  if (ctx.status === "needs_mfa") redirect("/admin/seguridad");
  return { sb: ctx.sb!, user: ctx.user! };
}

export type AdminActionResult = { ok: true; message: string } | { ok: false; message: string };

type UserClient = Awaited<ReturnType<typeof createUserClient>>;
type AuthUser = NonNullable<Awaited<ReturnType<UserClient["auth"]["getUser"]>>["data"]["user"]>;
export type AdminActionContext = { error: AdminActionResult } | { error?: undefined; sb: UserClient; user: AuthUser };

/** Para Server Actions: devuelve el contexto o un error listo para mostrar. Nunca confía en el cliente. */
export async function requireAdminAction(): Promise<AdminActionContext> {
  const ctx = await adminContext();
  if (ctx.status !== "admin") {
    return {
      error: {
        ok: false,
        message:
          ctx.status === "needs_mfa"
            ? "Verifica tu segundo factor para continuar."
            : "No tienes permiso para hacer esto. Vuelve a entrar.",
      } satisfies AdminActionResult,
    };
  }
  return { sb: ctx.sb!, user: ctx.user! };
}

// Errores de las funciones de la base de datos → mensajes para el administrador.
const DB_ERRORS: [RegExp, string][] = [
  [/forbidden|permission denied|42501/i, "No tienes permiso para hacer esto."],
  [/reason_required/, "Indica el motivo (al menos 3 caracteres): queda en la auditoría."],
  [/own_role/, "No puedes cambiar tu propio rol: debe hacerlo otro administrador."],
  [/own_account/, "No puedes suspender tu propia cuenta."],
  [/last_admin/, "Debe quedar al menos un administrador activo."],
  [/not_found/, "No existe o ya no está disponible."],
  [/not_published/, "Solo se puede marcar como vendido un anuncio publicado."],
  [/field_not_editable/, "Ese campo no se puede editar desde el panel (las medidas son del vendedor)."],
  [/same_brand/, "Elige dos marcas distintas."],
  [/target_merged/, "La marca de destino ya está fusionada en otra."],
  [/source_required/, "Para verificar un modelo hace falta la fuente (tabla del fabricante)."],
  [/mfa_session_required/, "Activa y verifica tu segundo factor antes de exigirlo a todos."],
  [/invalid_value|invalid_status|invalid_action/, "El valor no es válido."],
  [/unknown_setting/, "Esa opción no existe."],
  [/duplicate key|23505/, "Ya existe un registro con ese identificador (slug o etiqueta)."],
  [/violates check constraint|23514/, "Algún valor está fuera de los límites permitidos."],
];

export function adminErrorText(error: { message?: string; code?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ""} ${error?.code ?? ""}`;
  for (const [re, msg] of DB_ERRORS) if (re.test(text)) return msg;
  if (error) console.error("[admin]", error.message, error.code);
  return "No se ha podido guardar. Vuelve a intentarlo.";
}
