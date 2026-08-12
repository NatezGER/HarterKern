begin;
create extension if not exists pgtap;
select plan(14);

insert into public.players (id, display_name, is_ak) values
  ('9c000000-0000-0000-0000-000000000001', 'Season Player', false),
  ('9c000000-0000-0000-0000-000000000002', 'Other Player', false),
  ('9c000000-0000-0000-0000-000000000003', 'Empty Player', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values
  ('9c000000-0000-0000-0000-000000000010', 'Season Start',
   date '2026-01-10', timestamptz '2026-01-10 18:00:00+00',
   timestamptz '2026-01-12 18:00:00+00', 'closed',
   timestamptz '2026-01-12 18:00:00+00'),
  ('9c000000-0000-0000-0000-000000000011', 'New Year Event',
   date '2026-12-31', timestamptz '2026-12-31 18:00:00+00',
   timestamptz '2027-01-02 18:00:00+00', 'closed',
   timestamptz '2027-01-02 18:00:00+00');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('9c000000-0000-0000-0000-000000000101',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000010', 'approved', 341, false, false,
   timestamptz '2026-01-10 19:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000102',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000010', 'approved', 350, false, false,
   timestamptz '2026-01-10 20:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000103',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000010', 'approved', null, true, false,
   timestamptz '2026-01-10 21:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000104',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000010', 'approved', 200, false, true,
   timestamptz '2026-01-10 22:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000105',
   '9c000000-0000-0000-0000-000000000002',
   '9c000000-0000-0000-0000-000000000010', 'approved', 330, false, false,
   timestamptz '2026-02-01 18:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000106',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000011', 'approved', 310, false, false,
   timestamptz '2027-01-01 01:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000107',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000011', 'approved', 290, false, false,
   timestamptz '2027-01-01 02:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000108',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000011', 'approved', 270, false, false,
   timestamptz '2027-01-01 02:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000109',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000011', 'approved', 260, false, false,
   timestamptz '2027-01-01 03:00:00+00', 'admin'),
  ('9c000000-0000-0000-0000-000000000110',
   '9c000000-0000-0000-0000-000000000001',
   '9c000000-0000-0000-0000-000000000011', 'approved', 260, false, false,
   timestamptz '2027-01-01 03:00:00+00', 'admin');

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths, sort_order, source
) values
  ('9c000000-0000-0000-0000-000000000201',
   '9c000000-0000-0000-0000-000000000002', 'Other Player',
   date '2025-12-31', 206, 1, 'admin'),
  ('9c000000-0000-0000-0000-000000000202',
   '9c000000-0000-0000-0000-000000000001', 'Season Player',
   date '2026-03-01', 320, 1, 'admin'),
  ('9c000000-0000-0000-0000-000000000203',
   '9c000000-0000-0000-0000-000000000002', 'Other Player',
   date '2026-04-01', 300, 1, 'admin');

select results_eq(
  $$select time_hundredths from public.get_player_season_pb_history(
      '9c000000-0000-0000-0000-000000000001', 2026)
    order by sequence_number$$,
  $$values (341), (320), (310), (270), (260)$$,
  'season PB starts at the first qualified value and keeps only improvements'
);

select is(
  (select count(*) from public.get_player_season_pb_history(
    '9c000000-0000-0000-0000-000000000001', 2026)),
  5::bigint,
  'slower, DNF and AK attempts create no season PB stages'
);

select results_eq(
  $$select time_hundredths from public.season_world_record_history
    where season_year = 2026 order by sequence_number$$,
  $$values (341), (330), (320), (300), (270), (260)$$,
  'season WR starts anew and retains only qualified improvements'
);

select is(
  (select time_hundredths from public.season_world_record_history
   where season_year = 2026 order by sequence_number limit 1),
  341,
  'the all-time WR does not seed the season WR'
);

select ok(
  exists (
    select 1 from public.get_player_season_pb_history(
      '9c000000-0000-0000-0000-000000000001', 2026)
    where source_id = '9c000000-0000-0000-0000-000000000106'
  ),
  'a January attempt remains in the season of its December event start'
);

select ok(
  exists (
    select 1 from public.get_player_season_pb_history(
      '9c000000-0000-0000-0000-000000000001', 2026)
    where source_id = '9c000000-0000-0000-0000-000000000202'
  ),
  'a 2026 historical time can improve the season PB'
);

select ok(
  exists (
    select 1 from public.season_world_record_history
    where season_year = 2026
      and record_id = '9c000000-0000-0000-0000-000000000203'
  ),
  'a 2026 historical time can improve the season WR'
);

select ok(
  not exists (
    select 1 from public.season_world_record_history where season_year < 2026
  ),
  'historical times before 2026 create no season WR progression'
);

select is(
  (select count(*) from public.get_player_season_pb_history(
    '9c000000-0000-0000-0000-000000000003', 2026)),
  0::bigint,
  'players without season values receive an empty progression'
);

select is(
  (select count(*) from public.get_player_season_pb_history(
    '9c000000-0000-0000-0000-000000000001', 2025)),
  0::bigint,
  'seasons before 2026 return no PB progression'
);

select results_eq(
  $$select source_id, time_hundredths
    from public.get_player_season_pb_history(
      '9c000000-0000-0000-0000-000000000001', 2026)
    where achieved_at = timestamptz '2027-01-01 02:00:00+00'$$,
  $$values ('9c000000-0000-0000-0000-000000000108'::uuid, 270)$$,
  'season PB keeps only the fastest candidate at an identical moment'
);

select results_eq(
  $$select record_id, time_hundredths
    from public.season_world_record_history
    where season_year = 2026
      and achieved_at = timestamptz '2027-01-01 02:00:00+00'$$,
  $$values ('9c000000-0000-0000-0000-000000000108'::uuid, 270)$$,
  'season WR creates no slower intermediate stage at an identical moment'
);

select results_eq(
  $$select source_id, time_hundredths
    from public.get_player_season_pb_history(
      '9c000000-0000-0000-0000-000000000001', 2026)
    where achieved_at = timestamptz '2027-01-01 03:00:00+00'$$,
  $$values ('9c000000-0000-0000-0000-000000000109'::uuid, 260)$$,
  'equal season PB values at one moment select exactly one deterministic source'
);

select results_eq(
  $$select record_id, time_hundredths
    from public.season_world_record_history
    where season_year = 2026
      and achieved_at = timestamptz '2027-01-01 03:00:00+00'$$,
  $$values ('9c000000-0000-0000-0000-000000000109'::uuid, 260)$$,
  'equal season WR values at one moment select exactly one deterministic source'
);

select * from finish();
rollback;
