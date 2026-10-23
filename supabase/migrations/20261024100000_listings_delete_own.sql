-- Eliminar un anuncio propio desde «Mis anuncios».
-- Antes solo se podía retirar (status 'withdrawn') o borrar la cuenta entera.
-- La fila arrastra en cascada fotos (filas), contacto, guardados, eventos y reportes; los archivos
-- de Storage los borra la acción del servidor (la política de Storage ya permite al dueño borrarlos).
-- No se puede eliminar un anuncio con moderación (marcado, retirado o con acciones registradas):
-- se perdería el registro de moderation_actions (on delete cascade). Ese anuncio se puede retirar.

grant delete on public.listings to authenticated;

create policy listings_delete_own on public.listings for delete to authenticated
  using (
    seller_id = (select auth.uid())
    and moderation = 'visible'
    and not exists (select 1 from public.moderation_actions m where m.listing_id = listings.id)
  );
