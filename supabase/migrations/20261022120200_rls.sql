-- Reboard · RLS y privilegios (docs/SECURITY.md §3)
-- Supabase concede por defecto todo a anon y authenticated en el esquema public:
-- aquí se revoca y se concede solo lo necesario, por tabla y por columna.
-- service_role conserva sus privilegios (BYPASSRLS): solo lo usa el servidor.

alter table public.zones              enable row level security;
alter table public.profiles           enable row level security;
alter table public.brands             enable row level security;
alter table public.board_models       enable row level security;
alter table public.board_model_sizes  enable row level security;
alter table public.listings           enable row level security;
alter table public.listing_photos     enable row level security;
alter table public.listing_contacts   enable row level security;
alter table public.favorites          enable row level security;
alter table public.contact_events     enable row level security;
alter table public.reports            enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.shops              enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- ───────────── Lectura pública: zonas, catálogo y tiendas ─────────────
grant select on public.zones, public.brands, public.board_models, public.board_model_sizes, public.shops
  to anon, authenticated;
create policy zones_read  on public.zones             for select using (true);
create policy brands_read on public.brands            for select using (true);
create policy models_read on public.board_models      for select using (true);
create policy sizes_read  on public.board_model_sizes for select using (true);
create policy shops_read  on public.shops             for select using (true);
-- Sin políticas de escritura: catálogo y tiendas solo desde migraciones o service role.

-- ───────────── Perfiles ─────────────
-- Columnas públicas limitadas: role nunca es legible ni editable desde el cliente.
grant select (id, display_name, seller_type, created_at) on public.profiles to anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ───────────── Anuncios ─────────────
grant select on public.listings to anon, authenticated;
grant insert (slug, status, brand_id, model_id, model_size_id, brand_text, model_text, size_label,
              length_in, length_source, width_in, width_source, thickness_in, thickness_source,
              volume_l, volume_source, shape, shape_source, construction, construction_source,
              fins, accessories, condition, repairs, description, price_eur, zone_slug, town,
              contact_method)
  on public.listings to authenticated;
grant update (slug, status, brand_id, model_id, model_size_id, brand_text, model_text, size_label,
              length_in, length_source, width_in, width_source, thickness_in, thickness_source,
              volume_l, volume_source, shape, shape_source, construction, construction_source,
              fins, accessories, condition, repairs, description, price_eur, zone_slug, town,
              contact_method, confirmed_at)
  on public.listings to authenticated;
grant usage on sequence public.listing_id_seq to authenticated;
-- No concedidas: seller_id (default auth.uid()), moderation, published_at, sold_at, previous_price_eur.

create policy listings_public_read on public.listings for select
  using (status in ('published','sold','expired') and moderation <> 'removed');
create policy listings_owner_read on public.listings for select to authenticated
  using ((select auth.uid()) = seller_id);
create policy listings_moderator_read on public.listings for select to authenticated
  using (public.is_moderator());
create policy listings_insert_own on public.listings for insert to authenticated
  with check ((select auth.uid()) = seller_id and status in ('draft','published'));
create policy listings_update_own on public.listings for update to authenticated
  using ((select auth.uid()) = seller_id) with check ((select auth.uid()) = seller_id);
-- Sin DELETE: retirar = status 'withdrawn'. La moderación cambia `moderation` con service role.

-- ───────────── Fotos ─────────────
grant select on public.listing_photos to anon, authenticated;
grant insert (listing_id, storage_path, position, label, width, height),
      update (position, label),
      delete
  on public.listing_photos to authenticated;
create policy photos_read on public.listing_photos for select using (
  exists (select 1 from public.listings l where l.id = listing_id
          and ((l.status in ('published','sold','expired') and l.moderation <> 'removed')
               or l.seller_id = (select auth.uid()))));
create policy photos_insert_own on public.listing_photos for insert to authenticated with check (
  storage_path like ((select auth.uid())::text || '/' || listing_id::text || '/%')
  and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy photos_update_own on public.listing_photos for update to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy photos_delete_own on public.listing_photos for delete to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- ───────────── Contacto (privado) ─────────────
grant select, insert, update, delete on public.listing_contacts to authenticated;
create policy contacts_own on public.listing_contacts for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- ───────────── Favoritos ─────────────
grant select, delete on public.favorites to authenticated;
grant insert (listing_id) on public.favorites to authenticated;
create policy favorites_own on public.favorites for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ───────────── Registro de contactos: el vendedor ve los de sus anuncios ─────────────
grant select on public.contact_events to authenticated;
create policy contact_events_owner on public.contact_events for select to authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- ───────────── Reportes: requieren sesión (decisión aprobada) ─────────────
grant select on public.reports to authenticated;
grant insert (listing_id, reason, details) on public.reports to authenticated;
create policy reports_insert_own on public.reports for insert to authenticated with check (
  (select auth.uid()) = reporter_id and status = 'open'
  and exists (select 1 from public.listings l where l.id = listing_id
              and l.status = 'published' and l.moderation <> 'removed'));
create policy reports_read on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id or public.is_moderator());

-- ───────────── Acciones de moderación: solo moderadores ─────────────
grant select on public.moderation_actions to authenticated;
create policy modactions_read on public.moderation_actions for select to authenticated
  using (public.is_moderator());
-- Escritura con service role desde el servidor, tras comprobar is_moderator().

-- ───────────── Funciones ─────────────
-- Públicas (security invoker: aplican las RLS de quien llama)
grant execute on function public.listing_matches(public.listings, jsonb, text) to anon, authenticated;
grant execute on function public.search_listings(jsonb, text, int, int, text, text, public.listing_status[], boolean) to anon, authenticated;
grant execute on function public.count_listings(jsonb, text, public.listing_status[], boolean) to anon, authenticated;
grant execute on function public.listing_facets(jsonb) to anon, authenticated;
grant execute on function public.is_moderator() to anon, authenticated;
-- Solo servidor (service role): caducidad y revelar contacto.
grant execute on function public.expire_listings() to service_role;
grant execute on function public.reveal_contact(text, uuid, text) to service_role;

-- Que las tablas y funciones futuras no hereden privilegios para anon/authenticated sin querer.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
