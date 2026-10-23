-- Nuevo motivo de reporte: «Fotografías que no corresponden» (docs/ADMIN.md §Reportes).
-- Va en su propia migración: un valor nuevo de un enum no se puede usar en la misma transacción
-- en la que se añade. Compatible: los motivos existentes no cambian.
alter type public.report_reason add value if not exists 'fotos' after 'datos-falsos';
