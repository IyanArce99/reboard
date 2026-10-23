"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminErrorText } from "@/lib/admin/auth";
import { currentModerator } from "@/lib/moderation/auth";
import { moderate } from "@/lib/moderation/service";

const Args = z.object({
  publicId: z.string().regex(/^a\d{1,15}$/),
  action: z.enum(["hide", "remove", "restore", "dismiss_reports", "resolve_reports"]),
  reason: z
    .string()
    .max(1000)
    .transform((v) => v.trim() || null),
});

export async function moderateAction(args: z.input<typeof Args>): Promise<{ ok: boolean; message: string }> {
  const a = Args.safeParse(args);
  if (!a.success) return { ok: false, message: "Petición no válida." };
  const mod = await currentModerator();
  if (!mod) return { ok: false, message: "No tienes permiso para moderar." };
  // Con la sesión del moderador (sin service role): admin_moderate_listing vuelve a comprobar el rol,
  // aplica el cambio y lo registra. No borra fotos.
  const error = await moderate(mod.sb, a.data.publicId, a.data.action, a.data.reason);
  if (error) return { ok: false, message: adminErrorText(error) };
  updateTag("listings");
  updateTag(`listing:${a.data.publicId}`);
  return { ok: true, message: "Hecho. La acción queda registrada." };
}
