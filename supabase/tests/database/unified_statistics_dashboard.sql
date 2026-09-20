begin;
create extension if not exists pgtap;
select no_plan();

-- The fixture tests read models, not badge ledger synchronization.
alter table public.attempts disable trigger attempts_insert_refresh_badge_ledger;
alter table public.historical_attempts disable trigger historical_attempts_refresh_badge_ledger;
alter table public.event_participants disable trigger event_participants_refresh_badge_ledger;

insert into public.players (id, display_name, is_ak) values
  ('96000000-0000-0000-0000-000000000001', 'Stats A', false),
  ('96000000-0000-0000-0000-000000000002', 'Stats B', false),
  ('96000000-0000-0000-0000-000000000003', 'Stats C', false),
  ('96000000-0000-0000-0000-000000000004', 'Stats D', false),
  ('96000000-0000-0000-0000-000000000005', 'Stats AK', true);

insert into public.events (id, name, start_date, started_at, ends_at, status, closed_at, awards_trophies) values
  ('96000000-0000-0000-0000-000000000100', 'Old', '2025-09-01', '2025-09-01 09:00+00', '2025-09-01 20:00+00', 'closed', '2025-09-01 20:00+00', false),
  ('96000000-0000-0000-0000-000000000101', 'Trophy Live', '2026-09-01', '2026-09-01 09:00+00', '2026-09-01 20:00+00', 'active', null, true),
  ('96000000-0000-0000-0000-000000000102', 'Normal', '2026-09-02', '2026-09-02 09:00+00', '2026-09-02 20:00+00', 'closed', '2026-09-02 20:00+00', false);

insert into public.event_participants (event_id, player_id)
select '96000000-0000-0000-0000-000000000101', id from public.players
where id in ('96000000-0000-0000-0000-000000000001',
  '96000000-0000-0000-0000-000000000002',
  '96000000-0000-0000-0000-000000000003',
  '96000000-0000-0000-0000-000000000004');

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
  (19, 'C', 410), (20, 'C', 405), (21, 'D', 600), (22, 'D', 590)
) v(sequence, player, time_hundredths);

insert into public.attempts (
  player_id, event_id, status, time_hundredths, is_dnf, is_ak, submitted_at, source
) values (
  '96000000-0000-0000-0000-000000000003',
  '96000000-0000-0000-0000-000000000102',
  'approved', 100, false, false, '2026-09-02 10:00+00', 'admin'
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
   'approved', 40, false, false, '2026-09-01 11:01+00', 'admin', null);

insert into public.historical_attempts (
  player_id, display_name, attempt_date, time_hundredths, sort_order
) values (
  '96000000-0000-0000-0000-000000000001', 'Stats A', '2025-08-01', 90, 1
);

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

select * from finish();
rollback;
