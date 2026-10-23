import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/shared";
import { createUserClient } from "@/lib/supabase/server";

// Enlaces de los emails de Supabase Auth (cambio de email, invitaciones, enlace mágico…). El acceso
// normal es con el código de 6 cifras en /entrar; este enlace es la alternativa cuando el email trae
// token_hash o, en el flujo PKCE, ?code=.
const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("siguiente") ?? url.searchParams.get("next"));

  // Enlace con ?code= (flujo PKCE de Supabase): se canjea por la sesión con el verificador que guardó
  // este navegador al pedir el acceso.
  const code = url.searchParams.get("code");
  if (authEnabled() && code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  if (authEnabled() && tokenHash && type && TYPES.includes(type)) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  const fail = new URL("/entrar", request.url);
  fail.searchParams.set("error", "enlace");
  return NextResponse.redirect(fail);
}
