-- Formulario de contacto (/contacto). Los mensajes los inserta solo el servidor (service role) tras
-- comprobar Turnstile y el límite por IP; nadie puede escribir ni leer desde el navegador.
-- Los administradores los leen y los marcan como atendidos desde /admin/mensajes.
-- Conservación: 12 meses (dailyMaintenance).

create type public.contact_topic as enum ('anuncio', 'tienda', 'privacidad', 'otra');

create table public.contact_messages (
  id          bigint generated always as identity primary key,
  topic       public.contact_topic not null,
  email       text not null check (char_length(email) between 3 and 254),
  message     text not null check (char_length(message) between 10 and 2000),
  user_id     uuid references public.profiles(id) on delete set null,
  ip_hash     text check (char_length(ip_hash) <= 128),
  status      text not null default 'new' check (status in ('new', 'done')),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  handled_by  uuid references public.profiles(id) on delete set null
);

create index contact_messages_status on public.contact_messages (status, created_at desc);
create index contact_messages_ip     on public.contact_messages (ip_hash, created_at desc);
create index contact_messages_user   on public.contact_messages (user_id);
create index contact_messages_handler on public.contact_messages (handled_by);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update (status, handled_at, handled_by) on public.contact_messages to authenticated;

create policy contact_messages_admin_read on public.contact_messages
  for select to authenticated using (public.is_admin());
create policy contact_messages_admin_update on public.contact_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
