import "server-only";

// Envío de emails por SMTP (en producción, el correo de Reboard en DonDominio; en local, Mailpit).
// Lo usan el aviso del formulario de contacto y los mensajes de compradores a vendedores.
//
// Variables (solo servidor):
// - SMTP_HOST, SMTP_PORT (465 = SSL; 587 = STARTTLS), SMTP_USER, SMTP_PASS;
// - SMTP_FROM: remitente, una dirección del dominio de Reboard (por defecto, SMTP_USER);
// - CONTACT_NOTIFY_TO: a quién se avisa de los mensajes de /contacto (por defecto, hola@reboard.es).
//
// sendMail solo devuelve "sent" cuando el servidor SMTP acepta el mensaje: nunca se informa de un
// éxito que no ha ocurrido.

import nodemailer from "nodemailer";

export type MailResult = "sent" | "not-configured" | "failed";
/** @deprecated nombre anterior; igual que MailResult. */
export type NotifyResult = MailResult;

export interface MailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}

/** Para los tests: sustituye el transporte SMTP. */
export type Mailer = (m: MailMessage & { from: string }) => Promise<void>;

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || user;
  if (!host || !from || !Number.isFinite(port)) return null;
  return { host, port, user, pass, from };
}

/** ¿Hay SMTP configurado? (Sin él, el contacto por email no se ofrece al publicar.) */
export const mailConfigured = () => smtpConfig() != null;

/** Sin saltos de línea ni caracteres de control: nada que pueda colarse como cabecera. */
const oneLine = (s: string) => s.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").trim();

export async function sendMail(m: MailMessage, mailer?: Mailer): Promise<MailResult> {
  const c = smtpConfig();
  if (!c && !mailer) return "not-configured";
  const msg = { ...m, to: oneLine(m.to), replyTo: m.replyTo ? oneLine(m.replyTo) : undefined, subject: oneLine(m.subject) };
  try {
    if (mailer) {
      await mailer({ ...msg, from: c?.from ?? "hola@reboard.es" });
      return "sent";
    }
    const transport = nodemailer.createTransport({
      host: c!.host,
      port: c!.port,
      secure: c!.port === 465,
      auth: c!.user ? { user: c!.user, pass: c!.pass } : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    const info = await transport.sendMail({
      from: { name: "Reboard", address: c!.from },
      to: msg.to,
      replyTo: msg.replyTo,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    // Aceptado por el servidor SMTP: al menos un destinatario aceptado y ninguno rechazado.
    if (!info.accepted?.length || info.rejected?.length) return "failed";
    return "sent";
  } catch (e) {
    console.error("[email] no enviado:", e instanceof Error ? e.message : e);
    return "failed";
  }
}

export async function notifyContactMessage(m: { id: number; topicLabel: string; email: string; message: string }): Promise<MailResult> {
  return sendMail({
    to: process.env.CONTACT_NOTIFY_TO || "hola@reboard.es",
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
}
