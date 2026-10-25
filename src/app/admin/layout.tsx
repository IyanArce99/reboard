import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminStyles } from "@/components/admin/ui";
import { adminContext } from "@/lib/admin/auth";

// Panel privado: nunca se indexa (también está bloqueado en robots.txt).
export const metadata: Metadata = {
  title: { default: "Administración", template: "%s · Admin Reboard" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * El layout decide el marco (navegación completa o mínima si falta el segundo factor). La seguridad
 * no depende de él: cada página llama a requireAdminPage() y cada acción a requireAdminAction(), y la
 * base de datos vuelve a comprobar is_admin() en cada consulta y función.
 */
async function AdminFrame({ children }: { children: React.ReactNode }) {
  const ctx = await adminContext();
  if (ctx.status === "anon") redirect("/entrar?siguiente=/admin");
  if (ctx.status === "none") notFound();
  const email = ctx.user?.email ?? "";
  if (ctx.status === "needs_mfa") {
    return (
      <AdminShell email={email} counts={{ reports: 0, messages: 0, shopsPending: 0 }} minimal>
        {children}
      </AdminShell>
    );
  }
  const [reports, shops, messages] = await Promise.all([
    ctx.sb!.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ctx.sb!.from("shops").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ctx.sb!.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  return (
    <AdminShell email={email} counts={{ reports: reports.count ?? 0, messages: messages.count ?? 0, shopsPending: shops.count ?? 0 }}>
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className={adminStyles.skeleton} aria-busy="true" />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}
