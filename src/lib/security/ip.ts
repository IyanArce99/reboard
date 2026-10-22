import "server-only";
import { createHmac } from "node:crypto";

// La IP nunca se guarda en claro: solo su HMAC con CONTACT_IP_SALT (secreto del servidor), que
// sirve para limitar abusos sin poder recuperar la IP (docs/SECURITY.md §5).

/** IP del cliente según las cabeceras de la plataforma (Vercel pone la real primero). */
export function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || null;
}

/** HMAC-SHA256 en hexadecimal (64 caracteres), o null si falta el secreto o la IP. */
export function ipHash(ip: string | null, salt = process.env.CONTACT_IP_SALT): string | null {
  if (!ip || !salt || salt.length < 16) return null;
  return createHmac("sha256", salt).update(ip).digest("hex");
}
