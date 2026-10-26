import { describe, expect, it } from "vitest";
import { SellerEmailInput, suggestedBuyerMessage } from "@/lib/contact/seller-email-schema";
import { SELLER_INQUIRY_SUBJECT, sellerInquiryEmail } from "@/lib/email/templates/seller-inquiry";

const ok = { name: "Ana", email: "ana@test.invalid", message: suggestedBuyerMessage("Torq Fun TET 7'2\"") };

describe("formulario «Enviar mensaje al vendedor»", () => {
  it("acepta un mensaje normal y normaliza el email", () => {
    const v = SellerEmailInput.parse({ ...ok, email: "  ANA@Test.invalid " });
    expect(v.email).toBe("ana@test.invalid");
  });
  it.each([
    [{ ...ok, name: "A" }, "name"],
    [{ ...ok, name: "Ana\r\nBcc: x@y.z" }, "name"], // nada que pueda colarse como cabecera
    [{ ...ok, name: "x".repeat(61) }, "name"],
    [{ ...ok, email: "no-es-email" }, "email"],
    [{ ...ok, email: "a@b.c\r\nBcc: x@y.z" }, "email"],
    [{ ...ok, message: "hola" }, "message"],
    [{ ...ok, message: "x".repeat(1501) }, "message"],
  ])("rechaza %#", (input, field) => {
    const r = SellerEmailInput.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path[0]).toBe(field);
  });
});

describe("email al vendedor (plantilla)", () => {
  const mail = sellerInquiryEmail({
    listingTitle: `Torq <b>Fun</b> 7'2"`,
    listingUrl: "https://www.reboard.es/anuncio/torq-a1",
    buyerName: `<script>alert("x")</script>`,
    buyerEmail: "ana@test.invalid",
    message: "Hola\n<img src=x onerror=alert(1)>",
  });
  it("asunto fijo y texto con todos los datos", () => {
    expect(mail.subject).toBe(SELLER_INQUIRY_SUBJECT);
    expect(mail.text).toContain("Nombre: <script>alert(\"x\")</script>"); // texto plano: tal cual, no se interpreta
    expect(mail.text).toContain("Email: ana@test.invalid");
    expect(mail.text).toContain("Ver anuncio en REBOARD: https://www.reboard.es/anuncio/torq-a1");
    expect(mail.text).toContain("Puedes responder directamente a este correo");
  });
  it("en HTML todo lo que escribe el comprador va escapado", () => {
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(mail.html).toContain("Torq &lt;b&gt;Fun&lt;/b&gt; 7&#39;2&quot;");
  });
});
