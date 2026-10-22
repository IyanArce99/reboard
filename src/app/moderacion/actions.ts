"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { currentModerator } from "@/lib/moderation/auth";
import { moderate } from "@/lib/moderation/service";
import { createServiceClient } from "@/lib/supabase/service";

const Args = z.object({
  publicId: z.string().regex(/^a\d{1,15}$/),
  action: z.enum(["remove", "restore", "dismiss_reports"]),
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
  try {
    // Las escrituras de moderación usan service role tras comprobar el rol; quedan en moderation_actions.
    await moderate(createServiceClient(), mod.user.id, a.data.publicId, a.data.action, a.data.reason);
  } catch (e) {
    console.error("[moderacion]", e);
    return { ok: false, message: "No se ha podido aplicar la acción." };
  }
  updateTag("listings");
  updateTag(`listing:${a.data.publicId}`);
  return { ok: true, message: "Hecho." };
}
