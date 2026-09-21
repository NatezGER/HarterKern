begin;
create extension if not exists pgtap;
select no_plan();

-- The fixture tests read models, not badge ledger synchronization.
alter table public.attempts disable trigger attempts_insert_refresh_badge_ledger;
alter table public.historical_attempts disable trigger historical_attempts_refresh_badge_ledger;
alter table public.event_participants disable trigger event_participants_refresh_badge_ledger;
alter table public.badge_definitions disable trigger badge_definitions_refresh_badge_ledger;

insert into public.players (id, display_name, is_ak) values
  ('96000000-0000-0000-0000-000000000001', 'Stats A', false),
  ('96000000-0000-0000-0000-000000000002', 'Stats B', false),
  ('96000000-0000-0000-0000-000000000003', 'Stats C', false),
  ('96000000-0000-0000-0000-000000000004', 'Stats D', false),
  ('96000000-0000-0000-0000-000000000005', 'Stats AK', true),
  ('96000000-0000-0000-0000-000000000006', 'Stats Split Window', false),
  ('96000000-0000-0000-0000-000000000007', 'Stats Invalid First', false),
  ('96000000-0000-0000-0000-000000000008', 'Stats One Shot', false);

insert into public.players (id, display_name, is_ak, is_archived) values
  ('96000000-0000-0000-0000-000000000010', 'Stats Archived', false, true);

insert into public.events (id, name, start_date, started_at, ends_at, status, closed_at, awards_trophies) values
  ('96000000-0000-0000-0000-000000000100', 'Old', '2025-09-01', '2025-09-01 09:00+00', '2025-09-01 20:00+00', 'closed', '2025-09-01 20:00+00', false),
  ('96000000-0000-0000-0000-000000000101', 'Trophy Live', '2026-09-01', '2026-09-01 09:00+00', '2026-09-01 20:00+00', 'active', null, true),
  ('96000000-0000-0000-0000-000000000102', 'Normal', '2026-09-02', '2026-09-02 09:00+00', '2026-09-02 20:00+00', 'closed', '2026-09-02 20:00+00', false),
  ('96000000-0000-0000-0000-000000000103', 'Split One', '2026-09-03', '2026-09-03 09:00+00', '2026-09-03 20:00+00', 'closed', '2026-09-03 20:00+00', false),
  ('96000000-0000-0000-0000-000000000104', 'Split Two', '2026-09-04', '2026-09-04 09:00+00', '2026-09-04 20:00+00', 'closed', '2026-09-04 20:00+00', false),
  ('96000000-0000-0000-0000-000000000105', 'Invalid First', '2026-09-05', '2026-09-05 09:00+00', '2026-09-05 20:00+00', 'closed', '2026-09-05 20:00+00', false),
  ('96000000-0000-0000-0000-000000000106', 'One Shot Trophy', '2026-09-06', '2026-09-06 09:00+00', '2026-09-06 20:00+00', 'closed', '2026-09-06 20:00+00', true);

insert into public.event_participants (event_id, player_id)
select '96000000-0000-0000-0000-000000000101', id from public.players
where id in ('96000000-0000-0000-0000-000000000001',
  '96000000-0000-0000-0000-000000000002',
  '96000000-0000-0000-0000-000000000003',
  '96000000-0000-0000-0000-000000000004');

insert into public.event_participants (event_id, player_id) values
  ('96000000-0000-0000-0000-000000000103', '96000000-0000-0000-0000-000000000006'),
  ('96000000-0000-0000-0000-000000000104', '96000000-0000-0000-0000-000000000006'),
  ('96000000-0000-0000-0000-000000000105', '96000000-0000-0000-0000-000000000007'),
  ('96000000-0000-0000-0000-000000000106', '96000000-0000-0000-0000-000000000008');

insert into public.event_guests (id, event_id, display_name) values
  ('96000000-0000-0000-0000-000000000009',
   '96000000-0000-0000-0000-000000000101', 'Stats Guest');

-- Alternating strictly faster leaders give A/B direct takeovers while exact
-- threshold values, a DNF and a sub-3 interruption stay in the same event.
insert into public.attempts (
  player_id, event_id, status, time_hundredths, is_dnf, is_ak, submitted_at, source
)
select case when v.player = 'A' then '96000000-0000-0000-0000-000000000001'::uuid
    when v.player = 'B' then '96000000-0000-0000-0000-000000000002'::uuid
    when v.player = 'C' then '96000000-0000-0000-0000-000000000003'::uuid
    else '96000000-0000-0000-0000-000000000004'::uuid end,
  '96000000-0000-0000-0000-000000000101', 'approved', v.time_hundredths,
  v.time_hundredths is null, false,
  '2026-09-01 10:00+00'::timestamptz + v.sequence * interval '1 minute', 'admin'
from (values
  (0, 'A', 500), (1, 'B', 490), (2, 'A', 480), (3, 'B', 470),
  (4, 'A', 460), (5, 'B', 450), (6, 'A', 440), (7, 'B', 430),
  (8, 'C', 420), (9, 'A', 400), (10, 'A', 300), (11, 'B', 300),
  (12, 'A', 299), (13, 'A', 250), (14, 'A', 200), (15, 'A', 199),
  (16, 'A', null), (17, 'B', 198), (18, 'B', 197),
  (19, 'C', 410), (20, 'C', 410), (21, 'D', 600), (22, 'D', 590)
) v(sequence, player, time_hundredths);

insert into public.attempts (
  player_id, event_id, status, time_hundredths, is_dnf, is_ak, submitted_at, source
) values (
  '96000000-0000-0000-0000-000000000003',
  '96000000-0000-0000-0000-000000000102',
  'approved', 100, false, false, '2026-09-02 10:00+00', 'admin'
);

-- Six valid attempts split across two events must never form one rolling
-- five-attempt window. A separate five-attempt event starts with a DNF so its
-- first valid time cannot be promoted to attempt one.
insert into public.attempts (
  player_id, event_id, status, time_hundredths, is_dnf, is_ak, submitted_at, source
)
select '96000000-0000-0000-0000-000000000006', v.event_id, 'approved',
  v.time_hundredths, false, false, v.submitted_at, 'admin'
from (values
  ('96000000-0000-0000-0000-000000000103'::uuid, 710, '2026-09-03 10:00+00'::timestamptz),
  ('96000000-0000-0000-0000-000000000103'::uuid, 720, '2026-09-03 10:01+00'::timestamptz),
  ('96000000-0000-0000-0000-000000000103'::uuid, 730, '2026-09-03 10:02+00'::timestamptz),
  ('96000000-0000-0000-0000-000000000104'::uuid, 740, '2026-09-04 10:00+00'::timestamptz),
  ('96000000-0000-0000-0000-000000000104'::uuid, 750, '2026-09-04 10:01+00'::timestamptz),
  ('96000000-0000-0000-0000-000000000104'::uuid, 760, '2026-09-04 10:02+00'::timestamptz)
) v(event_id, time_hundredths, submitted_at);

insert into public.attempts (
  player_id, event_id, status, time_hundredths, is_dnf, is_ak, submitted_at, source
) values
  ('96000000-0000-0000-0000-000000000007', '96000000-0000-0000-0000-000000000105', 'approved', null, true, false, '2026-09-05 10:00+00', 'admin'),
  ('96000000-0000-0000-0000-000000000007', '96000000-0000-0000-0000-000000000105', 'approved', 810, false, false, '2026-09-05 10:01+00', 'admin'),
  ('96000000-0000-0000-0000-000000000007', '96000000-0000-0000-0000-000000000105', 'approved', 800, false, false, '2026-09-05 10:02+00', 'admin'),
  ('96000000-0000-0000-0000-000000000007', '96000000-0000-0000-0000-000000000105', 'approved', 790, false, false, '2026-09-05 10:03+00', 'admin'),
  ('96000000-0000-0000-0000-000000000007', '96000000-0000-0000-0000-000000000105', 'approved', 780, false, false, '2026-09-05 10:04+00', 'admin'),
  ('96000000-0000-0000-0000-000000000008', '96000000-0000-0000-0000-000000000106', 'approved', 600, false, false, '2026-09-06 10:00+00', 'admin'),
  ('96000000-0000-0000-0000-000000000008', '96000000-0000-0000-0000-000000000106', 'approved', 650, false, false, '2026-09-06 10:01+00', 'admin'),
  ('96000000-0000-0000-0000-000000000008', '96000000-0000-0000-0000-000000000106', 'approved', 700, false, false, '2026-09-06 10:02+00', 'admin');

insert into public.attempts (
  player_id, guest_id, event_id, status, time_hundredths,
  is_dnf, is_ak, submitted_at, source
) values (
  null, '96000000-0000-0000-0000-000000000009',
  '96000000-0000-0000-0000-000000000101', 'approved', 340,
  false, false, '2026-09-01 11:02+00', 'admin'
);

insert into public.attempts (
  player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source, deleted_at
) values
  ('96000000-0000-0000-0000-000000000001',
   '96000000-0000-0000-0000-000000000101',
   'approved', 50, false, false, '2026-09-01 11:00+00', 'admin',
   '2026-09-01 12:00+00'),
  ('96000000-0000-0000-0000-000000000005',
   '96000000-0000-0000-0000-000000000101',
   'approved', 40, false, false, '2026-09-01 11:01+00', 'admin', null),
  ('96000000-0000-0000-0000-000000000005',
   '96000000-0000-0000-0000-000000000101',
   'approved', 41, false, false, '2026-09-01 11:02+00', 'admin', null),
  ('96000000-0000-0000-0000-000000000010',
   '96000000-0000-0000-0000-000000000101',
   'approved', 42, false, false, '2026-09-01 12:00+00', 'admin', null),
  ('96000000-0000-0000-0000-000000000010',
   '96000000-0000-0000-0000-000000000101',
   'approved', 43, false, false, '2026-09-01 12:01+00', 'admin', null);

insert into public.historical_attempts (
  player_id, display_name, attempt_date, time_hundredths, sort_order
) values (
  '96000000-0000-0000-0000-000000000001', 'Stats A', '1900-08-01', 90, 1
);

insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at, awarded_at
) values
  ('test-stats-a-attempts-bronze', '96000000-0000-0000-0000-000000000001',
    'valid-attempts-bronze', 'test', '2026-09-01 12:00+00', '2026-09-01 12:00+00'),
  ('test-stats-a-attempts-silver', '96000000-0000-0000-0000-000000000001',
    'valid-attempts-silver', 'test', '2026-09-01 12:01+00', '2026-09-01 12:01+00'),
  ('test-stats-a-attempts-inactive-gold', '96000000-0000-0000-0000-000000000001',
    'valid-attempts-gold', 'test', '2026-09-01 12:02+00', '2026-09-01 12:02+00'),
  ('test-stats-a-positive', '96000000-0000-0000-0000-000000000001',
    'time-stopper', 'test', '2026-09-01 12:03+00', '2026-09-01 12:03+00'),
  ('test-stats-a-consolation', '96000000-0000-0000-0000-000000000001',
    'false-starter', 'test', '2026-09-01 12:04+00', '2026-09-01 12:04+00');

update public.badge_definitions set is_active = false
where badge_key = 'valid-attempts-gold';

select is((select (m->>'overallValue')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m
  where m->>'key' = 'fastest'), 197::numeric,
  'event fastest is event-only, not the faster normal or historical time');
select is((select (m->>'overallValue')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null, null)->'metrics') m
  where m->>'key' = 'fastest'), 90::numeric,
  'all-time includes the qualified historical personal best');
select is((select (m->>'overallValue')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(2026, null)->'metrics') m
  where m->>'key' = 'fastest'), 100::numeric,
  'season excludes prior-year historical time');
select is(public.get_unified_statistics_dashboard(null,
  '96000000-0000-0000-0000-000000000102'), null::jsonb,
  'normal events do not expose Trophy dashboard data');

select is((select count(*)
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
  jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'average'), 3::bigint,
  'two-attempt player is excluded from average ranking; exactly three qualify');
select is((select (r->>'count')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'average' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 10::numeric,
  'DNF, AK and deleted attempts are not part of the personal average sample');
select ok(not exists (
  select 1 from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'average' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000004'
), 'two valid attempts do not qualify for average Top 3');
select is((select (r->>'rank')::integer
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'dnf' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000002'), 1,
  'zero DNF is eligible after five attempts and wins lowest-rate ranking');
select is((select (r->>'total')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'dnf' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 11::numeric,
  'DNF denominator includes all eleven approved regular event attempts');
select is((select (r->>'value')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'streak' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 4::numeric,
  '3.00 and DNF interrupt the canonical event-scoped sub-3 streak');
select is((select (r->>'count')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'sub3' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 4::numeric,
  '3.00 is not sub-3, 2.99 is');
select is((select (r->>'count')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'sub5' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 9::numeric,
  '5.00 is excluded from strict sub-5');
select is((select string_agg((r->>'rank')::text, ',' order by r->>'playerId')
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'sub5' and r->>'playerId' in (
    '96000000-0000-0000-0000-000000000001',
    '96000000-0000-0000-0000-000000000002',
    '96000000-0000-0000-0000-000000000003'
  )), '3,1,1',
  'equal 100-percent players share rank one; next player has competition rank three');
select is((select string_agg(r->>'playerId', ',' order by ranking_position)
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') with ordinality ranked(r, ranking_position)
  where m->>'key' = 'sub5' and r->>'playerId' in (
    '96000000-0000-0000-0000-000000000002',
    '96000000-0000-0000-0000-000000000003'
  )), '96000000-0000-0000-0000-000000000002,96000000-0000-0000-0000-000000000003',
  'larger sample only sorts equal-rate players without changing their shared rank');
select ok(not exists (
  select 1 from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'sub5' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000004'
), 'threshold rankings omit players with zero hits');
select is((select (r->>'count')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'sub4' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 5::numeric,
  '4.00 is excluded from strict sub-4');
select is((select (r->>'count')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'sub25' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 2::numeric,
  '2.50 is excluded from strict sub-2.5');
select is((select (r->>'count')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'sub2' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 1::numeric,
  '2.00 is not sub-2, 1.99 is');
select is((select (r->>'value')::numeric
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') m,
    jsonb_array_elements(m->'rankings') r
  where m->>'key' = 'smooth' and r->>'playerId' =
    '96000000-0000-0000-0000-000000000001'), 4::numeric,
  'smooth x.00 values count 5.00, 4.00, 3.00 and 2.00');
select ok((select count(*) from jsonb_array_elements(
  public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'rivalryPairs') pair
  where pair->>'playerLowId' = '96000000-0000-0000-0000-000000000001'
    and pair->>'playerHighId' = '96000000-0000-0000-0000-000000000002'
    and (pair->>'directTakeovers')::integer >= 3
    and (pair->>'levelReached')::boolean) = 1,
  'live watch counts direct takeovers and marks only a provisional level');
select ok(not exists (select 1 from public.rivalry_pair_events where event_id =
  '96000000-0000-0000-0000-000000000101'),
  'active event never becomes a persisted closed-event rivalry');
select ok(public.get_trophy_event_dashboard(
  '96000000-0000-0000-0000-000000000101') ?& array['special', 'dashboard'],
  'Trophy event returns existing special stats and ranked stats in one response');
select ok(not exists (
  select 1
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') metric
  where metric->>'key' like 'badge-%'
    or metric->>'key' like 'wr-%'
    or metric->>'key' like 'rivalry-%'
    or metric->>'key' in (
      'pb-jump', 'rare-hunter', 'nemesis', 'favorite-opponent'
    )
), 'Trophy dashboard excludes career and historical rivalry metrics');

select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'median'),
  350::numeric, 'median averages the two middle values for an even sample');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000003'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'median'),
  410::numeric, 'median returns the middle value for an odd sample');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'fastest-five'),
  250::numeric, 'fastest-five averages exactly the five fastest valid times');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000007'::uuid], null,
  '96000000-0000-0000-0000-000000000105') where metric_key = 'fastest-five'),
  'fewer than five valid times do not qualify for fastest-five');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000006'::uuid], 2026, null)
  where metric_key = 'best-five-window'),
  'rolling five-attempt windows never cross an event boundary');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000007'::uuid], null,
  '96000000-0000-0000-0000-000000000105') where metric_key = 'best-five-window'),
  'a DNF invalidates its five-attempt rolling window');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000007'::uuid], null,
  '96000000-0000-0000-0000-000000000105') where metric_key = 'consistency'),
  'consistency requires five valid times');
select ok(exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'consistency'),
  'consistency is emitted once the minimum valid-time sample is met');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'fastest-first'),
  500::numeric, 'fastest-first uses the actual first event attempt');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000007'::uuid], null,
  '96000000-0000-0000-0000-000000000105') where metric_key = 'fastest-first'),
  'an invalid attempt one is not replaced by the first later valid attempt');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'fast-starter'),
  301::numeric, 'fast-starter measures first valid attempt against final event PB');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'late-bloomer'),
  100::numeric, 'late-bloomer recognizes a final PB first reached after event midpoint');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'clutch'),
  100::numeric, 'clutch recognizes a strict PB improvement in the final two attempts');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000008'::uuid], null,
  '96000000-0000-0000-0000-000000000106') where metric_key = 'one-shot'),
  100::numeric, 'one-shot recognizes an attempt-one time that remains the event PB');
select is((select hit_count from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'near-repeat'),
  2::numeric, 'near-repeat counts adjacent valid pairs within five hundredths');
select is((select sample_count from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'near-repeat'),
  9::numeric, 'near-repeat excludes the pair ending in DNF from its denominator');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'bingo-fields'),
  6::numeric, 'BINGO includes ending 00 and 99 but deduplicates repeated endings');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'bingo-fields'), 7::numeric,
  'all-time BINGO includes the additional historical ending');
select is((select count(distinct player_id) from public.qualified_official_times
  where player_id is not null and not is_guest and mod(time_hundredths, 100) = 40),
  2::bigint, 'Rare Hunter popularity excludes the matching guest and AK attempt');
select is((select count(distinct player_id) from public.qualified_official_times
  where player_id is not null and not is_guest and mod(time_hundredths, 100) = 50),
  4::bigint, 'an ending held by more than three regular players is common');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'rare-hunter'), 4::numeric,
  'Rare Hunter counts endings held by at most three regular players, excludes more common endings, guests and AK');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'badge-total'), 3::numeric,
  'badge total deduplicates the tier family and adds each active special variant');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'badge-silver'), 1::numeric,
  'the highest family tier still contributes to the cumulative silver ladder');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'badge-gold'), 0::numeric,
  'an inactive badge definition does not contribute to badge rankings');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'badge-positive'), 1::numeric,
  'active positive specials are counted separately');
select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'badge-consolation'), 1::numeric,
  'active consolation badges are counted separately');
select is((select improvement_hundredths from public.world_record_history
  where player_id = '96000000-0000-0000-0000-000000000001'
    and time_hundredths = 90), null::integer,
  'the initial all-time world record has no improvement value');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null, null)
  where metric_key = 'wr-improvements'),
  'the initial all-time world record does not count as a WR improvement');
select ok(not exists (select 1 from public.season_world_record_history
  where season_year = 2026 and player_id = '96000000-0000-0000-0000-000000000002'
    and time_hundredths = 300),
  'a world-record tie is not recorded as an improvement');
select ok(coalesce((select max(value) from public.get_advanced_statistic_player_metrics(
  null, 2026, null) where metric_key = 'wr-reign'), 0) <= 122,
  'season world-record reign is capped no later than the season end');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid,
    '96000000-0000-0000-0000-000000000002'::uuid], null, null)
  where metric_key = 'chaos-magnet'),
  'advanced rivalry metrics remain closed-event-only and ignore the live event');
select is((select string_agg(player->>'playerId', ',' order by position)
  from jsonb_array_elements(public.get_player_compare_metric_bundle(array[
    '96000000-0000-0000-0000-000000000002'::uuid,
    '96000000-0000-0000-0000-000000000001'::uuid
  ], null)->'players') with ordinality requested(player, position)),
  '96000000-0000-0000-0000-000000000002,96000000-0000-0000-0000-000000000001',
  'compare preserves deterministic requested-player order without UUID aggregates');
select is((select jsonb_array_length(public.get_player_compare_metric_bundle(array[
    '96000000-0000-0000-0000-000000000001'::uuid,
    '96000000-0000-0000-0000-000000000001'::uuid,
    '96000000-0000-0000-0000-000000000002'::uuid
  ], null)->'players')), 2,
  'compare deduplicates requested UUIDs and handles exactly two distinct players');
select is(public.get_player_compare_metric_bundle(array[
    '96000000-0000-0000-0000-000000000001'::uuid
  ], null)->'pair', '{}'::jsonb,
  'compare does not synthesize a pair when fewer than two distinct players are requested');
select is(jsonb_array_length(public.get_player_compare_metric_bundle(
  array[]::uuid[], null)->'players'), 0,
  'an empty compare request remains empty instead of expanding to global metrics');
select is(public.get_player_compare_metric_bundle(
  array[null::uuid], null), jsonb_build_object('players', '[]'::jsonb, 'pair', '{}'::jsonb),
  'an all-NULL compare request returns the typed empty bundle before metric aggregation');
select is((select string_agg(player->>'playerId', ',' order by position)
  from jsonb_array_elements(public.get_player_compare_metric_bundle(array[
    '96000000-0000-0000-0000-000000000001'::uuid,
    null::uuid,
    '96000000-0000-0000-0000-000000000002'::uuid
  ], null)->'players') with ordinality requested(player, position)),
  '96000000-0000-0000-0000-000000000001,96000000-0000-0000-0000-000000000002',
  'NULL elements in the SQL UUID array are ignored without changing pair order');
select ok(not exists (
  select 1 from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') metric
  where metric->>'key' = 'pb-jump'
), 'Trophy dashboards exclude the career-only PB jump metric server-side');
select ok(exists (
  select 1 from jsonb_array_elements(public.get_unified_statistics_dashboard(null, null)->'metrics') metric
  where metric->>'key' = 'pb-jump'
), 'all-time dashboards retain the PB jump metric');
select ok(exists (
  select 1 from jsonb_array_elements(public.get_unified_statistics_dashboard(2026, null)->'metrics') metric
  where metric->>'key' = 'pb-jump'
), 'season dashboards retain the PB jump metric');

select is((select value from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000003'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'matrix-glitch'),
  1::numeric, 'matrix glitch counts an exact valid adjacent repeat in one event');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000007'::uuid], null,
  '96000000-0000-0000-0000-000000000105')
  where metric_key = 'matrix-glitch' and value > 0),
  'DNF prevents an invalid adjacency from becoming a matrix glitch');
select ok(not exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000006'::uuid], 2026, null)
  where metric_key = 'matrix-glitch' and value > 0),
  'matrix glitch never crosses an event boundary');
select ok(exists (select 1 from public.get_advanced_statistic_player_metrics(
  array['96000000-0000-0000-0000-000000000008'::uuid], null, null)
  where metric_key = 'one-shot' and sample_count = 1),
  'one qualified event is visible in all-time event-pattern rankings');
select is((select value from public.get_qualified_leadership_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101') where metric_key = 'takeovers'),
  1::numeric, 'leadership takeovers start only after the third regular player qualifies');
select ok(not exists (select 1 from public.rivalry_pair_events where event_id =
  '96000000-0000-0000-0000-000000000101'),
  'new leadership metrics do not alter closed-event rivalry history');

select is((select value from public.get_statistics_sequence_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101')
  where metric_key = 'two-in-sixty-total'), 9::numeric,
  '2-in-60 counts overlapping adjacent valid pairs inside 180 seconds');
select is((select value from public.get_statistics_sequence_metrics(
  array['96000000-0000-0000-0000-000000000002'::uuid], null,
  '96000000-0000-0000-0000-000000000101')
  where metric_key = 'two-in-sixty-total'), 4::numeric,
  '2-in-60 excludes adjacent valid attempts outside the 180-second window');
select is((select value from public.get_statistics_sequence_metrics(
  array['96000000-0000-0000-0000-000000000007'::uuid], null,
  '96000000-0000-0000-0000-000000000105')
  where metric_key = 'two-in-sixty-total'), 3::numeric,
  'DNF is not a 2-in-60 pair member and valid adjacency remains canonical');
select ok(not exists (select 1 from public.get_statistics_sequence_metrics(
  array['96000000-0000-0000-0000-000000000005'::uuid,
    '96000000-0000-0000-0000-000000000010'::uuid], null,
  '96000000-0000-0000-0000-000000000101')
  where metric_key like 'two-in-sixty-%'),
  'AK and archived players never produce 2-in-60 metrics');
select is((select value from public.get_statistics_sequence_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], 2026, null)
  where metric_key = 'two-in-sixty-total'), 9::numeric,
  '2-in-60 respects season scope');
select ok(not exists (select 1 from public.get_statistics_sequence_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], 2025, null)
  where metric_key like 'two-in-sixty-%'),
  '2-in-60 does not leak pairs into another season');
select is((select value from public.get_statistics_sequence_metrics(
  array['96000000-0000-0000-0000-000000000001'::uuid], null,
  '96000000-0000-0000-0000-000000000101')
  where metric_key = 'two-in-sixty-best'), 399::numeric,
  'fastest 2-in-60 is the minimum qualifying adjacent pair sum');
select ok(exists (
  select 1
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') metric,
    jsonb_array_elements(metric->'rankings') ranking
  where metric->>'key' = 'two-in-sixty-best'
    and ranking->>'playerId' = '96000000-0000-0000-0000-000000000004'
    and (ranking->>'total')::numeric = 1
), 'one qualifying 2-in-60 pair is sufficient for the fastest-pair ranking');
select ok(not exists (select 1 from public.get_statistics_sequence_metrics(
  null, null, null) where metric_key = 'two-in-sixty-best-five'),
  'the retired best-five 2-in-60 metric is absent');
select is((select count(*)
  from jsonb_array_elements(public.get_unified_statistics_dashboard(null,
    '96000000-0000-0000-0000-000000000101')->'metrics') metric
  where metric->>'key' in ('two-in-sixty-total', 'two-in-sixty-best')),
  2::bigint, 'each 2-in-60 metric occurs exactly once in the dashboard');

select * from finish();
rollback;
