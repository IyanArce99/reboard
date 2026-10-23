import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MfaPanel } from "@/components/admin/MfaPanel";
import { PageHeader } from "@/components/admin/ui";
import { adminContext } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Segundo factor" };

// Accesible también con la sesión pendiente de MFA (para poder verificarla).
export default async function SeguridadPage() {
  const ctx = await adminContext();
  if (ctx.status === "anon") redirect("/entrar?siguiente=/admin/seguridad");
  if (ctx.status === "none") notFound();
  const { data: required } = await ctx.sb!.from("app_settings").select("value").eq("key", "admin_mfa_required").maybeSingle();
  return (
    <>
      <PageHeader
        title="Segundo factor (MFA)"
        subtitle="Protege el panel con un código de una app de autenticación (Google Authenticator, 1Password, Aegis…). Recomendado para todos los administradores."
      />
      <MfaPanel pending={ctx.status === "needs_mfa"} required={required?.value === true} />
    </>
  );
}
