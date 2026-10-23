-- Reboard · lanzamiento solo en Canarias (docs/DECISIONS.md, «Lanzamiento solo en Canarias»).
--
-- Solo AÑADE datos y reglas: no borra zonas ni anuncios, y es reversible activando zonas.
-- 1. Las 8 islas: se añaden La Palma, La Gomera, El Hierro y La Graciosa (antes solo había 4).
-- 2. `zones.active`: territorio activo. Solo se puede publicar en zonas activas. Las zonas de la
--    península se conservan (inactivas) para ampliar más adelante: basta con activarlas aquí y
--    en `LAUNCH` (src/lib/domain/taxonomy.ts). Una zona nueva nace INACTIVA.
-- 3. Disparador: un usuario no puede crear un anuncio ni mover uno a una zona inactiva, tampoco por
--    la API REST. El servidor (service role) y las funciones del admin no tienen esta restricción.

-- ───────────── 1. Las 8 islas, y la península detrás ─────────────
insert into public.zones (slug, name, region_slug, sort_order) values
  ('la-palma',    'La Palma',    'canarias', 5),
  ('la-gomera',   'La Gomera',   'canarias', 6),
  ('el-hierro',   'El Hierro',   'canarias', 7),
  ('la-graciosa', 'La Graciosa', 'canarias', 8)
on conflict (slug) do nothing;

update public.zones set sort_order = case slug
  when 'asturias'   then 10
  when 'cantabria'  then 11
  when 'galicia'    then 12
  when 'pais-vasco' then 13
  when 'cadiz'      then 14
  else sort_order end
where region_slug is null;

-- ───────────── 2. Territorio activo ─────────────
alter table public.zones add column active boolean not null default false;
update public.zones set active = coalesce(region_slug = 'canarias', false);
comment on column public.zones.active is
  'Zona del territorio activo (lanzamiento): visible y publicable. Debe coincidir con LAUNCH en src/lib/domain/taxonomy.ts.';

-- ───────────── 3. Publicar solo en zonas activas ─────────────
create function public.listings_zone_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated'
     and (tg_op = 'INSERT' or new.zone_slug is distinct from old.zone_slug)
     and not exists (select 1 from public.zones z where z.slug = new.zone_slug and z.active) then
    raise exception 'zone_not_active' using errcode = 'P0001',
      hint = 'De momento solo se puede publicar en las zonas activas (Canarias).';
  end if;
  return new;
end $$;

create trigger t_listings_zone_guard before insert or update on public.listings
  for each row execute function public.listings_zone_guard();
