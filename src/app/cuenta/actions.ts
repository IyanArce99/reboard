"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { authEnabled } from "@/lib/auth/config";
import { cleanDisplayName } from "@/lib/auth/shared";
import { deleteAccount } from "@/lib/moderation/service";
import { createServiceClient } from "@/lib/supabase/service";
import { createUserClient } from "@/lib/supabase/server";

export interface ProfileState {
  ok: boolean;
  message: string;
  name?: string;
}

const Input = z.object({ displayName: z.string().max(200) });

/** Cambia el nombre visible del usuario con sesión. RLS solo deja tocar el propio perfil. */
export async function updateDisplayName(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  if (!authEnabled()) return { ok: false, message: "Las cuentas no están activas." };
  const parsed = Input.safeParse({ displayName: form.get("displayName") });
  const name = parsed.success ? cleanDisplayName(parsed.data.displayName) : null;
  if (!name) return { ok: false, message: "El nombre debe tener entre 2 y 40 caracteres." };

  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", auth.user.id);
  if (error) return { ok: false, message: "No se ha podido guardar. Vuelve a intentarlo." };
  // El nombre aparece en las fichas de sus anuncios: se invalidan para leer el cambio ya.
  updateTag("listings");
  return { ok: true, message: "Nombre guardado.", name };
}

/** Borra la cuenta del usuario con sesión. Exige escribir «BORRAR» para evitar accidentes. */
export async function deleteAccountAction(confirm: string): Promise<{ ok: boolean; message: string }> {
  if (!authEnabled()) return { ok: false, message: "Las cuentas no están activas." };
  if (confirm.trim().toUpperCase() !== "BORRAR") return { ok: false, message: "Escribe BORRAR para confirmar." };
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Tu sesión ha caducado. Vuelve a entrar." };
  try {
    await deleteAccount(createServiceClient(), auth.user.id);
  } catch (e) {
    console.error("[cuenta] borrar", e);
    return { ok: false, message: "No se ha podido borrar la cuenta. Vuelve a intentarlo más tarde." };
  }
  await supabase.auth.signOut();
  updateTag("listings");
  return { ok: true, message: "Cuenta borrada." };
}
