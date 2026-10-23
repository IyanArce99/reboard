// Utilidades de cuentas que se usan en el servidor y en el navegador.

/** Destino tras entrar: solo rutas internas (evita redirecciones abiertas). */
export function safeNext(value: string | null | undefined, fallback = "/cuenta") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Id público de un anuncio («a123») → id de la tabla listings, o null. */
export function listingDbId(publicId: string): number | null {
  const m = /^a(\d{1,15})$/.exec(publicId);
  return m ? Number(m[1]) : null;
}

/** Nombre visible: el mismo límite que el CHECK de profiles.display_name. */
export function cleanDisplayName(raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim();
  return v.length >= 2 && v.length <= 40 ? v : null;
}

/** Mensajes de error de Supabase Auth en español (los códigos son estables; los textos no). */
export function authErrorText(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  if (!error) return "";
  switch (error.code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "otp_expired":
      return "El código ha caducado o no es correcto. Pide uno nuevo.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Has pedido demasiados códigos. Espera unos minutos y vuelve a intentarlo.";
    case "email_address_invalid":
    case "validation_failed":
      return "Revisa el email: no parece válido.";
    case "captcha_failed":
      return "No hemos podido comprobar que no eres un robot. Vuelve a intentarlo.";
    case "signup_disabled":
      return "Ahora mismo no se pueden crear cuentas nuevas.";
  }
  if (error.status === 429) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  return "No ha funcionado. Revisa tu conexión y vuelve a intentarlo.";
}
