"use server";

// Mensajes del formulario de contacto: marcar como atendido o reabrir. requireAdminAction() + zod +
// sesión del administrador (RLS is_admin y privilegios por columna; sin service role).
// Solo se exportan acciones.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/auth";

const Args = z.object({ id: z.coerce.number().int().positive(), status: z.enum(["new", "done"]) });

export async function setContactMessageStatus(fd: FormData): Promise<void> {
  const ctx = await requireAdminAction();
  if (ctx.error) return;
  const a = Args.safeParse({ id: fd.get("id"), status: fd.get("status") });
  if (!a.success) return;
  const done = a.data.status === "done";
  await ctx.sb
    .from("contact_messages")
    .update({ status: a.data.status, handled_at: done ? new Date().toISOString() : null, handled_by: done ? ctx.user.id : null })
    .eq("id", a.data.id);
  revalidatePath("/admin/mensajes");
  revalidatePath("/admin", "layout");
}
