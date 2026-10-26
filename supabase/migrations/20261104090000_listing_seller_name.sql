-- Nombre del vendedor POR ANUNCIO («Lo vende …»).
--
-- Antes, el nombre de la ficha era el del perfil (profiles.display_name): al publicar tablas de varias
-- personas desde una misma cuenta (por ejemplo, la de Reboard, con autorización de cada vendedor),
-- cambiar el nombre para un anuncio lo cambiaba en todos. Ahora cada anuncio puede llevar su nombre;
-- si no lo tiene (anuncios anteriores), se sigue mostrando el del perfil.

alter table public.listings
  add column seller_name text
  constraint listings_seller_name_len check (seller_name is null or char_length(seller_name) between 2 and 40);

grant insert (seller_name) on public.listings to authenticated;
grant update (seller_name) on public.listings to authenticated;
