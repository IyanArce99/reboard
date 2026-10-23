import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/catalog/ActionForm";
import { catalogStyles as c } from "@/components/admin/catalog/forms";
import { NOTICE_MAX, parseSiteNotice } from "@/components/admin/settings/schema";
import { Notice, PageHeader, adminStyles as s, fmtDate } from "@/components/admin/ui";
import { adminErrorText, requireAdminPage } from "@/lib/admin/auth";
import { SHAPES, SHAPE_INFO, CONSTRUCTIONS, CONSTRUCTION_INFO } from "@/lib/domain/taxonomy";
import { updateMfaRequired, updateNumberSetting, updateSiteNotice } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

function Reason() {
  return (
    <label className={`${s.field} ${c.wide}`}>
      Motivo del cambio (opcional, queda en la auditoría)
      <input name="reason" maxLength={1000} autoComplete="off" />
    </label>
  );
}

export default async function AdminSettings() {
  const { sb } = await requireAdminPage("/admin/configuracion");
  const [settingsRes, mfa] = await Promise.all([
    sb.from("app_settings").select("key, value, description, updated_at"),
    sb.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (settingsRes.error) return <Notice tone="error">{adminErrorText(settingsRes.error)}</Notice>;
  const byKey = new Map((settingsRes.data ?? []).map((r) => [r.key, r]));
  const notice = parseSiteNotice(byKey.get("site_notice")?.value);
  const num = (k: string, d: number) => {
    const v = Number(byKey.get(k)?.value);
    return Number.isInteger(v) ? v : d;
  };
  const mfaRequired = byKey.get("admin_mfa_required")?.value === true;
  const aal2 = mfa.data?.currentLevel === "aal2";
  const updated = (k: string) => {
    const at = byKey.get(k)?.updated_at;
    return at ? <p className={s.small}>Último cambio: {fmtDate(at, true)}</p> : null;
  };

  return (
    <>
      <PageHeader title="Configuración" subtitle="Opciones que se cambian sin desplegar. Cada cambio queda en la auditoría." />
      <Notice>
        Las claves de Supabase, Turnstile y Resend no se gestionan aquí: viven solo en Vercel (variables de entorno del proyecto).
      </Notice>

      <section className={s.card} aria-labelledby="h-notice">
        <h2 id="h-notice" className={s.cardTitle}>
          Aviso en la web
        </h2>
        <p className={s.muted}>Una franja breve en la parte superior de todas las páginas públicas (p. ej., una incidencia o un mantenimiento).</p>
        <ActionForm action={updateSiteNotice} submitLabel="Guardar aviso" className={c.form} ariaLabel="Aviso en la web">
          <div className={c.formGrid}>
            <label className={`${s.check} ${c.wide}`}>
              <input type="checkbox" name="active" defaultChecked={notice.active} />
              Mostrar el aviso
            </label>
            <label className={`${s.field} ${c.wide}`}>
              Texto (máximo {NOTICE_MAX} caracteres)
              <textarea name="text" maxLength={NOTICE_MAX} defaultValue={notice.text} rows={2} />
            </label>
            <label className={s.field}>
              Tono
              <select name="tone" defaultValue={notice.tone}>
                <option value="info">Informativo</option>
                <option value="warning">Advertencia</option>
              </select>
            </label>
            <Reason />
          </div>
        </ActionForm>
        {updated("site_notice")}
      </section>

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="h-threshold">
          <h2 id="h-threshold" className={s.cardTitle}>
            Umbral de reportes
          </h2>
          <p className={s.muted}>Reportes abiertos con los que un anuncio pasa a «en revisión» automáticamente.</p>
          <ActionForm action={updateNumberSetting.bind(null, "report_threshold")} submitLabel="Guardar" className={c.form} ariaLabel="Umbral de reportes">
            <div className={c.formGrid}>
              <label className={s.field}>
                Reportes (1–100)
                <input type="number" name="value" required min={1} max={100} step={1} defaultValue={num("report_threshold", 3)} inputMode="numeric" />
              </label>
              <Reason />
            </div>
          </ActionForm>
          {updated("report_threshold")}
        </section>

        <section className={s.card} aria-labelledby="h-limit">
          <h2 id="h-limit" className={s.cardTitle}>
            Límite diario de reportes
          </h2>
          <p className={s.muted}>Reportes máximos por persona y día, contra el abuso.</p>
          <ActionForm action={updateNumberSetting.bind(null, "report_daily_limit")} submitLabel="Guardar" className={c.form} ariaLabel="Límite diario de reportes">
            <div className={c.formGrid}>
              <label className={s.field}>
                Reportes al día (1–100)
                <input type="number" name="value" required min={1} max={100} step={1} defaultValue={num("report_daily_limit", 10)} inputMode="numeric" />
              </label>
              <Reason />
            </div>
          </ActionForm>
          {updated("report_daily_limit")}
        </section>
      </div>

      <section className={s.card} aria-labelledby="h-mfa">
        <h2 id="h-mfa" className={s.cardTitle}>
          Segundo factor obligatorio para administradores
        </h2>
        <p className={s.muted}>
          Si lo activas, nadie entra al panel sin verificar un código TOTP. Antes debes haber activado y verificado tu propio segundo
          factor en esta sesión (<Link href="/admin/seguridad">Mi segundo factor</Link>): la base de datos rechaza el cambio si no, para
          que no te quedes fuera.
        </p>
        {!aal2 && !mfaRequired && <Notice tone="warning">Tu sesión actual no está verificada con segundo factor: no podrás activarlo todavía.</Notice>}
        <ActionForm action={updateMfaRequired} submitLabel="Guardar" className={c.form} ariaLabel="Segundo factor obligatorio">
          <div className={c.formGrid}>
            <label className={`${s.check} ${c.wide}`}>
              <input type="checkbox" name="value" defaultChecked={mfaRequired} />
              Exigir segundo factor a todos los administradores
            </label>
            <Reason />
          </div>
        </ActionForm>
        {updated("admin_mfa_required")}
      </section>

      <section className={s.card} aria-labelledby="h-tax">
        <h2 id="h-tax" className={s.cardTitle}>
          Tipos de tabla y construcciones
        </h2>
        <p className={s.muted}>
          Son fijos: forman parte de la taxonomía de la base de datos (enumerados) y de las URL públicas. Cambiarlos exige una migración
          revisada, no un interruptor aquí.
        </p>
        <p className={s.small}>
          Formas: {SHAPES.map((x) => SHAPE_INFO[x].label).join(", ")}. Construcciones: {CONSTRUCTIONS.map((x) => CONSTRUCTION_INFO[x].label).join(", ")}.
          «Principiantes» es una necesidad (litros), no una forma.
        </p>
      </section>
    </>
  );
}
