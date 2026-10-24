-- Reboard · privacidad (auditoría final, 24-10-2026: SEC-1, SEC-2 y SEC-7)
--
-- 1. Perfiles: antes cualquiera (anónimo incluido) podía listar TODOS los perfiles con su nombre y
--    fecha de alta. Ahora un perfil solo se ve si es el propio, si quien mira es de moderación o si
--    la persona tiene algún anuncio visible (lo que necesita la ficha: «Lo vende Daniel»). La fecha
--    de alta deja de ser pública.
-- 2. Registro de contactos: el vendedor veía el user_id y el hash de IP de quien pidió su teléfono.
--    Ahora solo ve qué anuncio, por qué canal y cuándo (lo que usa «Mis anuncios» para contarlos).
-- 3. Configuración: el UUID de quien editó cada ajuste (updated_by) ya no es legible.

-- ───────────── 1. Perfiles ─────────────
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (
  (select auth.uid()) = id
  or public.is_moderator()
  or exists (
    select 1 from public.listings l
    where l.seller_id = profiles.id
      and l.status in ('published', 'sold', 'expired')
      and l.moderation <> 'removed'
  )
);
revoke select (created_at) on public.profiles from anon;

-- ───────────── 2. Registro de contactos ─────────────
revoke select on public.contact_events from authenticated;
grant select (listing_id, method, created_at) on public.contact_events to authenticated;

-- ───────────── 3. Configuración ─────────────
revoke select on public.app_settings from anon, authenticated;
grant select (key, value, is_public, description, updated_at) on public.app_settings to anon, authenticated;
