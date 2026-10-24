-- Reboard · reveal_contact: el contacto solo se registra si hay teléfono (auditoría 24-10-2026, QA-3).
-- Antes se insertaba el contact_event y después se buscaba el teléfono: si el anuncio no tenía
-- teléfono, el comprador veía «no disponible» pero el contador del vendedor subía igual.
-- Misma firma, mismos permisos (create or replace conserva el grant a service_role).

create or replace function public.reveal_contact(p_public_id text, p_user uuid, p_ip_hash text)
returns table (method public.contact_method, phone_e164 text)
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  v_phone text;
begin
  select * into l from public.listings
  where public_id = p_public_id and status = 'published' and moderation <> 'removed';
  if not found then
    return;
  end if;
  if p_ip_hash is null or char_length(p_ip_hash) < 16 then
    raise exception 'ip_hash required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.contact_events
      where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  select c.phone_e164 into v_phone from public.listing_contacts c where c.listing_id = l.id;
  if v_phone is null then
    return;
  end if;
  insert into public.contact_events (listing_id, user_id, ip_hash, method)
  values (l.id, p_user, p_ip_hash, l.contact_method);
  return query select l.contact_method, v_phone;
end $$;
