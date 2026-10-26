// Plantilla del email que recibe el vendedor cuando un comprador le escribe desde su anuncio.
// Solo forma el texto: el envío está en src/lib/email/notify.ts. Todo lo que escribe el comprador
// se escapa en la versión HTML y va como texto plano en la otra.

export interface SellerInquiry {
  listingTitle: string;
  listingUrl: string;
  buyerName: string;
  buyerEmail: string;
  message: string;
}

export const SELLER_INQUIRY_SUBJECT = "Nuevo interesado en tu tabla — REBOARD";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function sellerInquiryEmail(i: SellerInquiry) {
  const text = [
    "¡Buenas!",
    "",
    "Alguien está interesado en tu tabla:",
    "",
    i.listingTitle,
    "",
    `Nombre: ${i.buyerName}`,
    `Email: ${i.buyerEmail}`,
    "",
    "Mensaje:",
    i.message,
    "",
    "Puedes responder directamente a este correo para hablar con el comprador.",
    "",
    `Ver anuncio en REBOARD: ${i.listingUrl}`,
    "",
    "Equipo REBOARD",
    "",
    "—",
    "Reboard no gestiona pagos ni envíos. Queda en persona para ver la tabla y no aceptes pagos por adelantado ni enlaces de pago.",
    "Recibes este correo porque en tu anuncio elegiste que te contacten por email. Puedes cambiarlo al editar el anuncio.",
  ].join("\n");

  const p = (s: string, style = "") => `<p style="margin:0 0 14px;${style}">${s}</p>`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EFF6F5;font-family:Arial,Helvetica,sans-serif;color:#102D3B">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border:1px solid #D6E4E3;border-radius:16px;padding:24px">
<p style="margin:0 0 18px;font-weight:800;letter-spacing:.04em;color:#087E8B">REBOARD</p>
${p("¡Buenas!")}
${p("Alguien está interesado en tu tabla:")}
${p(`<strong>${esc(i.listingTitle)}</strong>`, "font-size:18px")}
${p(`<strong>Nombre:</strong> ${esc(i.buyerName)}<br><strong>Email:</strong> ${esc(i.buyerEmail)}`)}
${p("<strong>Mensaje:</strong>", "margin-bottom:6px")}
<div style="margin:0 0 18px;padding:12px 14px;background:#EFF6F5;border-radius:10px;white-space:pre-wrap;line-height:1.5">${esc(i.message)}</div>
${p("Puedes responder directamente a este correo para hablar con el comprador.")}
<p style="margin:0 0 18px"><a href="${esc(i.listingUrl)}" style="display:inline-block;background:#F4C15A;color:#102D3B;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:12px">Ver anuncio en REBOARD</a></p>
${p("Equipo REBOARD")}
</div>
<p style="margin:16px 4px 0;font-size:12px;line-height:1.5;color:#4A6670">Reboard no gestiona pagos ni envíos. Queda en persona para ver la tabla y no aceptes pagos por adelantado ni enlaces de pago.<br>Recibes este correo porque en tu anuncio elegiste que te contacten por email. Puedes cambiarlo al editar el anuncio.</p>
</div></body></html>`;

  return { subject: SELLER_INQUIRY_SUBJECT, text, html };
}
