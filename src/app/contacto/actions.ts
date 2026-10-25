"use server";

// Formulario de contacto. Turnstile en el servidor (falla cerrado), límite por IP (HMAC, nunca la IP
// en claro), validación con zod y guardado con service role solo después de esas comprobaciones.
// El aviso por email se intenta después de guardar: si falla, el mensaje no se pierde.
// Solo se exportan acciones (todo lo que exporta un archivo "use server" es invocable desde el cliente).

import { headers } from "next/headers";
import { z } from "zod";
import { authEnabled } from "@/lib/auth/config";
import { ContactInput, contactTopicLabel } from "@/lib/contact/topics";
import { notifyContactMessage } from "@/lib/email/notify";
import { clientIp, ipHash } from "@/lib/security/ip";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createServiceClient } from "@/lib/supabase/service";
import { createUserClient } from "@/lib/supabase/server";

export type ContactResponse = { ok: true } | { ok: false; message: string; field?: "topic" | "email" | "message" };

/** Mensajes por IP y hora: de sobra para una persona, poco para un robot que pase el captcha. */
const PER_HOUR = 5;

const Args = ContactInput.extend({ token: z.string().max(2048).nullable() });

export async function sendContactMessageAction(args: z.input<typeof Args>): Promise<ContactResponse> {
  const a = Args.safeParse(args);
  if (!a.success) {
    const issue = a.error.issues[0];
    const field = issue?.path[0];
    return {
      ok: false,
      message: issue?.message ?? "Revisa el formulario.",
      field: field === "topic" || field === "email" || field === "message" ? field : undefined,
    };
  }
  if (!authEnabled()) return { ok: false, message: "El formulario no está disponible ahora mismo. Escríbenos a hola@reboard.es." };

  const h = await headers();
  const ip = clientIp(h);
  const captcha = await verifyTurnstile(a.data.token, { ip, action: "mensaje" });
  if (!captcha.ok) return { ok: false, message: "No hemos podido comprobar que no eres un robot. Vuelve a intentarlo." };
  const hash = ipHash(ip);
  if (!hash) {
    console.error("[contacto] falta CONTACT_IP_SALT o la IP");
    return { ok: false, message: "El formulario no está disponible ahora mismo. Escríbenos a hola@reboard.es." };
  }

  const sb = createServiceClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gte("created_at", since);
  // En local (tests e2e repetidos) todo sale de la misma IP de loopback: sin límite. En producción la IP es la real.
  const loopback = process.env.VERCEL !== "1" && (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1");
  if (!loopback && (count ?? 0) >= PER_HOUR) return { ok: false, message: "Has enviado varios mensajes en poco rato. Vuelve a intentarlo dentro de una hora." };

  // Si hay sesión, se asocia a la cuenta (ayuda a responder); nunca es obligatorio.
  const { data: auth } = await (await createUserClient()).auth.getUser();
  const { data, error } = await sb
    .from("contact_messages")
    .insert({ topic: a.data.topic, email: a.data.email, message: a.data.message, user_id: auth.user?.id ?? null, ip_hash: hash })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[contacto] no se ha guardado el mensaje:", error?.message);
    return { ok: false, message: "No hemos podido enviar el mensaje. Vuelve a intentarlo o escríbenos a hola@reboard.es." };
  }

  await notifyContactMessage({ id: data.id, topicLabel: contactTopicLabel(a.data.topic), email: a.data.email, message: a.data.message });
  return { ok: true };
}
