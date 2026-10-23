"use server";

// Contacto y reportes desde la ficha (fase F). El número de teléfono nunca está en el HTML:
// solo se entrega aquí, tras validar Turnstile en el servidor, con límite por IP (HMAC).

import { headers } from "next/headers";
import { z } from "zod";
import { REPORT_REASON_VALUES } from "@/components/moderation/labels";
import { authEnabled } from "@/lib/auth/config";
import { revealContact } from "@/lib/moderation/service";
import { clientIp, ipHash } from "@/lib/security/ip";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createServiceClient } from "@/lib/supabase/service";
import { createUserClient } from "@/lib/supabase/server";

const PublicId = z.string().regex(/^a\d{1,15}$/);
const Token = z.string().max(2048).nullable();

export type RevealResponse = { ok: true; method: "whatsapp" | "phone"; phone: string } | { ok: false; message: string };

export async function revealContactAction(args: { publicId: string; token: string | null }): Promise<RevealResponse> {
  const a = z.object({ publicId: PublicId, token: Token }).safeParse(args);
  if (!a.success) return { ok: false, message: "No hemos podido procesar la petición. Recarga la página y vuelve a intentarlo." };
  if (!authEnabled()) return { ok: false, message: "En la demo no se muestra el contacto real." };

  const h = await headers();
  const ip = clientIp(h);
  const captcha = await verifyTurnstile(a.data.token, { ip });
  if (!captcha.ok) return { ok: false, message: "No hemos podido comprobar que no eres un robot. Vuelve a intentarlo." };
  const hash = ipHash(ip);
  if (!hash) {
    console.error("[contacto] falta CONTACT_IP_SALT o la IP");
    return { ok: false, message: "El contacto no está disponible ahora mismo." };
  }

  // Sin registro (decisión aprobada); si hay sesión, se asocia al usuario para el límite y la estadística.
  const { data: auth } = await (await createUserClient()).auth.getUser();
  const r = await revealContact(createServiceClient(), a.data.publicId, auth.user?.id ?? null, hash);
  if (r.ok) return r;
  if (r.reason === "rate-limited") return { ok: false, message: "Has pedido muchos contactos en poco rato. Vuelve a intentarlo más tarde." };
  if (r.reason === "not-found") return { ok: false, message: "Este anuncio ya no está disponible." };
  return { ok: false, message: "No hemos podido mostrar el contacto. Vuelve a intentarlo." };
}

const Report = z.object({
  publicId: PublicId,
  reason: z.enum(REPORT_REASON_VALUES),
  details: z
    .string()
    .max(1000)
    .transform((v) => v.trim() || null),
  token: Token,
});

export type ReportResponse = { ok: true } | { ok: false; message: string; login?: boolean };

/** Reportar exige sesión (decisión aprobada) y Turnstile. Tres reportes abiertos → revisión. */
export async function reportListingAction(args: z.input<typeof Report>): Promise<ReportResponse> {
  const a = Report.safeParse(args);
  if (!a.success) return { ok: false, message: "Elige un motivo. Los detalles no pueden pasar de 1.000 caracteres." };
  if (!authEnabled()) return { ok: false, message: "En la demo no se pueden enviar reportes." };

  const sb = await createUserClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false, message: "Para reportar un anuncio tienes que entrar en tu cuenta.", login: true };

  const captcha = await verifyTurnstile(a.data.token, { ip: clientIp(await headers()) });
  if (!captcha.ok) return { ok: false, message: "No hemos podido comprobar que no eres un robot. Vuelve a intentarlo." };

  const id = Number(a.data.publicId.slice(1));
  const { error } = await sb.from("reports").insert({ listing_id: id, reason: a.data.reason, details: a.data.details });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Ya has reportado este anuncio. Lo vamos a revisar." };
    // Errores de reports_guard (base de datos): anuncio propio y límite diario contra el abuso.
    if (/own_listing/.test(error.message)) return { ok: false, message: "No puedes reportar tu propio anuncio." };
    if (/report_limit/.test(error.message)) return { ok: false, message: "Has enviado muchos reportes hoy. Inténtalo mañana." };
    return { ok: false, message: "No hemos podido enviar el reporte. Vuelve a intentarlo." };
  }
  return { ok: true };
}
