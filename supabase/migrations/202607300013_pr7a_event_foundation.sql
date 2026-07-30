-- PR 7A: additive event history, soft-delete and storage foundation.
-- No product rows are deleted or rewritten by this migration.

alter table public.events
  add column if not exists description text,
  add column if not exists is_important boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

alter table public.events
  drop constraint if exists events_description_length;
alter table public.events
  add constraint events_description_length check (
    description is null or char_length(trim(description)) between 1 and 2000
  );

create index if not exists events_public_history_idx
  on public.events (start_date desc, started_at desc)
  where deleted_at is null;
create index if not exists events_trash_idx
  on public.events (deleted_at desc)
  where deleted_at is not null;

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on update cascade on delete restrict,
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  ),
  caption text check (
    caption is null or char_length(trim(caption)) between 1 and 300
  ),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists event_photos_event_idx
  on public.event_photos (event_id, sort_order, created_at);

alter table public.event_photos enable row level security;

drop policy if exists event_photos_public_read on public.event_photos;
create policy event_photos_public_read on public.event_photos
for select to anon, authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id and (e.deleted_at is null or public.is_admin())
  )
);

drop policy if exists event_photos_admin_insert on public.event_photos;
create policy event_photos_admin_insert on public.event_photos
for insert to authenticated
with check (
  public.is_admin()
  and created_by = auth.uid()
  and split_part(storage_path, '/', 1) = event_id::text
);

drop policy if exists event_photos_admin_update on public.event_photos;
create policy event_photos_admin_update on public.event_photos
for update to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and split_part(storage_path, '/', 1) = event_id::text
);

drop policy if exists event_photos_admin_delete on public.event_photos;
create policy event_photos_admin_delete on public.event_photos
for delete to authenticated using (public.is_admin());

grant select on public.event_photos to anon, authenticated;
grant insert, update, delete on public.event_photos to authenticated;

-- Public reads exclude an event and all of its dependent rows after soft-delete.
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
for select to anon, authenticated
using (deleted_at is null or public.is_admin());

drop policy if exists attempts_public_read on public.attempts;
create policy attempts_public_read on public.attempts
for select to anon, authenticated
using (
  public.is_admin()
  or (
    status = 'approved'
    and deleted_at is null
    and (
      event_id is null
      or exists (
        select 1 from public.events e
        where e.id = event_id and e.deleted_at is null
      )
    )
  )
);

drop policy if exists event_participants_public_read on public.event_participants;
create policy event_participants_public_read on public.event_participants
for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.events e
    where e.id = event_id and e.deleted_at is null
  )
);

drop policy if exists event_guests_public_read on public.event_guests;
create policy event_guests_public_read on public.event_guests
for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.events e
    where e.id = event_id and e.deleted_at is null
  )
);

-- Storage buckets are public-readable only through the policies below.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'player-avatars',
  'player-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
), (
  'event-photos',
  'event-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists player_avatars_public_read on storage.objects;
create policy player_avatars_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'player-avatars');

drop policy if exists player_avatars_admin_insert on storage.objects;
create policy player_avatars_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'player-avatars'
  and public.is_admin()
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1 from public.players p
    where p.id::text = split_part(name, '/', 1)
  )
);

drop policy if exists player_avatars_admin_update on storage.objects;
create policy player_avatars_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'player-avatars' and public.is_admin())
with check (
  bucket_id = 'player-avatars'
  and public.is_admin()
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1 from public.players p
    where p.id::text = split_part(name, '/', 1)
  )
);

drop policy if exists player_avatars_admin_delete on storage.objects;
create policy player_avatars_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'player-avatars' and public.is_admin());

drop policy if exists event_photos_public_storage_read on storage.objects;
create policy event_photos_public_storage_read on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'event-photos'
  and exists (
    select 1 from public.events e
    where e.id::text = split_part(name, '/', 1)
      and (e.deleted_at is null or public.is_admin())
  )
);

drop policy if exists event_photos_admin_storage_insert on storage.objects;
create policy event_photos_admin_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'event-photos'
  and public.is_admin()
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1 from public.events e
    where e.id::text = split_part(name, '/', 1)
  )
);

drop policy if exists event_photos_admin_storage_update on storage.objects;
create policy event_photos_admin_storage_update on storage.objects
for update to authenticated
using (bucket_id = 'event-photos' and public.is_admin())
with check (
  bucket_id = 'event-photos'
  and public.is_admin()
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
);

drop policy if exists event_photos_admin_storage_delete on storage.objects;
create policy event_photos_admin_storage_delete on storage.objects
for delete to authenticated
using (bucket_id = 'event-photos' and public.is_admin());

create or replace function public.admin_soft_delete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.';
  end if;

  update public.events
  set deleted_at = now(), deleted_by = auth.uid()
  where id = p_event_id and deleted_at is null and status = 'closed';

  if not found then
    if exists (
      select 1 from public.events where id = p_event_id and status = 'active'
    ) then
      raise exception 'Ein laufendes Event muss vor dem Löschen beendet werden.';
    end if;
    raise exception 'Event wurde nicht gefunden oder liegt bereits im Papierkorb.';
  end if;
end;
$$;

create or replace function public.admin_restore_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.';
  end if;

  update public.events
  set deleted_at = null, deleted_by = null
  where id = p_event_id and deleted_at is not null;

  if not found then
    raise exception 'Event wurde nicht im Papierkorb gefunden.';
  end if;
end;
$$;

create or replace function public.admin_prepare_event_purge(p_event_id uuid)
returns table (photo_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.';
  end if;
  if not exists (
    select 1 from public.events
    where id = p_event_id and deleted_at is not null and status = 'closed'
  ) then
    raise exception 'Nur Events aus dem Papierkorb können endgültig gelöscht werden.';
  end if;

  return query
  select ep.storage_path
  from public.event_photos ep
  where ep.event_id = p_event_id
  order by ep.sort_order, ep.created_at;
end;
$$;

create or replace function public.admin_finalize_event_purge(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.';
  end if;
  if not exists (
    select 1 from public.events
    where id = p_event_id and deleted_at is not null and status = 'closed'
  ) then
    raise exception 'Nur Events aus dem Papierkorb können endgültig gelöscht werden.';
  end if;
  if exists (
    select 1 from public.event_photos where event_id = p_event_id
  ) then
    raise exception 'Eventfotos müssen vor dem endgültigen Löschen entfernt werden.';
  end if;

  update public.events
  set winner_player_id = null, winner_guest_id = null
  where id = p_event_id;
  delete from public.attempts where event_id = p_event_id;
  delete from public.event_participants where event_id = p_event_id;
  delete from public.event_guests where event_id = p_event_id;
  delete from public.events where id = p_event_id;
end;
$$;

revoke all on function public.admin_soft_delete_event(uuid) from public;
revoke all on function public.admin_restore_event(uuid) from public;
revoke all on function public.admin_prepare_event_purge(uuid) from public;
revoke all on function public.admin_finalize_event_purge(uuid) from public;
grant execute on function public.admin_soft_delete_event(uuid) to authenticated;
grant execute on function public.admin_restore_event(uuid) to authenticated;
grant execute on function public.admin_prepare_event_purge(uuid) to authenticated;
grant execute on function public.admin_finalize_event_purge(uuid) to authenticated;

create or replace view public.event_podium
with (security_invoker = true)
as
with participant_bests as (
  select
    a.event_id,
    a.player_id,
    a.guest_id,
    coalesce(p.display_name, g.display_name) display_name,
    p.avatar_url,
    (a.guest_id is not null) is_guest,
    min(a.time_hundredths) best_time_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  left join public.players p on p.id = a.player_id
  left join public.event_guests g on g.id = a.guest_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_dnf
    and not a.is_ak
    and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  group by a.event_id, a.player_id, a.guest_id,
    coalesce(p.display_name, g.display_name), p.avatar_url,
    (a.guest_id is not null)
)
select
  event_id,
  player_id,
  guest_id,
  display_name,
  avatar_url,
  is_guest,
  best_time_hundredths,
  dense_rank() over (
    partition by event_id order by best_time_hundredths
  )::integer rank
from participant_bests;

grant select on public.event_podium to anon, authenticated;

-- Existing views retain their established column names, types and order.
create or replace view public.event_winners
with (security_invoker = true)
as
select
  ep.event_id,
  ep.player_id,
  ep.display_name,
  ep.best_time_hundredths winning_time_hundredths,
  ep.guest_id,
  ep.is_guest
from public.event_podium ep
where ep.rank = 1;

create or replace view public.event_statistics
with (security_invoker = true)
as
select e.id event_id,
  (
    (select count(*) from public.event_participants ep where ep.event_id = e.id)
    + (select count(*) from public.event_guests eg where eg.event_id = e.id)
  ) participant_count,
  count(a.id) filter (
    where not a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ) valid_attempts,
  count(a.id) filter (
    where a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ) dnf_count,
  min(a.time_hundredths) filter (
    where not a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ) fastest_hundredths,
  round(avg(a.time_hundredths) filter (
    where not a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ))::integer average_hundredths
from public.events e
left join public.attempts a on a.event_id = e.id
  and a.status = 'approved' and a.deleted_at is null
left join public.players p on p.id = a.player_id
where e.deleted_at is null
group by e.id;

create or replace view public.public_hall_of_fame
with (security_invoker = true)
as
with valid_attempts as (
  select p.id player_id, p.display_name, p.avatar_url,
    a.time_hundredths, a.submitted_at::date achieved_date
  from public.players p
  join public.attempts a on a.player_id = p.id
  left join public.events e on e.id = a.event_id
  where not p.is_ak and not p.is_archived and not a.is_ak
    and a.status = 'approved' and not a.is_dnf
    and a.time_hundredths is not null and a.deleted_at is null
    and (a.event_id is null or e.deleted_at is null)
  union all
  select p.id, p.display_name, p.avatar_url,
    h.time_hundredths, h.attempt_date
  from public.players p join public.historical_attempts h on h.player_id = p.id
  where not p.is_ak and not p.is_archived and not h.is_guest
    and not h.out_of_competition and h.deleted_at is null
), personal_bests as (
  select player_id, display_name, avatar_url,
    min(time_hundredths) personal_best_hundredths
  from valid_attempts group by player_id, display_name, avatar_url
), ranked_players as (
  select *, dense_rank() over (order by personal_best_hundredths)::integer rank
  from personal_bests
)
select rp.player_id, rp.display_name, rp.avatar_url,
  rp.personal_best_hundredths, min(va.achieved_date) record_date, rp.rank
from ranked_players rp
join valid_attempts va on va.player_id = rp.player_id
  and va.time_hundredths = rp.personal_best_hundredths
group by rp.player_id, rp.display_name, rp.avatar_url,
  rp.personal_best_hundredths, rp.rank;

create or replace view public.player_statistics
with (security_invoker = true)
as
with event_stats as (
  select a.player_id,
    count(a.id) approved_attempts,
    count(a.id) filter (where not a.is_dnf) valid_attempts,
    count(a.id) filter (where a.is_dnf) dnf_count,
    round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
  group by a.player_id
), official_bests as (
  select a.player_id, a.time_hundredths
  from public.attempts a
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_ak and not a.is_dnf and a.player_id is not null
    and (a.event_id is null or e.deleted_at is null)
  union all
  select h.player_id, h.time_hundredths
  from public.historical_attempts h
  where h.deleted_at is null and not h.is_guest
    and not h.out_of_competition and h.player_id is not null
), bests as (
  select player_id, min(time_hundredths) personal_best_hundredths
  from official_bests group by player_id
)
select p.id player_id, b.personal_best_hundredths,
  coalesce(es.approved_attempts, 0) approved_attempts,
  coalesce(es.valid_attempts, 0) valid_attempts,
  coalesce(es.dnf_count, 0) dnf_count,
  es.average_hundredths,
  (select count(distinct ew.event_id) from public.event_winners ew
    where ew.player_id = p.id) event_wins,
  (select count(*) from public.event_participants ep
    join public.events e on e.id = ep.event_id and e.deleted_at is null
    where ep.player_id = p.id) event_participations,
  (select count(*) from public.event_podium ep
    where ep.player_id = p.id and ep.rank = 2) second_places,
  (select count(*) from public.event_podium ep
    where ep.player_id = p.id and ep.rank = 3) third_places
from public.players p
left join event_stats es on es.player_id = p.id
left join bests b on b.player_id = p.id
where not p.is_archived;

create or replace view public.player_attempt_number_statistics
with (security_invoker = true)
as
with ordered_attempts as (
  select
    a.player_id,
    a.time_hundredths,
    a.is_dnf,
    row_number() over (
      partition by a.event_id, a.player_id
      order by a.submitted_at, a.id
    )::integer attempt_number
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_ak
    and not p.is_ak
    and not p.is_archived
)
select
  player_id,
  attempt_number,
  count(*) attempt_count,
  count(*) filter (where not is_dnf) valid_attempts,
  count(*) filter (where is_dnf) dnf_count,
  round(avg(time_hundredths) filter (where not is_dnf))::integer
    average_hundredths
from ordered_attempts
group by player_id, attempt_number;

create or replace view public.player_pb_progression
with (security_invoker = true)
as
with official_attempts as (
  select
    a.id source_id,
    a.player_id,
    p.display_name,
    a.time_hundredths,
    a.submitted_at achieved_at,
    a.event_id,
    'attempt'::text source_type
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_dnf
    and not a.is_ak
    and not p.is_ak
    and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
  union all
  select
    h.id,
    h.player_id,
    p.display_name,
    h.time_hundredths,
    (h.attempt_date::timestamp + make_interval(secs => h.sort_order))
      at time zone 'Europe/Berlin',
    null::uuid,
    'historical_attempt'::text
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null
    and not h.is_guest
    and not h.out_of_competition
    and not p.is_ak
    and not p.is_archived
), ordered_attempts as (
  select *,
    min(time_hundredths) over (
      partition by player_id
      order by achieved_at, source_id
      rows between unbounded preceding and 1 preceding
    ) previous_best
  from official_attempts
)
select
  source_id,
  player_id,
  display_name,
  time_hundredths,
  achieved_at,
  event_id,
  source_type
from ordered_attempts
where previous_best is null or time_hundredths < previous_best;

create or replace view public.world_record_progression
with (security_invoker = true)
as
with official_attempts as (
  select a.id attempt_id, a.player_id, p.display_name,
    a.time_hundredths, a.submitted_at achieved_at, a.event_id,
    null::text historical_label, 'attempt'::text source_type
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and not a.is_dnf and a.deleted_at is null
    and not a.is_ak and not p.is_ak and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
  union all
  select h.id, h.player_id, p.display_name, h.time_hundredths,
    (h.attempt_date::timestamp + make_interval(secs => h.sort_order))
      at time zone 'Europe/Berlin',
    null::uuid, h.historical_label, 'historical_attempt'::text
  from public.historical_attempts h join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
), ordered_attempts as (
  select *,
    min(time_hundredths) over (
      order by achieved_at, attempt_id
      rows between unbounded preceding and 1 preceding
    ) previous_record
  from official_attempts
)
select attempt_id, player_id, display_name, time_hundredths, achieved_at, event_id,
  historical_label, source_type
from ordered_attempts
where previous_record is null or time_hundredths < previous_record;

create or replace view public.global_statistics
with (security_invoker = true)
as
with event_attempts as (
  select a.*
  from public.attempts a
  join public.players p on p.id = a.player_id
  join public.events e on e.id = a.event_id and e.deleted_at is null
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
), official_times as (
  select time_hundredths from event_attempts where not is_dnf
  union all
  select h.time_hundredths
  from public.historical_attempts h join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
)
select
  (select count(*) from public.players where not is_ak and not is_archived)
    regular_players,
  (select count(*) from public.events where deleted_at is null) event_count,
  (select count(*) from event_attempts) approved_attempts,
  (select count(*) from event_attempts where not is_dnf) valid_attempts,
  (select count(*) from event_attempts where is_dnf) dnf_count,
  (select min(time_hundredths) from official_times) world_record_hundredths,
  (select round(avg(time_hundredths))::integer
    from event_attempts where not is_dnf) average_hundredths;

grant select on public.event_winners, public.event_statistics,
  public.public_hall_of_fame, public.player_statistics,
  public.player_attempt_number_statistics, public.player_pb_progression,
  public.world_record_progression, public.global_statistics
  to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.event_photos;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$$;
