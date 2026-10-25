import "server-only";

// Aviso por email de cada mensaje del formulario de contacto, por SMTP (en producción, el correo de
// Reboard en DonDominio; en local, Mailpit). El mensaje ya está guardado antes de avisar: si el
// SMTP falla o no está configurado, no se pierde (se ve en /admin/mensajes).
//
// Variables (solo servidor):
// - SMTP_HOST, SMTP_PORT (465 = SSL; 587 = STARTTLS), SMTP_USER, SMTP_PASS;
// - SMTP_FROM: remitente (por defecto, SMTP_USER);
// - CONTACT_NOTIFY_TO: a quién se avisa (por defecto, hola@reboard.es).

import nodemailer from "nodemailer";

export type NotifyResult = "sent" | "not-configured" | "failed";

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || user;
  const to = process.env.CONTACT_NOTIFY_TO || "hola@reboard.es";
  if (!host || !from || !Number.isFinite(port)) return null;
  return { host, port, user, pass, from, to };
}

export async function notifyContactMessage(m: { id: number; topicLabel: string; email: string; message: string }): Promise<NotifyResult> {
  const c = smtpConfig();
  if (!c) return "not-configured";
  try {
    const transport = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.port === 465,
      auth: c.user ? { user: c.user, pass: c.pass } : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    await transport.sendMail({
      from: { name: "Reboard", address: c.from },
      to: c.to,
      // «Responder» en el correo contesta directamente a quien escribió.
      replyTo: m.email,
      subject: `Mensaje nuevo en Reboard: ${m.topicLabel}`,
      text: [
        `Motivo: ${m.topicLabel}`,
        `Email: ${m.email}`,
        "",
        m.message,
        "",
        "—",
        `Responde a este correo para contestar. También está en el panel: /admin/mensajes (n.º ${m.id}).`,
      ].join("\n"),
    });
    return "sent";
  } catch (e) {
    console.error("[contacto] aviso por email no enviado:", e instanceof Error ? e.message : e);
    return "failed";
  }
}
