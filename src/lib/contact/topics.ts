// Formulario de contacto (/contacto): motivos y validación, compartidos por la página, la acción
// del servidor y el panel de administración.

import { z } from "zod";

export const CONTACT_TOPICS = [
  {
    value: "anuncio",
    label: "Problema con un anuncio",
    hint: "Datos falsos, estafa, una tabla ya vendida… Si estás en el anuncio, «Reportar» nos llega con el enlace.",
  },
  {
    value: "tienda",
    label: "Soy tienda o escuela",
    hint: "Para que tus anuncios salgan como tienda o escuela, o para aparecer en el directorio.",
  },
  {
    value: "privacidad",
    label: "Mis datos y privacidad",
    hint: "Acceder, corregir o borrar tus datos. Tu cuenta la puedes borrar tú desde «Mi cuenta».",
  },
  {
    value: "otra",
    label: "Otra consulta",
    hint: "Dudas, ideas o cualquier otra cosa.",
  },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];
export const CONTACT_TOPIC_VALUES = CONTACT_TOPICS.map((t) => t.value) as [ContactTopic, ...ContactTopic[]];
export const contactTopicLabel = (v: string) => CONTACT_TOPICS.find((t) => t.value === v)?.label ?? v;

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;

export const ContactInput = z.object({
  topic: z.enum(CONTACT_TOPIC_VALUES, { message: "Elige el motivo." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Ese email es demasiado largo.")
    .pipe(z.email({ message: "Revisa el email: lo necesitamos para responderte." })),
  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN, `Cuéntanos un poco más (al menos ${MESSAGE_MIN} caracteres).`)
    .max(MESSAGE_MAX, `El mensaje no puede pasar de ${MESSAGE_MAX.toLocaleString("es-ES")} caracteres.`),
});
export type ContactInput = z.infer<typeof ContactInput>;
