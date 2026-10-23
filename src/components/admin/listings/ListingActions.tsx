// Botones de moderación de un anuncio (ficha y reportes). Server Component: enlaza la Server Action con
// el anuncio y la acción; el servidor vuelve a validar ambos y la base de datos comprueba el permiso.

import { moderateListingAction } from "@/app/admin/anuncios/actions";
import { AdminAction } from "@/components/admin/AdminAction";
import { availableModeration, type ModerationView } from "./model";

export function ListingActions({
  publicId,
  view,
  status,
  openReports,
  quick = false,
}: {
  publicId: string;
  view: ModerationView;
  status: string;
  openReports: number;
  /** Solo las acciones rápidas de la cola de reportes (sin marcar vendido). */
  quick?: boolean;
}) {
  const can = availableModeration(view, status, openReports);
  if (quick) can.markSold = false;
  const act = (a: string) => moderateListingAction.bind(null, publicId, a);
  return (
    <>
      {can.hide && (
        <AdminAction
          label="Ocultar temporalmente"
          title={`Ocultar ${publicId} temporalmente`}
          description="Deja de verse en la web mientras se revisa. No se borran fotos ni datos y se puede restaurar."
          action={act("hide")}
        />
      )}
      {can.restore && (
        <AdminAction
          label="Restaurar"
          title={`Restaurar ${publicId}`}
          description="Vuelve a ser visible en la web (si su estado lo permite: publicado, vendido o caducado)."
          action={act("restore")}
          reason="optional"
          tone="primary"
        />
      )}
      {can.markSold && (
        <AdminAction
          label="Marcar vendido"
          title={`Marcar ${publicId} como vendido`}
          description="Úsalo solo con confirmación del vendedor o una causa clara. El anuncio deja de admitir contactos."
          action={act("mark_sold")}
        />
      )}
      {can.reports && (
        <AdminAction
          label="Resolver reportes"
          title="Marcar los reportes abiertos como resueltos"
          description="Para reportes atendidos sin cambiar el anuncio (por ejemplo, tras corregir un texto)."
          action={act("resolve_reports")}
          reason="optional"
        />
      )}
      {(can.reports || view === "flagged") && (
        <AdminAction
          label="Descartar reportes"
          title="Descartar los reportes abiertos"
          description="Los reportes no estaban justificados. Si el anuncio estaba en revisión, vuelve a visible."
          action={act("dismiss_reports")}
          reason="optional"
        />
      )}
      {can.remove && (
        <AdminAction
          label="Retirar por incumplimiento"
          title={`Retirar ${publicId} por incumplimiento`}
          description="Deja de verse y el vendedor no puede volver a publicarlo. Resuelve sus reportes abiertos. Fotos y datos se conservan para revisarlo."
          action={act("remove")}
          tone="danger"
          confirmLabel="Retirar anuncio"
        />
      )}
    </>
  );
}
