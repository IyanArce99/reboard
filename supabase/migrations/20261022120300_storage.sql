-- Reboard · Storage de fotos de anuncios (docs/SECURITY.md §6)
-- Bucket público en lectura (fotos de anuncios públicos; nombres UUID no adivinables).
-- Escritura solo en la carpeta propia: {auth.uid()}/{listing_id}/{uuid}.webp
-- El cliente recodifica a WebP antes de subir (elimina EXIF y GPS). Máximo 5 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La lectura pública del bucket la sirve Storage por URL; no hace falta política de SELECT
-- para anon (y así nadie puede listar el contenido del bucket por la API).
-- El dueño sí puede listar y leer sus propios objetos (para gestionarlos).
create policy listing_photos_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy listing_photos_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    -- Segunda carpeta: id numérico de un anuncio del propio usuario
    and (storage.foldername(name))[2] ~ '^[0-9]+$'
    and exists (
      select 1 from public.listings l
      where l.id = ((storage.foldername(name))[2])::bigint and l.seller_id = (select auth.uid())));

create policy listing_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy listing_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
