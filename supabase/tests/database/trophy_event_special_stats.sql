begin;
create extension if not exists pgtap;
select plan(13);

select has_function('public', 'get_trophy_event_special_stats', array['uuid'],
  'bundled Trophy Event special-stat RPC exists');

insert into public.players (id, display_name, is_ak) values
  ('5a700000-0000-0000-0000-000000000001', 'Trophy Special Paul', false),
  ('5a700000-0000-0000-0000-000000000002', 'Trophy Special Lars', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at, awards_trophies
) values
  ('5a700000-0000-0000-0000-000000000010', 'Trophy A', date '2026-09-05',
    '2026-09-05 18:00:00+02', '2026-09-06 18:00:00+02', 'closed',
    '2026-09-06 18:00:00+02', true),
  ('5a700000-0000-0000-0000-000000000011', 'Trophy B', date '2026-09-07',
    '2026-09-07 18:00:00+02', '2026-09-08 18:00:00+02', 'closed',
    '2026-09-08 18:00:00+02', true),
  ('5a700000-0000-0000-0000-000000000012', 'Normal', date '2026-09-09',
    '2026-09-09 18:00:00+02', '2026-09-10 18:00:00+02', 'closed',
    '2026-09-10 18:00:00+02', false);

insert into public.event_guests (id, event_id, display_name) values
  ('5a700000-0000-0000-0000-000000000020',
   '5a700000-0000-0000-0000-000000000010', 'Fipsi Gast');

insert into public.attempts (
  id, player_id, guest_id, event_id, status, approved_at, time_hundredths,
  is_dnf, is_ak, submitted_at, source
) values
  ('5a700000-0000-0000-0000-000000000101',
   '5a700000-0000-0000-0000-000000000001', null,
   '5a700000-0000-0000-0000-000000000010', 'approved', now(), 342,
   false, false, '2026-09-05 18:01:00+02', 'admin'),
  ('5a700000-0000-0000-0000-000000000102', null,
   '5a700000-0000-0000-0000-000000000020',
   '5a700000-0000-0000-0000-000000000010', 'approved', now(), 342,
   false, false, '2026-09-05 18:02:00+02', 'admin'),
  ('5a700000-0000-0000-0000-000000000103',
   '5a700000-0000-0000-0000-000000000002', null,
   '5a700000-0000-0000-0000-000000000010', 'approved', now(), 417,
   false, false, '2026-09-05 18:03:00+02', 'admin'),
  ('5a700000-0000-0000-0000-000000000104',
   '5a700000-0000-0000-0000-000000000002', null,
   '5a700000-0000-0000-0000-000000000011', 'approved', now(), 399,
   false, false, '2026-09-07 18:01:00+02', 'admin'),
  ('5a700000-0000-0000-0000-000000000105',
   '5a700000-0000-0000-0000-000000000002', null,
   '5a700000-0000-0000-0000-000000000012', 'approved', now(), 388,
   false, false, '2026-09-09 18:01:00+02', 'admin'),
  ('5a700000-0000-0000-0000-000000000106',
   '5a700000-0000-0000-0000-000000000001', null,
   '5a700000-0000-0000-0000-000000000010', 'approved', now(), null,
   true, false, '2026-09-05 18:04:00+02', 'admin'),
  ('5a700000-0000-0000-0000-000000000107',
   '5a700000-0000-0000-0000-000000000001', null,
   '5a700000-0000-0000-0000-000000000010', 'approved', now(), 355,
   false, false, '2026-09-05 18:05:00+02', 'admin'),
  ('5a700000-0000-0000-0000-000000000108',
   '5a700000-0000-0000-0000-000000000001', null,
   '5a700000-0000-0000-0000-000000000010', 'approved', now(), 366,
   false, true, '2026-09-05 18:06:00+02', 'admin');

update public.attempts set deleted_at = now()
where id = '5a700000-0000-0000-0000-000000000107';

insert into public.attempts (
  player_id, event_id, status, approved_at, time_hundredths, is_dnf, is_ak,
  submitted_at, source
)
select '5a700000-0000-0000-0000-000000000001',
  '5a700000-0000-0000-0000-000000000010', 'approved', now(),
  300 + ending, false, false,
  timestamptz '2026-09-05 19:00:00+02' + ending * interval '1 minute', 'admin'
from generate_series(0, 9) ending;

select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000012')->>'eventId')::text,
  null::text, 'normal events do not expose Trophy special stats');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'metrics'->>'validAttempts')::integer,
  13, 'only qualified attempts in Trophy A are counted');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'metrics'->>'distinctEndings')::integer,
  12, 'distinct endings stay scoped to Trophy A');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000011')->'metrics'->>'distinctEndings')::integer,
  1, 'two Trophy Events are not mixed');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'metrics'->>'bingoLines')::integer,
  1, 'row 00 through 09 completes one canonical Bingo line');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'metrics'->>'matchingTimeParticipantCount')::integer,
  2, 'same exact time counts distinct permanent and guest participants');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'metrics'->>'matchingTimeHundredths')::integer,
  342, 'matching-time metadata retains the concrete time');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'metrics'->>'mostCommonEnding')::integer,
  42, 'most-common ending uses all qualified hits');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'metrics'->>'mostCommonEndingHits')::integer,
  2, 'most-common ending exposes its hit count');
select is((select item->>'playerName' from jsonb_array_elements(
  public.get_trophy_event_special_stats(
    '5a700000-0000-0000-0000-000000000010')->'endings') item
  where (item->>'ending')::integer = 42), 'Trophy Special Paul',
  'deterministic first finder remains the earliest valid hit');
select is((select jsonb_array_length(item->'hits') from jsonb_array_elements(
  public.get_trophy_event_special_stats(
    '5a700000-0000-0000-0000-000000000010')->'endings') item
  where (item->>'ending')::integer = 42), 2,
  'additional hits remain available in the ending detail');
select is((public.get_trophy_event_special_stats(
  '5a700000-0000-0000-0000-000000000010')->'topHunters'->0->>'playerName'),
  'Trophy Special Paul', 'Top Hunter counts first-found endings');

select * from finish();
rollback;
