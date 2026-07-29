-- PR 6C: explicit historical attempts and deterministic production import.
-- Before applying this destructive data migration, follow docs/PR6C_PRODUCTION_IMPORT.md.

create table if not exists public.historical_attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on update cascade on delete restrict,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  attempt_date date not null,
  time_hundredths integer not null check (time_hundredths between 1 and 30000),
  historical_label text check (
    historical_label is null or char_length(trim(historical_label)) between 1 and 120
  ),
  is_guest boolean not null default false,
  out_of_competition boolean not null default false,
  sort_order integer not null default 0,
  source public.attempt_source not null default 'admin',
  legacy_source_id text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint historical_attempts_identity check (
    (is_guest and player_id is null and out_of_competition)
    or (not is_guest and player_id is not null and not out_of_competition)
  )
);

create unique index if not exists historical_attempts_legacy_source_unique
  on public.historical_attempts (legacy_source_id)
  where legacy_source_id is not null;
create index if not exists historical_attempts_date_idx
  on public.historical_attempts (attempt_date, sort_order, id);
create index if not exists historical_attempts_player_idx
  on public.historical_attempts (player_id, attempt_date)
  where deleted_at is null;

drop trigger if exists historical_attempts_set_updated_at on public.historical_attempts;
create trigger historical_attempts_set_updated_at
before update on public.historical_attempts
for each row execute function public.set_updated_at();

alter table public.historical_attempts enable row level security;
drop policy if exists historical_attempts_public_read on public.historical_attempts;
create policy historical_attempts_public_read on public.historical_attempts
for select to anon, authenticated
using (deleted_at is null or public.is_admin());
grant select on public.historical_attempts to anon, authenticated;

create or replace function public.sync_create_historical_attempt(
  p_player_id uuid,
  p_guest_name text,
  p_attempt_date date,
  p_time_hundredths integer,
  p_historical_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
  selected_name text;
  guest_name text := nullif(trim(p_guest_name), '');
begin
  if p_time_hundredths not between 1 and 30000 then
    raise exception 'Ungültige Zeit.';
  end if;
  if (p_player_id is null) = (guest_name is null) then
    raise exception 'Wähle genau einen Spieler oder gib einen Gastnamen an.';
  end if;
  if p_player_id is not null then
    select display_name into selected_name from public.players
    where id = p_player_id and not is_archived and not is_ak;
    if selected_name is null then raise exception 'Spieler wurde nicht gefunden.'; end if;
  else
    selected_name := guest_name;
  end if;
  insert into public.historical_attempts (
    player_id, display_name, attempt_date, time_hundredths,
    historical_label, is_guest, out_of_competition, sort_order
  ) values (
    p_player_id, selected_name, p_attempt_date, p_time_hundredths,
    nullif(trim(p_historical_label), ''), p_player_id is null,
    p_player_id is null,
    coalesce((select max(sort_order) + 1 from public.historical_attempts), 1)
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.sync_update_historical_attempt(
  p_attempt_id uuid,
  p_player_id uuid,
  p_guest_name text,
  p_attempt_date date,
  p_time_hundredths integer,
  p_historical_label text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_name text;
  guest_name text := nullif(trim(p_guest_name), '');
begin
  if p_time_hundredths not between 1 and 30000 then
    raise exception 'Ungültige Zeit.';
  end if;
  if (p_player_id is null) = (guest_name is null) then
    raise exception 'Wähle genau einen Spieler oder gib einen Gastnamen an.';
  end if;
  if p_player_id is not null then
    select display_name into selected_name from public.players
    where id = p_player_id and not is_archived and not is_ak;
    if selected_name is null then raise exception 'Spieler wurde nicht gefunden.'; end if;
  else
    selected_name := guest_name;
  end if;
  update public.historical_attempts
  set player_id = p_player_id,
      display_name = selected_name,
      attempt_date = p_attempt_date,
      time_hundredths = p_time_hundredths,
      historical_label = nullif(trim(p_historical_label), ''),
      is_guest = p_player_id is null,
      out_of_competition = p_player_id is null
  where id = p_attempt_id and deleted_at is null;
  if not found then raise exception 'Historischer Versuch wurde nicht gefunden.'; end if;
end;
$$;

create or replace function public.sync_delete_historical_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.historical_attempts set deleted_at = now()
  where id = p_attempt_id and deleted_at is null;
  if not found then raise exception 'Historischer Versuch wurde nicht gefunden.'; end if;
end;
$$;

revoke all on function public.sync_create_historical_attempt(uuid, text, date, integer, text)
  from public;
revoke all on function public.sync_update_historical_attempt(uuid, uuid, text, date, integer, text)
  from public;
revoke all on function public.sync_delete_historical_attempt(uuid) from public;
grant execute on function public.sync_create_historical_attempt(uuid, text, date, integer, text)
  to anon, authenticated;
grant execute on function public.sync_update_historical_attempt(uuid, uuid, text, date, integer, text)
  to anon, authenticated;
grant execute on function public.sync_delete_historical_attempt(uuid)
  to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.historical_attempts;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$$;

-- Destructive replacement of fictional product records. Auth/admin configuration is retained.
delete from public.historical_attempts;
delete from public.attempts;
delete from public.event_participants;
delete from public.event_guests;
delete from public.events;
delete from public.merge_history;
delete from public.rate_limit_entries;
delete from public.players;

insert into public.players (id, display_name, legacy_source_id) values
  ('11000000-0000-0000-0000-000000000001', 'Fipsi', 'pr6c-player-fipsi'),
  ('11000000-0000-0000-0000-000000000002', 'Paul', 'pr6c-player-paul'),
  ('11000000-0000-0000-0000-000000000003', 'Lars', 'pr6c-player-lars'),
  ('11000000-0000-0000-0000-000000000004', 'Fred', 'pr6c-player-fred'),
  ('11000000-0000-0000-0000-000000000005', 'Martin', 'pr6c-player-martin'),
  ('11000000-0000-0000-0000-000000000006', 'Henni', 'pr6c-player-henni'),
  ('11000000-0000-0000-0000-000000000007', 'Leif', 'pr6c-player-leif'),
  ('11000000-0000-0000-0000-000000000008', 'Lonzo', 'pr6c-player-lonzo'),
  ('11000000-0000-0000-0000-000000000009', 'Lia', 'pr6c-player-lia'),
  ('11000000-0000-0000-0000-000000000010', 'Martin B.', 'pr6c-player-martin-b'),
  ('11000000-0000-0000-0000-000000000011', 'Mischa', 'pr6c-player-mischa'),
  ('11000000-0000-0000-0000-000000000012', 'Käptn', 'pr6c-player-kaeptn'),
  ('11000000-0000-0000-0000-000000000013', 'Tori', 'pr6c-player-tori'),
  ('11000000-0000-0000-0000-000000000014', 'Momme', 'pr6c-player-momme'),
  ('11000000-0000-0000-0000-000000000015', 'Kerstin', 'pr6c-player-kerstin'),
  ('11000000-0000-0000-0000-000000000016', 'Michi', 'pr6c-player-michi');

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at,
  end_reason, winner_player_id, legacy_source_id
) values (
  '22000000-0000-0000-0000-000000000001',
  'Spieleabend 22.02.2025',
  '2025-02-22',
  '2025-02-22 19:00:00+01',
  '2025-02-22 23:00:00+01',
  'closed',
  '2025-02-22 23:00:00+01',
  'manual',
  '11000000-0000-0000-0000-000000000002',
  'pr6c-event-2025-02-22'
);

insert into public.event_participants (event_id, player_id, joined_at) values
  ('22000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', '2025-02-22 19:00:00+01'),
  ('22000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '2025-02-22 19:00:00+01'),
  ('22000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', '2025-02-22 19:00:00+01');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  submitted_at, approved_at, source, legacy_source_id
) values
  ('33000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'approved', 269, false, '2025-02-22 19:00:03+01', '2025-02-22 19:00:03+01', 'admin', 'pr6c-source-003'),
  ('33000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'approved', 269, false, '2025-02-22 19:00:04+01', '2025-02-22 19:00:04+01', 'admin', 'pr6c-source-004'),
  ('33000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'approved', 305, false, '2025-02-22 19:00:05+01', '2025-02-22 19:00:05+01', 'admin', 'pr6c-source-005'),
  ('33000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'approved', 312, false, '2025-02-22 19:00:06+01', '2025-02-22 19:00:06+01', 'admin', 'pr6c-source-006'),
  ('33000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'approved', 317, false, '2025-02-22 19:00:07+01', '2025-02-22 19:00:07+01', 'admin', 'pr6c-source-007'),
  ('33000000-0000-0000-0000-000000000008', '11000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'approved', 323, false, '2025-02-22 19:00:08+01', '2025-02-22 19:00:08+01', 'admin', 'pr6c-source-008'),
  ('33000000-0000-0000-0000-000000000009', '11000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', 'approved', 331, false, '2025-02-22 19:00:09+01', '2025-02-22 19:00:09+01', 'admin', 'pr6c-source-009'),
  ('33000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', 'approved', 335, false, '2025-02-22 19:00:10+01', '2025-02-22 19:00:10+01', 'admin', 'pr6c-source-010'),
  ('33000000-0000-0000-0000-000000000011', '11000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', 'approved', 336, false, '2025-02-22 19:00:11+01', '2025-02-22 19:00:11+01', 'admin', 'pr6c-source-011'),
  ('33000000-0000-0000-0000-000000000012', '11000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', 'approved', 339, false, '2025-02-22 19:00:12+01', '2025-02-22 19:00:12+01', 'admin', 'pr6c-source-012'),
  ('33000000-0000-0000-0000-000000000013', '11000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', 'approved', 349, false, '2025-02-22 19:00:13+01', '2025-02-22 19:00:13+01', 'admin', 'pr6c-source-013'),
  ('33000000-0000-0000-0000-000000000014', '11000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'approved', 359, false, '2025-02-22 19:00:14+01', '2025-02-22 19:00:14+01', 'admin', 'pr6c-source-014'),
  ('33000000-0000-0000-0000-000000000015', '11000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'approved', 369, false, '2025-02-22 19:00:15+01', '2025-02-22 19:00:15+01', 'admin', 'pr6c-source-015'),
  ('33000000-0000-0000-0000-000000000016', '11000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'approved', 375, false, '2025-02-22 19:00:16+01', '2025-02-22 19:00:16+01', 'admin', 'pr6c-source-016'),
  ('33000000-0000-0000-0000-000000000017', '11000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', 'approved', 377, false, '2025-02-22 19:00:17+01', '2025-02-22 19:00:17+01', 'admin', 'pr6c-source-017'),
  ('33000000-0000-0000-0000-000000000018', '11000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'approved', 380, false, '2025-02-22 19:00:18+01', '2025-02-22 19:00:18+01', 'admin', 'pr6c-source-018'),
  ('33000000-0000-0000-0000-000000000019', '11000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'approved', 413, false, '2025-02-22 19:00:19+01', '2025-02-22 19:00:19+01', 'admin', 'pr6c-source-019');

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths,
  historical_label, is_guest, out_of_competition, sort_order, legacy_source_id
) values
  ('44000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Fipsi', '2024-10-26', 294, null, false, false, 1, 'pr6c-source-001'),
  ('44000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Fipsi', '2025-01-01', 279, null, false, false, 2, 'pr6c-source-002'),
  ('44000000-0000-0000-0000-000000000020', '11000000-0000-0000-0000-000000000002', 'Paul', '2025-05-02', 242, null, false, false, 20, 'pr6c-source-020'),
  ('44000000-0000-0000-0000-000000000021', '11000000-0000-0000-0000-000000000004', 'Fred', '2025-05-02', 373, null, false, false, 21, 'pr6c-source-021'),
  ('44000000-0000-0000-0000-000000000022', '11000000-0000-0000-0000-000000000005', 'Martin', '2025-05-02', 386, null, false, false, 22, 'pr6c-source-022'),
  ('44000000-0000-0000-0000-000000000023', '11000000-0000-0000-0000-000000000006', 'Henni', '2025-05-02', 427, null, false, false, 23, 'pr6c-source-023'),
  ('44000000-0000-0000-0000-000000000024', '11000000-0000-0000-0000-000000000002', 'Paul', '2025-05-31', 206, null, false, false, 24, 'pr6c-source-024'),
  ('44000000-0000-0000-0000-000000000025', '11000000-0000-0000-0000-000000000007', 'Leif', '2025-05-31', 288, null, false, false, 25, 'pr6c-source-025'),
  ('44000000-0000-0000-0000-000000000026', '11000000-0000-0000-0000-000000000008', 'Lonzo', '2025-08-23', 464, null, false, false, 26, 'pr6c-source-026'),
  ('44000000-0000-0000-0000-000000000027', '11000000-0000-0000-0000-000000000009', 'Lia', '2025-09-05', 1071, 'Geburtstag Paul', false, false, 27, 'pr6c-source-027'),
  ('44000000-0000-0000-0000-000000000028', '11000000-0000-0000-0000-000000000010', 'Martin B.', '2025-09-05', 1552, 'Geburtstag Paul', false, false, 28, 'pr6c-source-028'),
  ('44000000-0000-0000-0000-000000000029', '11000000-0000-0000-0000-000000000002', 'Paul', '2025-09-05', 232, 'Geburtstag Paul', false, false, 29, 'pr6c-source-029'),
  ('44000000-0000-0000-0000-000000000030', '11000000-0000-0000-0000-000000000001', 'Fipsi', '2025-09-05', 235, 'Geburtstag Paul', false, false, 30, 'pr6c-source-030'),
  ('44000000-0000-0000-0000-000000000031', '11000000-0000-0000-0000-000000000003', 'Lars', '2025-09-05', 262, 'Geburtstag Paul', false, false, 31, 'pr6c-source-031'),
  ('44000000-0000-0000-0000-000000000032', '11000000-0000-0000-0000-000000000011', 'Mischa', '2025-09-05', 402, 'Geburtstag Paul', false, false, 32, 'pr6c-source-032'),
  ('44000000-0000-0000-0000-000000000033', '11000000-0000-0000-0000-000000000012', 'Käptn', '2025-09-05', 464, 'Geburtstag Paul', false, false, 33, 'pr6c-source-033'),
  ('44000000-0000-0000-0000-000000000034', '11000000-0000-0000-0000-000000000013', 'Tori', '2025-09-05', 511, 'Geburtstag Paul', false, false, 34, 'pr6c-source-034'),
  ('44000000-0000-0000-0000-000000000035', '11000000-0000-0000-0000-000000000014', 'Momme', '2025-09-05', 536, 'Geburtstag Paul', false, false, 35, 'pr6c-source-035'),
  ('44000000-0000-0000-0000-000000000036', '11000000-0000-0000-0000-000000000015', 'Kerstin', '2025-09-05', 761, 'Geburtstag Paul', false, false, 36, 'pr6c-source-036'),
  ('44000000-0000-0000-0000-000000000037', '11000000-0000-0000-0000-000000000016', 'Michi', '2025-09-25', 1159, null, false, false, 37, 'pr6c-source-037'),
  ('44000000-0000-0000-0000-000000000038', '11000000-0000-0000-0000-000000000002', 'Paul', '2025-09-25', 232, null, false, false, 38, 'pr6c-source-038'),
  ('44000000-0000-0000-0000-000000000039', '11000000-0000-0000-0000-000000000012', 'Käptn', '2025-09-25', 343, null, false, false, 39, 'pr6c-source-039'),
  ('44000000-0000-0000-0000-000000000040', '11000000-0000-0000-0000-000000000002', 'Paul', '2026-04-10', 231, null, false, false, 40, 'pr6c-source-040'),
  ('44000000-0000-0000-0000-000000000041', '11000000-0000-0000-0000-000000000008', 'Lonzo', '2026-04-10', 307, null, false, false, 41, 'pr6c-source-041'),
  ('44000000-0000-0000-0000-000000000042', '11000000-0000-0000-0000-000000000012', 'Käptn', '2026-04-10', 308, null, false, false, 42, 'pr6c-source-042'),
  ('44000000-0000-0000-0000-000000000043', '11000000-0000-0000-0000-000000000006', 'Henni', '2026-04-10', 332, null, false, false, 43, 'pr6c-source-043'),
  ('44000000-0000-0000-0000-000000000044', '11000000-0000-0000-0000-000000000016', 'Michi', '2026-04-10', 356, null, false, false, 44, 'pr6c-source-044'),
  ('44000000-0000-0000-0000-000000000045', '11000000-0000-0000-0000-000000000004', 'Fred', '2026-04-10', 359, null, false, false, 45, 'pr6c-source-045'),
  ('44000000-0000-0000-0000-000000000046', null, 'Jan', '2026-05-11', 207, 'Maiwanderung 26', true, true, 46, 'pr6c-source-046'),
  ('44000000-0000-0000-0000-000000000047', '11000000-0000-0000-0000-000000000002', 'Paul', '2026-05-16', 207, 'ESC 2026', false, false, 47, 'pr6c-source-047'),
  ('44000000-0000-0000-0000-000000000048', '11000000-0000-0000-0000-000000000001', 'Fipsi', '2026-05-16', 226, 'ESC 2026', false, false, 48, 'pr6c-source-048');

create or replace view public.public_hall_of_fame
with (security_invoker = true)
as
with valid_attempts as (
  select p.id player_id, p.display_name, p.avatar_url,
    a.time_hundredths, a.submitted_at::date achieved_date
  from public.players p join public.attempts a on a.player_id = p.id
  where not p.is_ak and not p.is_archived and not a.is_ak
    and a.status = 'approved' and not a.is_dnf
    and a.time_hundredths is not null and a.deleted_at is null
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
  where a.event_id is not null and a.status = 'approved'
    and a.deleted_at is null and not a.is_ak
  group by a.player_id
), official_bests as (
  select a.player_id, a.time_hundredths
  from public.attempts a
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_ak and not a.is_dnf and a.player_id is not null
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
    where ew.player_id = p.id) event_wins
from public.players p
left join event_stats es on es.player_id = p.id
left join bests b on b.player_id = p.id
where not p.is_archived;

create or replace view public.world_record_progression
with (security_invoker = true)
as
with official_attempts as (
  select a.id attempt_id, a.player_id, p.display_name,
    a.time_hundredths, a.submitted_at achieved_at, a.event_id,
    null::text historical_label
  from public.attempts a join public.players p on p.id = a.player_id
  where a.status = 'approved' and not a.is_dnf and a.deleted_at is null
    and not a.is_ak and not p.is_ak and not p.is_archived
  union all
  select h.id, h.player_id, p.display_name, h.time_hundredths,
    (h.attempt_date::timestamp + make_interval(secs => h.sort_order))
      at time zone 'Europe/Berlin',
    null::uuid, h.historical_label
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
-- Keep the PR 6A column prefix unchanged and append historical context.
select attempt_id, player_id, display_name, time_hundredths, achieved_at, event_id,
  historical_label
from ordered_attempts
where previous_record is null or time_hundredths < previous_record;

create or replace view public.global_statistics
with (security_invoker = true)
as
with event_attempts as (
  select a.*
  from public.attempts a join public.players p on p.id = a.player_id
  where a.event_id is not null and a.status = 'approved'
    and a.deleted_at is null and not a.is_ak
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
  (select count(*) from public.events) event_count,
  (select count(*) from event_attempts) approved_attempts,
  (select count(*) from event_attempts where not is_dnf) valid_attempts,
  (select count(*) from event_attempts where is_dnf) dnf_count,
  (select min(time_hundredths) from official_times) world_record_hundredths,
  (select round(avg(time_hundredths))::integer
    from event_attempts where not is_dnf) average_hundredths;

grant select on public.public_hall_of_fame, public.player_statistics,
  public.world_record_progression, public.global_statistics
  to anon, authenticated;
