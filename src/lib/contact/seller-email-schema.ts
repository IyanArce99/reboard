// Formulario «Enviar mensaje al vendedor» (ficha): validación compartida por el formulario y el
// servidor. Nombre de una línea (nada que pueda colarse como cabecera), email válido y mensaje acotado.

import { z } from "zod";
import { toE164 } from "@/lib/publish/schema";

export const BUYER_NAME_MAX = 60;
export const BUYER_MESSAGE_MIN = 10;
export const BUYER_MESSAGE_MAX = 1500;

const noControl = (s: string) => !/[\u0000-\u001f\u007f]/.test(s);

export const SellerEmailInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre para que sepa quién le escribe.")
    .max(BUYER_NAME_MAX, `El nombre puede tener hasta ${BUYER_NAME_MAX} caracteres.`)
    .refine(noControl, "Escribe el nombre en una sola línea."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Ese email es demasiado largo.")
    .pipe(z.email({ message: "Revisa tu email: el vendedor te responderá ahí." })),
  /** Opcional: si lo da, el vendedor puede llamarle o escribirle por WhatsApp. Se envía en formato internacional. */
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const e164 = toE164(v);
      if (!e164) ctx.addIssue({ code: "custom", message: "Revisa el teléfono (por ejemplo, 600 000 000) o déjalo vacío." });
      return e164;
    }),
  message: z
    .string()
    .trim()
    .min(BUYER_MESSAGE_MIN, `Escribe un poco más (al menos ${BUYER_MESSAGE_MIN} caracteres).`)
    .max(BUYER_MESSAGE_MAX, `El mensaje puede tener hasta ${BUYER_MESSAGE_MAX.toLocaleString("es-ES")} caracteres.`),
});
export type SellerEmailInput = z.infer<typeof SellerEmailInput>;

/** Mensaje sugerido al abrir el formulario. */
export const suggestedBuyerMessage = (title: string) =>
  `¡Hola! He visto tu tabla ${title} en REBOARD y quería saber si sigue disponible.`;
