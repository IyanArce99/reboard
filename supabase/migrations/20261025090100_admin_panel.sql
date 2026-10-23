-- Reboard · panel de administración (docs/ADMIN.md)
--
-- Compatible y no destructiva: solo añade columnas con valor por defecto, tablas, funciones,
-- políticas y disparadores. No borra filas ni columnas. Para revertirla, ver docs/ADMIN.md §Migraciones.
--
-- Principios:
-- - El rol de la aplicación vive en public.profiles.role (no en user_metadata): el cliente no puede
--   leerlo ni cambiarlo (privilegios por columna, comprobado en pgTAP). Nada que ver con service_role.
-- - is_admin() exige rol admin, cuenta no suspendida y, si el admin tiene un segundo factor o la
--   configuración lo pide, sesión con MFA (aal2). Todas las comprobaciones se hacen en la base de datos.
-- - Las acciones administrativas son funciones SECURITY DEFINER que comprueban el permiso, aplican el
--   cambio y escriben la auditoría en la misma transacción.
-- - Ocultar o retirar un anuncio NO borra fotos ni datos del vendedor (antes, retirar borraba fotos).

-- ═══════════════ Configuración editable sin despliegue ═══════════════
create table public.app_settings (
  key         text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value       jsonb not null,
  is_public   boolean not null default false,
  description text check (char_length(description) <= 300),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

insert into public.app_settings (key, value, is_public, description) values
  ('site_notice', '{"active": false, "text": "", "tone": "info"}', true,
   'Mensaje informativo en la parte superior de la web'),
  ('report_threshold', '3', false,
   'Reportes abiertos con los que un anuncio pasa a «en revisión»'),
  ('report_daily_limit', '10', false,
   'Reportes máximos por usuario y día (contra el abuso)'),
  ('admin_mfa_required', 'false', false,
   'Exigir segundo factor (TOTP) a todos los administradores')
on conflict (key) do nothing;

create function public.setting_int(p_key text, p_default int) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select (s.value #>> '{}')::int from public.app_settings s where s.key = p_key), p_default);
$$;

create function public.setting_bool(p_key text, p_default boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (s.value #>> '{}')::boolean from public.app_settings s where s.key = p_key), p_default);
$$;

-- ═══════════════ Suspensión de cuentas ═══════════════
-- Sin claves foráneas en suspended_by: el dato se conserva aunque se borre la cuenta del admin.
alter table public.profiles
  add column suspended_at      timestamptz,
  add column suspension_reason text check (char_length(suspension_reason) <= 1000),
  add column suspended_by      uuid;

create index profiles_staff on public.profiles (role) where role <> 'user';
create index profiles_suspended on public.profiles (suspended_at) where suspended_at is not null;

-- ═══════════════ Permisos ═══════════════
-- 'none' | 'needs_mfa' (admin, pero falta verificar el segundo factor) | 'admin'
create function public.admin_status() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin' and p.suspended_at is null) then 'none'
    when (public.setting_bool('admin_mfa_required', false)
          or exists (select 1 from auth.mfa_factors f
                     where f.user_id = (select auth.uid()) and f.status = 'verified'))
         and coalesce((select auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' then 'needs_mfa'
    else 'admin'
  end;
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.admin_status() = 'admin';
$$;

-- Moderadores: rol moderator no suspendido, o admin con sesión válida.
create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'moderator' and p.suspended_at is null)
    or public.is_admin();
$$;

create function public.is_suspended() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.suspended_at is not null);
$$;

-- Nunca quedarse sin administradores activos (degradar, suspender o borrar al último).
create function public.profiles_admin_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and old.suspended_at is null
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.suspended_at is not null)
     and not exists (select 1 from public.profiles p
                     where p.role = 'admin' and p.suspended_at is null and p.id <> old.id) then
    raise exception 'last_admin' using errcode = 'P0001', hint = 'Debe quedar al menos un administrador activo.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger t_profiles_admin_guard before update of role, suspended_at or delete on public.profiles
  for each row execute function public.profiles_admin_guard();

-- ═══════════════ Auditoría (solo inserción) ═══════════════
create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,                                  -- sin FK: se conserva aunque se borre la cuenta
  action      text not null check (action ~ '^[a-z_]{2,60}$'),
  entity_type text not null check (entity_type in
                ('user','listing','report','brand','model','model_size','shop','setting','role')),
  entity_id   text not null check (char_length(entity_id) between 1 and 80),
  reason      text check (char_length(reason) <= 1000),
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index audit_recent on public.admin_audit_log (created_at desc);
create index audit_entity on public.admin_audit_log (entity_type, entity_id, created_at desc);
create index audit_actor  on public.admin_audit_log (actor_id, created_at desc);

create function public.audit_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'admin_audit_log is append-only' using errcode = 'P0001';
end $$;

create trigger t_audit_immutable before update or delete on public.admin_audit_log
  for each row execute function public.audit_immutable();
create trigger t_audit_no_truncate before truncate on public.admin_audit_log
  for each statement execute function public.audit_immutable();

-- Escribir en la auditoría. Las funciones SECURITY DEFINER la llaman con auth.uid(); el servidor
-- (service role) la usa para lo que hace con la API de Auth (suspender el acceso).
create function public.admin_log(p_actor uuid, p_action text, p_entity_type text, p_entity_id text,
                                 p_reason text, p_before jsonb, p_after jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, reason, before, after)
  values (p_actor, p_action, p_entity_type, p_entity_id, nullif(btrim(p_reason), ''), p_before, p_after);
$$;

-- Auditoría automática del catálogo, las tiendas y la configuración cuando escribe un usuario.
-- El motivo, si lo hay, llega en la variable de transacción reboard.reason (admin_with_reason()).
create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_type text := tg_argv[0];
  v_id text := coalesce(case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> tg_argv[1], '?');
begin
  if (select auth.uid()) is null then
    return null;                                   -- migraciones y service role: sin auditoría de fila
  end if;
  perform public.admin_log((select auth.uid()), lower(tg_op), v_type, v_id,
    current_setting('reboard.reason', true),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return null;
end $$;

-- ═══════════════ Catálogo: marcas ═══════════════
alter table public.brands
  add column active      boolean  not null default true,
  add column featured    boolean  not null default false,
  add column sort_order  smallint not null default 0 check (sort_order between 0 and 999),
  add column aliases     text[]   not null default '{}' check (cardinality(aliases) <= 30),
  add column merged_into bigint references public.brands(id) on delete set null,
  add column updated_at  timestamptz not null default now();

create trigger t_brands_touch before update on public.brands
  for each row execute function public.touch_updated_at();

-- Marcas destacadas del formulario de publicación (antes, fijas en el código): editables en /admin/catalogo.
update public.brands b set featured = true, sort_order = v.ord
from (values ('torq', 1), ('nsp', 2), ('softech', 3), ('firewire', 4), ('channel-islands', 5), ('lost', 6),
             ('pukas', 7), ('js-industries', 8), ('pyzel', 9), ('catch-surf', 10), ('olaian', 11), ('bic', 12))
  as v(slug, ord)
where b.slug = v.slug;

create index brands_publish on public.brands (featured desc, sort_order, name) where active;

-- ═══════════════ Catálogo: modelos ═══════════════
alter table public.board_models
  add column active       boolean not null default true,
  add column verification text not null default 'unverified' check (verification in ('unverified','verified')),
  add column verified_at  timestamptz,
  add column verified_by  uuid,
  add column updated_at   timestamptz not null default now(),
  add constraint verified_has_source check (verification = 'unverified' or coalesce(btrim(source_note), '') <> '');

create trigger t_models_touch before update on public.board_models
  for each row execute function public.touch_updated_at();

-- ═══════════════ Tiendas y escuelas: verificación ═══════════════
-- Las existentes se consideran aprobadas (las cargó el equipo). Las nuevas entran como pendientes.
alter table public.shops
  add column status        text not null default 'approved'
                             check (status in ('pending','approved','rejected','suspended')),
  add column status_reason text check (char_length(status_reason) <= 1000),
  add column reviewed_at   timestamptz,
  add column reviewed_by   uuid,
  add column updated_at    timestamptz not null default now();
alter table public.shops alter column status set default 'pending';

create trigger t_shops_touch before update on public.shops
  for each row execute function public.touch_updated_at();

-- ═══════════════ Moderación de anuncios ═══════════════
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check check (action in
  ('flag','remove','restore','dismiss_reports','hide','resolve_reports','mark_sold','edit'));

create index listings_moderation on public.listings (moderation, updated_at desc) where moderation <> 'visible';
create index listings_created on public.listings (created_at desc);

-- Umbral de reportes configurable (antes, fijo en 3).
create or replace function public.reports_autoflag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where listing_id = new.listing_id and status = 'open')
       >= public.setting_int('report_threshold', 3) then
    update public.listings set moderation = 'flagged'
    where id = new.listing_id and moderation = 'visible';
  end if;
  return new;
end $$;

-- Contra el abuso: no se reporta un anuncio propio ni se pasa del límite diario.
-- (Un reporte por persona y anuncio ya lo garantiza unique (listing_id, reporter_id).)
create function public.reports_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.listings l where l.id = new.listing_id and l.seller_id = new.reporter_id) then
    raise exception 'own_listing' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reports r
      where r.reporter_id = new.reporter_id and r.created_at > now() - interval '1 day')
       >= public.setting_int('report_daily_limit', 10) then
    raise exception 'report_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger t_reports_guard before insert on public.reports
  for each row execute function public.reports_guard();

-- ═══════════════ RLS y privilegios nuevos ═══════════════
alter table public.app_settings    enable row level security;
alter table public.admin_audit_log enable row level security;
revoke all on public.app_settings, public.admin_audit_log from anon, authenticated;

grant select on public.app_settings to anon, authenticated;
create policy settings_read on public.app_settings for select using (is_public or public.is_admin());

grant select on public.admin_audit_log to authenticated;
create policy audit_read on public.admin_audit_log for select to authenticated using (public.is_admin());

-- Usuarios suspendidos: no publican, no editan, no suben fotos y no reportan.
drop policy listings_insert_own on public.listings;
create policy listings_insert_own on public.listings for insert to authenticated
  with check ((select auth.uid()) = seller_id and status in ('draft','published') and not public.is_suspended());
drop policy listings_update_own on public.listings;
create policy listings_update_own on public.listings for update to authenticated
  using ((select auth.uid()) = seller_id) with check ((select auth.uid()) = seller_id and not public.is_suspended());
drop policy reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated with check (
  (select auth.uid()) = reporter_id and status = 'open' and not public.is_suspended()
  and exists (select 1 from public.listings l where l.id = listing_id
              and l.status = 'published' and l.moderation <> 'removed'));
drop policy listing_photos_owner_insert on storage.objects;
create policy listing_photos_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] ~ '^[0-9]+$'
    and not public.is_suspended()
    and exists (
      select 1 from public.listings l
      where l.id = ((storage.foldername(name))[2])::bigint and l.seller_id = (select auth.uid())));

-- Moderación: ve las fotos (filas) de anuncios ocultos o retirados para poder revisarlos.
drop policy photos_read on public.listing_photos;
create policy photos_read on public.listing_photos for select using (
  public.is_moderator() or exists (
    select 1 from public.listings l where l.id = listing_id
      and ((l.status in ('published','sold','expired') and l.moderation <> 'removed')
           or l.seller_id = (select auth.uid()))));

-- Catálogo: la lectura sigue siendo pública (también lo inactivo, para que un anuncio ya publicado
-- conserve su marca y modelo); la app filtra lo activo y verificado donde corresponde. Escritura: solo admin.

grant insert (slug, name, intro, logo_path, active, featured, sort_order, aliases),
      update (slug, name, intro, logo_path, active, featured, sort_order, aliases)
  on public.brands to authenticated;
create policy brands_admin_insert on public.brands for insert to authenticated with check (public.is_admin());
create policy brands_admin_update on public.brands for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert (brand_id, slug, name, shape, construction, description, source_note, active),
      update (brand_id, slug, name, shape, construction, description, source_note, active)
  on public.board_models to authenticated;
create policy models_admin_insert on public.board_models for insert to authenticated with check (public.is_admin());
create policy models_admin_update on public.board_models for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert (model_id, label, length_in, width_in, thickness_in, volume_l, sort_order),
      update (label, length_in, width_in, thickness_in, volume_l, sort_order),
      delete
  on public.board_model_sizes to authenticated;
create policy sizes_admin_insert on public.board_model_sizes for insert to authenticated with check (public.is_admin());
create policy sizes_admin_update on public.board_model_sizes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy sizes_admin_delete on public.board_model_sizes for delete to authenticated using (public.is_admin());
grant usage on sequence public.brands_id_seq, public.board_models_id_seq, public.board_model_sizes_id_seq,
  public.shops_id_seq to authenticated;

-- Tiendas: el público solo ve las aprobadas; el admin las gestiona.
drop policy shops_read on public.shops;
create policy shops_read on public.shops for select using (status = 'approved' or public.is_admin());
grant insert (slug, name, type, zone_slug, town, address, hours, inventory_source),
      update (slug, name, type, zone_slug, town, address, hours, inventory_source)
  on public.shops to authenticated;
create policy shops_admin_insert on public.shops for insert to authenticated with check (public.is_admin());
create policy shops_admin_update on public.shops for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create trigger t_brands_audit after insert or update or delete on public.brands
  for each row execute function public.audit_row_change('brand', 'slug');
create trigger t_models_audit after insert or update or delete on public.board_models
  for each row execute function public.audit_row_change('model', 'slug');
create trigger t_sizes_audit after insert or update or delete on public.board_model_sizes
  for each row execute function public.audit_row_change('model_size', 'id');
create trigger t_shops_audit after insert or update or delete on public.shops
  for each row execute function public.audit_row_change('shop', 'slug');

-- ═══════════════ Funciones administrativas ═══════════════
-- Todas: SECURITY DEFINER, comprueban el permiso en la primera línea y auditan en la misma transacción.

create function public.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select auth.uid());
end $$;

-- Motivo para la auditoría automática de las escrituras siguientes de la transacción.
create function public.admin_with_reason(p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  perform set_config('reboard.reason', left(coalesce(p_reason, ''), 1000), true);
end $$;

-- Panel: métricas reales. Sin mensajes ni ventas (no hay instrumentación fiable).
create function public.admin_stats(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_from timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 365));
begin
  perform public.require_admin();
  return jsonb_build_object(
    'days', least(greatest(p_days, 1), 365),
    'users_total', (select count(*) from auth.users),
    'users_new', (select count(*) from auth.users u where u.created_at >= v_from),
    'users_suspended', (select count(*) from public.profiles p where p.suspended_at is not null),
    'listings_active', (select count(*) from public.listings l where l.status = 'published' and l.moderation = 'visible'),
    'listings_flagged', (select count(*) from public.listings l where l.moderation = 'flagged'),
    'listings_hidden', (select count(*) from public.listings l where l.moderation = 'removed'),
    'listings_sold', (select count(*) from public.listings l where l.status = 'sold'),
    'listings_new', (select count(*) from public.listings l where l.published_at >= v_from),
    'reports_open', (select count(*) from public.reports r where r.status = 'open'),
    'shops_pending', (select count(*) from public.shops s where s.status = 'pending'),
    'listings_per_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'n', d.n) order by d.day), '[]')
      from (select date_trunc('day', l.published_at)::date as day, count(*) as n
            from public.listings l where l.published_at >= v_from group by 1) d),
    'users_per_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'n', d.n) order by d.day), '[]')
      from (select date_trunc('day', u.created_at)::date as day, count(*) as n
            from auth.users u where u.created_at >= v_from group by 1) d)
  );
end $$;

-- Usuarios: listado paginado con email (de auth.users), sin teléfonos ni otros datos.
create function public.admin_list_users(p_search text default null, p_status text default null,
                                        p_limit int default 25, p_offset int default 0)
returns table (id uuid, email text, display_name text, role public.user_role, seller_type public.seller_type,
               created_at timestamptz, last_sign_in_at timestamptz, suspended_at timestamptz,
               listings_total bigint, listings_active bigint, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, p.display_name, p.role, p.seller_type, u.created_at, u.last_sign_in_at,
           p.suspended_at,
           coalesce(c.total, 0), coalesce(c.active, 0),
           count(*) over ()
    from auth.users u
    join public.profiles p on p.id = u.id
    left join lateral (
      select count(*) as total, count(*) filter (where l.status = 'published' and l.moderation = 'visible') as active
      from public.listings l where l.seller_id = u.id) c on true
    where (v_q is null or u.email ilike '%' || v_q || '%' or u.id::text = v_q)
      and (p_status is null
           or (p_status = 'suspended' and p.suspended_at is not null)
           or (p_status = 'active' and p.suspended_at is null)
           or (p_status = 'staff' and p.role <> 'user'))
    order by u.created_at desc
    limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create function public.admin_get_user(p_user uuid)
returns table (id uuid, email text, email_confirmed boolean, display_name text, role public.user_role,
               seller_type public.seller_type, created_at timestamptz, last_sign_in_at timestamptz,
               banned_until timestamptz, suspended_at timestamptz, suspension_reason text, has_mfa boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, u.email_confirmed_at is not null, p.display_name, p.role, p.seller_type,
           u.created_at, u.last_sign_in_at, u.banned_until, p.suspended_at, p.suspension_reason,
           exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified')
    from auth.users u join public.profiles p on p.id = u.id
    where u.id = p_user;
end $$;

-- Rol: nunca el propio (evita quitarse el acceso por accidente); el disparador protege al último admin.
create function public.admin_set_role(p_user uuid, p_role public.user_role, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
  v_old public.user_role;
begin
  if p_user = v_actor then
    raise exception 'own_role' using errcode = 'P0001', hint = 'Otro administrador debe cambiar tu rol.';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select role into v_old from public.profiles where id = p_user for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old = p_role then return; end if;
  update public.profiles set role = p_role where id = p_user;
  perform public.admin_log(v_actor, 'set_role', 'role', p_user::text, p_reason,
    jsonb_build_object('role', v_old), jsonb_build_object('role', p_role));
end $$;

-- Suspender: el acceso lo corta además el servidor con la API de Auth (ban); aquí, datos, RLS y auditoría.
create function public.admin_suspend_user(p_user uuid, p_reason text, p_hide_listings boolean default false)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
  v_hidden int := 0;
  r record;
begin
  if p_user = v_actor then
    raise exception 'own_account' using errcode = 'P0001';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.profiles
    set suspended_at = now(), suspension_reason = btrim(p_reason), suspended_by = v_actor
    where id = p_user and suspended_at is null;
  if not found then
    if not exists (select 1 from public.profiles where id = p_user) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    return 0;                                           -- ya estaba suspendido
  end if;
  if p_hide_listings then
    for r in select l.id from public.listings l
             where l.seller_id = p_user and l.moderation <> 'removed' and l.status <> 'draft' loop
      update public.listings set moderation = 'removed' where id = r.id;
      insert into public.moderation_actions (listing_id, moderator_id, action, reason)
        values (r.id, v_actor, 'hide', 'Cuenta suspendida: ' || btrim(p_reason));
      v_hidden := v_hidden + 1;
    end loop;
  end if;
  perform public.admin_log(v_actor, 'suspend', 'user', p_user::text, p_reason, null,
    jsonb_build_object('hidden_listings', v_hidden));
  return v_hidden;
end $$;

create function public.admin_reactivate_user(p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
begin
  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.profiles set suspended_at = null, suspension_reason = null, suspended_by = null
    where id = p_user and suspended_at is not null;
  if found then
    perform public.admin_log(v_actor, 'reactivate', 'user', p_user::text, p_reason, null, null);
  end if;
end $$;

-- Anuncios: moderación. Ninguna acción borra fotos ni datos del vendedor.
--   hide            → oculto temporalmente (moderation 'removed', registro 'hide')
--   remove          → retirado por incumplimiento ('removed', registro 'remove'), resuelve sus reportes
--   restore         → visible otra vez
--   mark_sold       → vendido (solo si está publicado)
--   dismiss_reports → descarta los reportes abiertos y, si estaba en revisión, vuelve a visible
--   resolve_reports → marca los reportes abiertos como resueltos sin cambiar el anuncio
create function public.admin_moderate_listing(p_public_id text, p_action text, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  l public.listings;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_action = 'mark_sold' then
    perform public.require_admin();
  elsif not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('hide','remove','restore','mark_sold','dismiss_reports','resolve_reports') then
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;
  if p_action in ('hide','remove','mark_sold') and coalesce(char_length(v_reason), 0) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into l from public.listings where public_id = p_public_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  if p_action in ('hide','remove') then
    update public.listings set moderation = 'removed' where id = l.id;
    if p_action = 'remove' then
      update public.reports set status = 'resolved', resolved_at = now(), resolved_by = v_actor
        where listing_id = l.id and status = 'open';
    end if;
  elsif p_action = 'restore' then
    update public.listings set moderation = 'visible' where id = l.id;
  elsif p_action = 'mark_sold' then
    if l.status <> 'published' then raise exception 'not_published' using errcode = 'P0001'; end if;
    update public.listings set status = 'sold' where id = l.id;
  elsif p_action = 'dismiss_reports' then
    update public.reports set status = 'dismissed', resolved_at = now(), resolved_by = v_actor
      where listing_id = l.id and status = 'open';
    update public.listings set moderation = 'visible' where id = l.id and moderation = 'flagged';
  else
    update public.reports set status = 'resolved', resolved_at = now(), resolved_by = v_actor
      where listing_id = l.id and status = 'open';
  end if;

  insert into public.moderation_actions (listing_id, moderator_id, action, reason)
    values (l.id, v_actor, p_action, v_reason);
  perform public.admin_log(v_actor, p_action, 'listing', l.public_id, v_reason,
    jsonb_build_object('status', l.status, 'moderation', l.moderation),
    (select jsonb_build_object('status', x.status, 'moderation', x.moderation) from public.listings x where x.id = l.id));
end $$;

-- Anuncios: corrección de textos con causa administrativa. Las medidas NO se tocan.
create function public.admin_update_listing(p_public_id text, p_patch jsonb, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
  l public.listings;
  v_before jsonb := '{}';
  v_after jsonb := '{}';
  k text;
begin
  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('description','repairs','town','fins','accessories','brand_text','model_text') then
      raise exception 'field_not_editable: %', k using errcode = 'P0001';
    end if;
  end loop;
  select * into l from public.listings where public_id = p_public_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  update public.listings set
    description = case when p_patch ? 'description' then nullif(p_patch->>'description', '') else description end,
    repairs     = case when p_patch ? 'repairs'     then nullif(p_patch->>'repairs', '')     else repairs end,
    town        = case when p_patch ? 'town'        then p_patch->>'town'                    else town end,
    fins        = case when p_patch ? 'fins'        then nullif(p_patch->>'fins', '')        else fins end,
    accessories = case when p_patch ? 'accessories' then nullif(p_patch->>'accessories', '') else accessories end,
    brand_text  = case when p_patch ? 'brand_text'  then nullif(p_patch->>'brand_text', '')  else brand_text end,
    model_text  = case when p_patch ? 'model_text'  then nullif(p_patch->>'model_text', '')  else model_text end
  where id = l.id;

  for k in select jsonb_object_keys(p_patch) loop
    v_before := v_before || jsonb_build_object(k, to_jsonb(l) -> k);
    v_after := v_after || jsonb_build_object(k, p_patch -> k);
  end loop;
  insert into public.moderation_actions (listing_id, moderator_id, action, reason) values (l.id, v_actor, 'edit', p_reason);
  perform public.admin_log(v_actor, 'edit', 'listing', l.public_id, p_reason, v_before, v_after);
end $$;

-- Marcas: fusionar un duplicado en otra (anuncios y modelos pasan a la buena; la otra queda inactiva).
create function public.admin_merge_brands(p_from bigint, p_into bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
  f public.brands;
  t public.brands;
  v_listings int;
  v_models int;
begin
  if p_from = p_into then raise exception 'same_brand' using errcode = 'P0001'; end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into f from public.brands where id = p_from for update;
  select * into t from public.brands where id = p_into for update;
  if f.id is null or t.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if t.merged_into is not null then raise exception 'target_merged' using errcode = 'P0001'; end if;

  update public.listings set brand_id = t.id where brand_id = f.id;
  get diagnostics v_listings = row_count;
  update public.board_models set brand_id = t.id where brand_id = f.id;
  get diagnostics v_models = row_count;
  update public.brands set
    aliases = (select coalesce(array_agg(distinct a), '{}') from unnest(t.aliases || f.aliases || array[f.name]) a
               where a is not null and lower(a) <> lower(t.name))
  where id = t.id;
  update public.brands set active = false, featured = false, merged_into = t.id where id = f.id;
  perform public.admin_log(v_actor, 'merge', 'brand', f.slug, p_reason,
    jsonb_build_object('from', f.slug), jsonb_build_object('into', t.slug, 'listings', v_listings, 'models', v_models));
end $$;

-- Modelos: verificar exige fuente (tabla del fabricante). Quitar la verificación también se audita.
create function public.admin_set_model_verification(p_model bigint, p_verified boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
  m public.board_models;
begin
  select * into m from public.board_models where id = p_model for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_verified and coalesce(btrim(m.source_note), '') = '' then
    raise exception 'source_required' using errcode = 'P0001';
  end if;
  update public.board_models set
    verification = case when p_verified then 'verified' else 'unverified' end,
    verified_at = case when p_verified then now() else null end,
    verified_by = case when p_verified then v_actor else null end
  where id = p_model;
  perform public.admin_log(v_actor, case when p_verified then 'verify' else 'unverify' end, 'model', m.slug, p_reason,
    jsonb_build_object('verification', m.verification),
    jsonb_build_object('verification', case when p_verified then 'verified' else 'unverified' end));
end $$;

-- Tiendas: estado de verificación (pendiente, aprobada, rechazada, suspendida).
create function public.admin_set_shop_status(p_shop bigint, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
  s public.shops;
begin
  if p_status not in ('pending','approved','rejected','suspended') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if p_status in ('rejected','suspended') and coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into s from public.shops where id = p_shop for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  update public.shops set status = p_status, status_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    reviewed_at = now(), reviewed_by = v_actor where id = p_shop;
  perform public.admin_log(v_actor, 'set_status', 'shop', s.slug, p_reason,
    jsonb_build_object('status', s.status), jsonb_build_object('status', p_status));
end $$;

-- Configuración: cada clave se valida. Exigir MFA solo desde una sesión con MFA (no dejarse fuera).
create function public.admin_update_setting(p_key text, p_value jsonb, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := public.require_admin();
  v_old jsonb;
begin
  select value into v_old from public.app_settings where key = p_key for update;
  if not found then raise exception 'unknown_setting' using errcode = 'P0001'; end if;

  if p_key = 'site_notice' then
    if jsonb_typeof(p_value) <> 'object' or jsonb_typeof(p_value->'active') <> 'boolean'
       or jsonb_typeof(p_value->'text') <> 'string' or char_length(p_value->>'text') > 280
       or coalesce(p_value->>'tone', '') not in ('info','warning') then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  elsif p_key in ('report_threshold','report_daily_limit') then
    if jsonb_typeof(p_value) <> 'number' or (p_value #>> '{}')::numeric not between 1 and 100
       or (p_value #>> '{}')::numeric <> trunc((p_value #>> '{}')::numeric) then
      raise exception 'invalid_value' using errcode = 'P0001';
    end if;
  elsif p_key = 'admin_mfa_required' then
    if jsonb_typeof(p_value) <> 'boolean' then raise exception 'invalid_value' using errcode = 'P0001'; end if;
    if (p_value #>> '{}')::boolean and coalesce((select auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' then
      raise exception 'mfa_session_required' using errcode = 'P0001',
        hint = 'Activa y verifica tu segundo factor antes de exigirlo a todos.';
    end if;
  end if;

  update public.app_settings set value = p_value, updated_at = now(), updated_by = v_actor where key = p_key;
  perform public.admin_log(v_actor, 'update', 'setting', p_key, p_reason, v_old, p_value);
end $$;

-- ═══════════════ Privilegios de las funciones ═══════════════
grant execute on function public.admin_status(), public.is_admin(), public.is_suspended() to anon, authenticated;
grant execute on function public.is_moderator() to anon, authenticated;
grant execute on function
  public.admin_with_reason(text),
  public.admin_stats(int),
  public.admin_list_users(text, text, int, int),
  public.admin_get_user(uuid),
  public.admin_set_role(uuid, public.user_role, text),
  public.admin_suspend_user(uuid, text, boolean),
  public.admin_reactivate_user(uuid, text),
  public.admin_moderate_listing(text, text, text),
  public.admin_update_listing(text, jsonb, text),
  public.admin_merge_brands(bigint, bigint, text),
  public.admin_set_model_verification(bigint, boolean, text),
  public.admin_set_shop_status(bigint, text, text),
  public.admin_update_setting(text, jsonb, text)
  to authenticated;
-- Solo el servidor escribe en la auditoría fuera de estas funciones (p. ej., tras usar la API de Auth).
revoke execute on function public.admin_log(uuid, text, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.admin_log(uuid, text, text, text, text, jsonb, jsonb) to service_role;
revoke execute on function public.setting_int(text, int), public.setting_bool(text, boolean),
  public.require_admin(), public.audit_row_change(), public.audit_immutable(),
  public.profiles_admin_guard(), public.reports_guard() from public, anon, authenticated;
