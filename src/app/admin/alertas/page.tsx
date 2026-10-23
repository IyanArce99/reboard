import type { Metadata } from "next";
import { Notice, PageHeader, adminStyles as s } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Alertas" };

// Página honesta: hoy no hay alertas en el servidor, así que no hay nada que medir ni gestionar.
export default async function AdminAlerts() {
  await requireAdminPage("/admin/alertas");
  return (
    <>
      <PageHeader title="Alertas de búsqueda" subtitle="Qué hay hoy y qué haría falta para gestionarlas desde aquí." />

      <Notice>
        Las alertas se guardan solo en el navegador de cada persona (almacenamiento local del dispositivo) y nunca llegan al servidor.
        Por eso aquí no hay estadísticas, ni errores de notificación, ni emails enviados: no existen.
      </Notice>

      <section className={s.card} aria-labelledby="h-today">
        <h2 id="h-today" className={s.cardTitle}>
          Cómo funcionan hoy
        </h2>
        <ul className={s.muted} style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>Quien busca guarda los filtros como alerta; se ve en su página de Alertas, en ese mismo dispositivo.</li>
          <li>No se envía ningún aviso (ni email ni push). La web lo dice al guardar la alerta.</li>
          <li>Si borra los datos del navegador o cambia de dispositivo, la alerta desaparece.</li>
        </ul>
      </section>

      <section className={s.card} aria-labelledby="h-next">
        <h2 id="h-next" className={s.cardTitle}>
          Qué haría falta para gestionarlas aquí
        </h2>
        <ul className={s.muted} style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>Guardar las alertas en la base de datos, ligadas a la cuenta, con consentimiento explícito para recibir avisos.</li>
          <li>Un proceso que compare los anuncios nuevos con cada alerta y envíe el aviso (email transaccional), con baja en un clic.</li>
          <li>Registro de envíos y errores, para poder mostrar aquí recuentos reales.</li>
        </ul>
        <p className={s.small}>
          Está en la hoja de ruta (docs/ROADMAP.md). No se harán envíos promocionales: los avisos serían solo de las búsquedas que cada
          persona haya pedido.
        </p>
      </section>
    </>
  );
}
