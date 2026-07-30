-- PR 7B: public history/profile read models and controlled media metadata.
-- Additive only: no existing product rows or storage objects are rewritten.

alter table public.players
  add column if not exists avatar_path text;

alter table public.players
  drop constraint if exists players_avatar_path_format;
alter table public.players
  add constraint players_avatar_path_format check (
    avatar_path is null
    or avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
  );

alter table public.event_photos
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint;

alter table public.event_photos
  drop constraint if exists event_photos_mime_type;
alter table public.event_photos
  add constraint event_photos_mime_type check (
    mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp')
  );
alter table public.event_photos
  drop constraint if exists event_photos_size_bytes;
alter table public.event_photos
  add constraint event_photos_size_bytes check (
    size_bytes is null or size_bytes between 1 and 8388608
  );

create or replace view public.event_attempt_details
with (security_invoker = true)
as
with visible_attempts as (
  select
    a.id attempt_id,
    a.event_id,
    a.player_id,
    a.guest_id,
    coalesce(p.display_name, g.display_name) display_name,
    p.avatar_url,
    p.avatar_path,
    (a.guest_id is not null) is_guest,
    (a.is_ak or coalesce(p.is_ak, false)) is_ak,
    a.time_hundredths,
    a.is_dnf,
    a.submitted_at,
    row_number() over (
      partition by a.event_id, a.player_id, a.guest_id
      order by a.submitted_at, a.id
    )::integer attempt_number
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  left join public.players p on p.id = a.player_id
  left join public.event_guests g on g.id = a.guest_id
  where a.status = 'approved'
    and a.deleted_at is null
),
event_bests as (
  select event_id, min(best_time_hundredths) best_time_hundredths
  from public.event_podium
  group by event_id
)
select
  va.attempt_id,
  va.event_id,
  va.player_id,
  va.guest_id,
  va.display_name,
  va.avatar_url,
  va.avatar_path,
  va.is_guest,
  va.is_ak,
  va.time_hundredths,
  va.is_dnf,
  va.submitted_at,
  va.attempt_number,
  ep.rank participant_rank,
  (
    not va.is_guest and not va.is_ak and exists (
      select 1 from public.player_pb_progression pb
      where pb.source_type = 'attempt' and pb.source_id = va.attempt_id
    )
  ) is_personal_best,
  (
    not va.is_guest and not va.is_ak and exists (
      select 1 from public.world_record_progression wr
      where wr.source_type = 'attempt' and wr.attempt_id = va.attempt_id
    )
  ) is_world_record,
  (
    not va.is_dnf and not va.is_ak
    and va.time_hundredths = eb.best_time_hundredths
  ) is_event_best
from visible_attempts va
left join public.event_podium ep
  on ep.event_id = va.event_id
  and ep.player_id is not distinct from va.player_id
  and ep.guest_id is not distinct from va.guest_id
left join event_bests eb on eb.event_id = va.event_id;

grant select on public.event_attempt_details to anon, authenticated;

create or replace view public.event_participant_statistics
with (security_invoker = true)
as
with visible_participants as (
  select
    ep.event_id,
    ep.player_id,
    null::uuid guest_id,
    p.display_name,
    p.avatar_url,
    p.avatar_path,
    false is_guest,
    p.is_ak
  from public.event_participants ep
  join public.events e on e.id = ep.event_id and e.deleted_at is null
  join public.players p on p.id = ep.player_id
  union all
  select
    g.event_id,
    null::uuid,
    g.id,
    g.display_name,
    null::text,
    null::text,
    true,
    false
  from public.event_guests g
  join public.events e on e.id = g.event_id and e.deleted_at is null
)
select
  vp.event_id,
  vp.player_id,
  vp.guest_id,
  vp.display_name,
  vp.avatar_url,
  vp.avatar_path,
  vp.is_guest,
  vp.is_ak,
  count(d.attempt_id) attempt_count,
  count(d.attempt_id) filter (where not d.is_dnf) valid_attempts,
  count(d.attempt_id) filter (where d.is_dnf) dnf_count,
  min(d.time_hundredths) filter (where not d.is_dnf) best_time_hundredths,
  round(avg(d.time_hundredths) filter (where not d.is_dnf))::integer
    average_hundredths,
  max(d.participant_rank) participant_rank
from visible_participants vp
left join public.event_attempt_details d
  on d.event_id = vp.event_id
  and d.player_id is not distinct from vp.player_id
  and d.guest_id is not distinct from vp.guest_id
group by vp.event_id, vp.player_id, vp.guest_id, vp.display_name,
  vp.avatar_url, vp.avatar_path, vp.is_guest, vp.is_ak;

grant select on public.event_participant_statistics to anon, authenticated;

create or replace view public.player_event_history
with (security_invoker = true)
as
select
  ep.player_id,
  e.id event_id,
  coalesce(nullif(trim(e.name), ''), 'Spieleabend') event_name,
  e.start_date event_date,
  min(a.time_hundredths) filter (
    where a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak
  ) best_time_hundredths,
  podium.rank,
  count(a.id) filter (
    where a.status = 'approved' and a.deleted_at is null and not a.is_ak
  ) attempt_count,
  count(a.id) filter (
    where a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak
  ) valid_attempts,
  count(a.id) filter (
    where a.status = 'approved' and a.deleted_at is null
      and a.is_dnf and not a.is_ak
  ) dnf_count
from public.event_participants ep
join public.events e on e.id = ep.event_id and e.deleted_at is null
join public.players p on p.id = ep.player_id
left join public.attempts a
  on a.event_id = ep.event_id and a.player_id = ep.player_id
left join public.event_podium podium
  on podium.event_id = ep.event_id and podium.player_id = ep.player_id
where not p.is_ak and not p.is_archived
group by ep.player_id, e.id, e.name, e.start_date, podium.rank;

grant select on public.player_event_history to anon, authenticated;

create or replace function public.admin_set_player_avatar(
  p_player_id uuid,
  p_storage_path text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_path text;
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;
  if p_storage_path !~ ('^' || p_player_id::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') then
    raise exception 'Ungültiger Avatarpfad.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'player-avatars' and name = p_storage_path
  ) then
    raise exception 'Das hochgeladene Profilbild wurde nicht gefunden.' using errcode = 'P0002';
  end if;
  select avatar_path into previous_path
  from public.players where id = p_player_id and not is_archived;
  if not found then
    raise exception 'Spieler nicht gefunden.' using errcode = 'P0002';
  end if;
  update public.players
  set avatar_path = p_storage_path, avatar_url = null
  where id = p_player_id and not is_archived;
  return previous_path;
end;
$$;

create or replace function public.admin_clear_player_avatar(p_player_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_path text;
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;
  select avatar_path into previous_path from public.players where id = p_player_id;
  if not found then
    raise exception 'Spieler nicht gefunden.' using errcode = 'P0002';
  end if;
  update public.players set avatar_path = null, avatar_url = null
  where id = p_player_id;
  return previous_path;
end;
$$;

create or replace function public.admin_register_event_photo(
  p_event_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_caption text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;
  if p_storage_path !~ ('^' || p_event_id::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
    or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_size_bytes not between 1 and 8388608 then
    raise exception 'Ungültige Fotodatei.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'event-photos' and name = p_storage_path
  ) then
    raise exception 'Das hochgeladene Eventfoto wurde nicht gefunden.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.events
    where id = p_event_id and status = 'closed' and deleted_at is null
  ) then
    raise exception 'Das Event ist nicht verfügbar oder noch aktiv.' using errcode = 'P0002';
  end if;
  insert into public.event_photos (
    event_id, storage_path, mime_type, size_bytes, caption, sort_order, created_by
  )
  values (
    p_event_id, p_storage_path, p_mime_type, p_size_bytes,
    nullif(trim(p_caption), ''),
    coalesce((select max(sort_order) + 1 from public.event_photos where event_id = p_event_id), 0),
    auth.uid()
  )
  returning id into photo_id;
  return photo_id;
end;
$$;

create or replace function public.admin_remove_event_photo(p_photo_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_path text;
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;
  delete from public.event_photos
  where id = p_photo_id
  returning storage_path into previous_path;
  if previous_path is null then
    raise exception 'Foto nicht gefunden.' using errcode = 'P0002';
  end if;
  return previous_path;
end;
$$;

create or replace function public.admin_update_event_details(
  p_event_id uuid,
  p_name text,
  p_description text,
  p_is_important boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;
  update public.events
  set name = nullif(trim(p_name), ''),
      description = nullif(trim(p_description), ''),
      is_important = p_is_important
  where id = p_event_id and deleted_at is null;
  if not found then
    raise exception 'Event nicht gefunden.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_player_avatar(uuid, text) from public;
revoke all on function public.admin_clear_player_avatar(uuid) from public;
revoke all on function public.admin_register_event_photo(uuid, text, text, bigint, text) from public;
revoke all on function public.admin_remove_event_photo(uuid) from public;
revoke all on function public.admin_update_event_details(uuid, text, text, boolean) from public;
grant execute on function public.admin_set_player_avatar(uuid, text) to authenticated;
grant execute on function public.admin_clear_player_avatar(uuid) to authenticated;
grant execute on function public.admin_register_event_photo(uuid, text, text, bigint, text) to authenticated;
grant execute on function public.admin_remove_event_photo(uuid) to authenticated;
grant execute on function public.admin_update_event_details(uuid, text, text, boolean) to authenticated;
