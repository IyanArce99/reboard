-- Reboard · tests: panel de administración (migración 20261025090100, docs/ADMIN.md)
-- Permisos, último admin, revocación, MFA, suspensión (incluido Storage), moderación sin borrado,
-- auditoría inmutable, reportes contra el abuso, catálogo y tiendas. Todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.invalid'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user@test.invalid'),
  ('cccccccc-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller@test.invalid');
-- Este archivo necesita ser el único admin: los admins previos de la base local pasan a 'user' dentro de la transacción.
alter table public.profiles disable trigger t_profiles_admin_guard;
update public.profiles set role = 'user' where role = 'admin';
update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
alter table public.profiles enable trigger t_profiles_admin_guard;

-- ───────── Anónimo ─────────
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is(public.admin_status(), 'none', 'anónimo: admin_status = none');
select throws_ok($$ select public.admin_stats(30) $$, '42501', null, 'anónimo: no ve las métricas');
select is((select count(*) from public.app_settings where not is_public), 0::bigint, 'anónimo: solo ve la configuración pública');

-- ───────── Usuario normal ─────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}';
select is(public.is_admin(), false, 'usuario normal: no es admin');
select throws_ok($$ select public.admin_stats(30) $$, '42501', null, 'usuario normal: no ve las métricas');
select throws_ok($$ select * from public.admin_list_users(null, null, 25, 0) $$, '42501', null, 'usuario normal: no lista usuarios');
select throws_ok($$ select public.admin_set_role('bbbbbbbb-0000-0000-0000-000000000002', 'admin', 'quiero ser admin') $$,
  '42501', null, 'usuario normal: no se concede el rol admin');
select throws_ok($$ update public.profiles set role = 'admin' where id = 'bbbbbbbb-0000-0000-0000-000000000002' $$,
  '42501', null, 'usuario normal: no puede escribir su rol directamente');
select is((select count(*) from public.admin_audit_log), 0::bigint, 'usuario normal: no lee la auditoría');
select throws_ok($$ insert into public.admin_audit_log (actor_id, action, entity_type, entity_id) values (null, 'x_x', 'user', '1') $$,
  '42501', null, 'usuario normal: no escribe en la auditoría');
select throws_ok($$ select public.admin_log(null, 'fake', 'user', '1', null, null, null) $$,
  '42501', null, 'usuario normal: no llama a admin_log');
select throws_ok($$ insert into public.brands (slug, name) values ('marca-pirata', 'Marca pirata') $$,
  '42501', null, 'usuario normal: no crea marcas');
select throws_ok($$ select public.admin_moderate_listing('a1', 'hide', 'motivo') $$,
  '42501', null, 'usuario normal: no modera');

-- El vendedor publica un anuncio (para moderación y suspensión)
-- (creado por el servidor: el recorrido de publicar se prueba en 02_listings)
reset role;
insert into public.listings (seller_id, slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
values ('cccccccc-0000-0000-0000-000000000003', 't-admin-pub', 'published', '7''0"', 84, 'evolutiva', 'pu', 'buen-estado', 200, 'lanzarote', 'Famara');
set local role authenticated;

-- ───────── Admin ─────────
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}';
select is(public.admin_status(), 'admin', 'admin sin MFA configurado: acceso');
select ok((public.admin_stats(30) ->> 'users_total')::int >= 3, 'admin: métricas reales');
select ok((select count(*) from public.admin_list_users('user@test.invalid', null, 25, 0)) = 1, 'admin: busca usuarios por email');
select throws_ok($$ select public.admin_set_role('aaaaaaaa-0000-0000-0000-000000000001', 'user', 'me quito') $$,
  'P0001', 'own_role', 'admin: no puede cambiar su propio rol');
select throws_ok($$ select public.admin_set_role('bbbbbbbb-0000-0000-0000-000000000002', 'moderator', '') $$,
  'P0001', 'reason_required', 'admin: cambiar un rol exige motivo');
select lives_ok($$ select public.admin_set_role('bbbbbbbb-0000-0000-0000-000000000002', 'moderator', 'Ayuda con la moderación') $$,
  'admin: nombra moderador');
select is((select count(*) from public.admin_audit_log where action = 'set_role' and entity_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  1::bigint, 'el cambio de rol queda en la auditoría');

-- Moderación sin borrado
select throws_ok($$ select public.admin_moderate_listing((select public_id from public.listings where slug = 't-admin-pub'), 'hide', '') $$,
  'P0001', 'reason_required', 'ocultar exige motivo');
select lives_ok($$ select public.admin_moderate_listing((select public_id from public.listings where slug = 't-admin-pub'), 'hide', 'Fotos dudosas') $$,
  'admin oculta un anuncio');
select is((select moderation::text from public.listings where slug = 't-admin-pub'), 'removed', 'oculto: no visible al público');
select is((select count(*) from public.moderation_actions m join public.listings l on l.id = m.listing_id
           where l.slug = 't-admin-pub' and m.action = 'hide'), 1::bigint, 'ocultar queda en el historial del anuncio');
select lives_ok($$ select public.admin_moderate_listing((select public_id from public.listings where slug = 't-admin-pub'), 'restore', null) $$,
  'admin restaura');
select throws_ok($$ select public.admin_update_listing((select public_id from public.listings where slug = 't-admin-pub'), '{"length_in": 90}', 'Corregir') $$,
  'P0001', null, 'las medidas del vendedor no se editan');
select lives_ok($$ select public.admin_update_listing((select public_id from public.listings where slug = 't-admin-pub'), '{"description": "Texto corregido"}', 'Datos de contacto en la descripción') $$,
  'admin corrige un texto con motivo');
select ok((select before ? 'description' and after ->> 'description' = 'Texto corregido' from public.admin_audit_log
           where action = 'edit' order by id desc limit 1), 'la edición guarda el valor anterior y el nuevo');

-- Catálogo (auditoría automática)
select lives_ok($$ select public.admin_with_reason('Alta de marca'); insert into public.brands (slug, name) values ('marca-test', 'Marca Test') $$,
  'admin crea una marca');
select is((select reason from public.admin_audit_log where entity_type = 'brand' and entity_id = 'marca-test' and action = 'insert'),
  'Alta de marca', 'crear una marca queda auditado con su motivo');
select lives_ok($$ select public.admin_merge_brands((select id from public.brands where slug = 'marca-test'),
                                                    (select id from public.brands where slug = 'torq'), 'Duplicado') $$,
  'admin fusiona un duplicado');
select is((select active from public.brands where slug = 'marca-test'), false, 'la marca fusionada queda inactiva (no se borra)');
select ok((select 'Marca Test' = any (aliases) from public.brands where slug = 'torq'), 'su nombre pasa a alias de la buena');

-- Suspensión
select throws_ok($$ select public.admin_suspend_user('aaaaaaaa-0000-0000-0000-000000000001', 'yo mismo', false) $$,
  'P0001', 'own_account', 'admin: no se suspende a sí mismo');
select is(public.admin_suspend_user('cccccccc-0000-0000-0000-000000000003', 'Estafa confirmada', true), 1,
  'suspender oculta sus anuncios publicados');

set local request.jwt.claims to '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}';
select throws_ok($$
  insert into public.listings (slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  values ('t-suspendido', 'draft', '6''0"', 72, 'fish', 'pu', 'buen-estado', 150, 'lanzarote', 'Famara') $$,
  '42501', null, 'suspendido: no publica');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner)
  values ('listing-photos', 'cccccccc-0000-0000-0000-000000000003/' || (select id from public.listings where slug = 't-admin-pub') || '/x.webp',
          'cccccccc-0000-0000-0000-000000000003') $$,
  '42501', null, 'suspendido: no sube fotos a Storage');

set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}';
select lives_ok($$ select public.admin_reactivate_user('cccccccc-0000-0000-0000-000000000003', 'Revisado: era un error') $$,
  'admin reactiva la cuenta');

-- ───────── Último admin y revocación ─────────
reset role;
select throws_ok($$ update public.profiles set role = 'user' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'P0001', 'last_admin', 'no se puede degradar al último admin');
select throws_ok($$ delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'P0001', 'last_admin', 'no se puede borrar la cuenta del último admin');

set local role authenticated;
select lives_ok($$ select public.admin_set_role('bbbbbbbb-0000-0000-0000-000000000002', 'admin', 'Segundo administrador') $$,
  'admin nombra a otro admin');
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}';
select lives_ok($$ select public.admin_set_role('aaaaaaaa-0000-0000-0000-000000000001', 'user', 'Rotación del equipo') $$,
  'el nuevo admin retira el rol al anterior');
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}';
select is(public.is_admin(), false, 'la revocación es inmediata');
select throws_ok($$ select public.admin_stats(30) $$, '42501', null, 'el admin revocado ya no ve las métricas');

-- ───────── MFA ─────────
reset role;
update public.app_settings set value = 'true' where key = 'admin_mfa_required';
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}';
select is(public.admin_status(), 'needs_mfa', 'con MFA obligatorio, una sesión sin segundo factor no es admin');
select throws_ok($$ select public.admin_stats(30) $$, '42501', null, 'sin MFA no hay acceso a los datos');
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}';
select is(public.admin_status(), 'admin', 'con sesión aal2, acceso');
reset role;
update public.app_settings set value = 'false' where key = 'admin_mfa_required';
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}';
select throws_ok($$ select public.admin_update_setting('admin_mfa_required', 'true', 'Más seguridad') $$,
  'P0001', 'mfa_session_required', 'exigir MFA solo desde una sesión con MFA (no dejarse fuera)');
select throws_ok($$ select public.admin_update_setting('report_threshold', '"tres"', 'Mal valor') $$,
  'P0001', 'invalid_value', 'la configuración se valida');

-- ───────── Auditoría inmutable ─────────
reset role;
select throws_ok($$ update public.admin_audit_log set reason = 'borrado' $$, 'P0001', null, 'la auditoría no se modifica (ni como postgres)');
select throws_ok($$ delete from public.admin_audit_log $$, 'P0001', null, 'la auditoría no se borra');

-- ───────── Reportes contra el abuso ─────────
update public.app_settings set value = '1' where key = 'report_daily_limit';
insert into public.listings (slug, status, seller_id, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
values ('t-otro-1', 'published', 'bbbbbbbb-0000-0000-0000-000000000002', '7''0"', 84, 'fish', 'pu', 'buen-estado', 200, 'lanzarote', 'Famara'),
       ('t-otro-2', 'published', 'bbbbbbbb-0000-0000-0000-000000000002', '7''0"', 84, 'fish', 'pu', 'buen-estado', 200, 'lanzarote', 'Famara');
set local role authenticated;
set local request.jwt.claims to '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}';
select throws_ok($$ insert into public.reports (listing_id, reason) values ((select id from public.listings where slug = 't-admin-pub'), 'fraude') $$,
  'P0001', 'own_listing', 'no se reporta un anuncio propio');
select lives_ok($$ insert into public.reports (listing_id, reason) values ((select id from public.listings where slug = 't-otro-1'), 'fotos') $$,
  'reporte con el nuevo motivo «fotos»');
select throws_ok($$ insert into public.reports (listing_id, reason) values ((select id from public.listings where slug = 't-otro-2'), 'otro') $$,
  'P0001', 'report_limit', 'límite diario de reportes');

-- ───────── Tiendas ─────────
reset role;
insert into public.shops (slug, name, type, zone_slug, town) values ('tienda-pendiente', 'Tienda pendiente', 'tienda', 'lanzarote', 'Famara');
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*) from public.shops where slug = 'tienda-pendiente'), 0::bigint, 'una tienda pendiente no es pública');

select * from finish();
rollback;
