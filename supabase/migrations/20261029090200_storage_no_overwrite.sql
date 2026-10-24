-- Reboard · fotos: no se pueden sobrescribir (auditoría 24-10-2026, SEC-8).
-- Con la política de UPDATE, el dueño podía cambiar el contenido de una foto ya publicada (upsert sobre
-- la misma ruta) sin pasar por el servidor ni por moderación. La web nunca la usa: cada foto se sube
-- con un nombre nuevo (UUID, upsert: false) y finalizeListing registra las rutas; para cambiar una foto
-- se sube otra y se borra la anterior. Sin política de UPDATE, el UPDATE queda denegado por la RLS.

drop policy if exists listing_photos_owner_update on storage.objects;
