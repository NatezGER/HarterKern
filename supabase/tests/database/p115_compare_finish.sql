begin;
select plan(7);

select has_function('public', 'get_player_most_wanted_statistics',
  array['uuid[]', 'integer'], 'player-scoped Most Wanted projection exists');

insert into public.players (id, display_name) values
  ('40000000-0000-0000-0000-000000000001', 'Wanted A'),
  ('40000000-0000-0000-0000-000000000002', 'Wanted B');

insert into public.events (
  id, name, start_date, started_at, ends_at, closed_at, status, awards_trophies
) values (
  '40000000-0000-0000-0000-000000000010', 'Most Wanted Projection',
  date '2026-01-01', timestamptz '2026-01-01 18:00:00+00',
  timestamptz '2026-01-01 20:00:00+00', timestamptz '2026-01-01 20:00:00+00',
  'closed', false
);

insert into public.event_participants (event_id, player_id) values
  ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000002');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  submitted_at, source
) values
  ('40000000-0000-0000-0000-000000000101', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000010', 'approved', 306, false, timestamptz '2026-01-01 18:01:00+00', 'admin'),
  ('40000000-0000-0000-0000-000000000102', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000010', 'approved', 406, false, timestamptz '2026-01-01 18:02:00+00', 'admin'),
  ('40000000-0000-0000-0000-000000000103', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000010', 'approved', 312, false, timestamptz '2026-01-01 18:03:00+00', 'admin'),
  ('40000000-0000-0000-0000-000000000104', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000010', 'approved', null, true, timestamptz '2026-01-01 18:04:00+00', 'admin'),
  ('40000000-0000-0000-0000-000000000105', '40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000010', 'approved', 506, false, timestamptz '2026-01-01 18:05:00+00', 'admin'),
  ('40000000-0000-0000-0000-000000000106', '40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000010', 'approved', 337, false, timestamptz '2026-01-01 18:06:00+00', 'admin');

select is((select all_time_hits from public.get_player_most_wanted_statistics(
  array['40000000-0000-0000-0000-000000000001']::uuid[], 2026)), 2,
  'duplicate ending and invalid DNF count as two distinct valid endings');
select is((select season_first_hits from public.get_player_most_wanted_statistics(
  array['40000000-0000-0000-0000-000000000001']::uuid[], 2026)), 2,
  'the chronologically first player receives each seasonal first hit');
select is((select season_first_hits from public.get_player_most_wanted_statistics(
  array['40000000-0000-0000-0000-000000000002']::uuid[], 2026)), 1,
  'a later repeated ending is not a seasonal first hit');
select is((select season_first_hits from public.get_player_most_wanted_statistics(
  array['40000000-0000-0000-0000-000000000001']::uuid[], 2030)), 0,
  'changing season does not leak 2026 first hits');
select is((select season_first_hits from public.get_player_most_wanted_statistics(
  array['40000000-0000-0000-0000-000000000001']::uuid[], null)), null::integer,
  'all-time scope does not relabel a seasonal value');
select is((select count(*) from public.get_player_most_wanted_statistics(
  array['40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002']::uuid[], 2026)), 2::bigint,
  'one pair-scoped call returns exactly both requested players');

select * from finish();
rollback;
