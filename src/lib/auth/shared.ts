// Utilidades de cuentas que se usan en el servidor y en el navegador.

/**
 * Destino tras entrar: solo rutas de esta web. Se rechazan caracteres de control y «\» (el navegador
 * ignora tabuladores y saltos de línea, y «/%09/evil.com» acabaría en otro dominio) y se resuelve la
 * ruta para comprobar que no sale del origen.
 */
export function safeNext(value: string | null | undefined, fallback = "/cuenta") {
  if (!value || !value.startsWith("/") || /[\u0000-\u001F\u007F\\]/.test(value)) return fallback;
  const base = "https://reboard.invalid";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base || url.pathname.startsWith("//")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
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
      return "El email o la contraseña no son correctos. Si no la recuerdas, entra con un código por email.";
    case "otp_expired":
      return "El código no es correcto o ha caducado. Comprueba que sea el último que te enviamos o pide otro.";
    case "over_email_send_rate_limit":
      return "Has pedido demasiados códigos seguidos. Espera unos minutos y vuelve a intentarlo.";
    case "over_request_rate_limit":
      return "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.";
    case "email_address_invalid":
    case "validation_failed":
      return "Ese email no parece válido. Revísalo.";
    case "captcha_failed":
      return "No hemos podido comprobar que no eres un robot. Vuelve a intentarlo.";
    case "signup_disabled":
      return "Ahora mismo no se pueden crear cuentas nuevas. Vuelve a probar más tarde.";
  }
  if (error.status === 429) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  return "No ha funcionado. Revisa tu conexión y vuelve a intentarlo.";
}
