begin;
create extension if not exists pgtap;
select no_plan();

-- Fixture writes do not exercise the unrelated badge ledger hotpath.
alter table public.attempts disable trigger attempts_insert_refresh_badge_ledger;
alter table public.historical_attempts disable trigger historical_attempts_refresh_badge_ledger;
alter table public.event_participants disable trigger event_participants_refresh_badge_ledger;

insert into public.players (id, display_name, is_ak) values
  ('95000000-0000-0000-0000-000000000001', 'Runner A', false),
  ('95000000-0000-0000-0000-000000000002', 'Runner B', false),
  ('95000000-0000-0000-0000-000000000003', 'Runner C', false),
  ('95000000-0000-0000-0000-000000000004', 'Runner AK', true);

insert into public.events (id, name, start_date, started_at, ends_at, status, closed_at) values
  ('95000000-0000-0000-0000-000000000100', 'Older', '2026-08-25', '2026-08-25 09:00+00', '2026-08-25 20:00+00', 'closed', '2026-08-25 20:00+00'),
  ('95000000-0000-0000-0000-000000000101', 'Run Event', '2026-09-01', '2026-09-01 09:00+00', '2026-09-01 20:00+00', 'closed', '2026-09-01 20:00+00'),
  ('95000000-0000-0000-0000-000000000102', 'Current Event', '2026-09-10', '2026-09-10 09:00+00', '2026-09-10 20:00+00', 'closed', '2026-09-10 20:00+00');

insert into public.event_participants (event_id, player_id)
select '95000000-0000-0000-0000-000000000102', id
from public.players where id in (
  '95000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000002',
  '95000000-0000-0000-0000-000000000003');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  is_ak, submitted_at, source, deleted_at
) values
  -- B's first older attempt is 2.80; its faster second attempt is not a first-attempt benchmark.
  ('95100000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000100', 'approved', 280, false, false, '2026-08-25 10:00+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000100', 'approved', 200, false, false, '2026-08-25 10:10+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000100', 'approved', 350, false, false, '2026-08-25 10:00+00', 'admin', null),
  -- A+B and B+C overlap. B's separate attempt lies between A's first two.
  ('95100000-0000-0000-0000-000000000011', '95000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000101', 'approved', 300, false, false, '2026-09-01 10:00+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000012', '95000000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000101', 'approved', 310, false, false, '2026-09-01 10:01+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000013', '95000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000101', 'approved', 310, false, false, '2026-09-01 10:03+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000014', '95000000-0000-0000-0000-000000000002', '95000000-0000-0000-0000-000000000101', 'approved', 290, false, false, '2026-09-01 10:04+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000015', '95000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000101', 'approved', 290, false, false, '2026-09-01 10:05:59+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000016', '95000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000101', 'approved', 400, false, false, '2026-09-01 10:09+00', 'admin', null),
  -- Invalid rows cannot be pair members or official ranking entries.
  ('95100000-0000-0000-0000-000000000021', '95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000101', 'approved', 500, false, false, '2026-09-01 11:01+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000022', '95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000101', 'approved', null, true, false, '2026-09-01 11:02+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000023', '95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000101', 'approved', 100, false, false, '2026-09-01 11:02:30+00', 'admin', '2026-09-01 12:00+00'),
  ('95100000-0000-0000-0000-000000000024', '95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000101', 'approved', 100, false, true, '2026-09-01 11:03+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000025', '95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000101', 'approved', 500, false, false, '2026-09-01 11:04+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000026', '95000000-0000-0000-0000-000000000004', '95000000-0000-0000-0000-000000000101', 'approved', 100, false, false, '2026-09-01 11:01+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000027', '95000000-0000-0000-0000-000000000004', '95000000-0000-0000-0000-000000000101', 'approved', 100, false, false, '2026-09-01 11:02+00', 'admin', null),
  -- Current valid attempt hides A's historical benchmark; C has only a DNF.
  ('95100000-0000-0000-0000-000000000031', '95000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000102', 'approved', 320, false, false, '2026-09-10 10:00+00', 'admin', null),
  ('95100000-0000-0000-0000-000000000032', '95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000102', 'approved', null, true, false, '2026-09-10 10:00+00', 'admin', null);

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths, sort_order
) values (
  '95200000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001', 'Runner A', '2026-08-01', 190, 1
);

select is((select run_count from public.get_two_in_sixty_hall_of_fame('best')
  where player_id = '95000000-0000-0000-0000-000000000001'), 2::bigint,
  'A+B and B+C count; A+C, a >180-second gap and a different event do not');
select is((select sum_hundredths from public.get_two_in_sixty_hall_of_fame('best')
  where player_id = '95000000-0000-0000-0000-000000000001'), 600,
  'personal best uses the sum of the faster adjacent pair');
select is((select first_time_hundredths from public.get_two_in_sixty_hall_of_fame('best')
  where player_id = '95000000-0000-0000-0000-000000000001'), 310,
  'the best overlapping run starts with the middle attempt');
select is((select run_count from public.get_two_in_sixty_hall_of_fame('best')
  where player_id = '95000000-0000-0000-0000-000000000003'), 1::bigint,
  'DNF, deleted and AK attempts are skipped when finding adjacent valid attempts');
select ok(not exists (select 1 from public.get_two_in_sixty_hall_of_fame('best')
  where player_id = '95000000-0000-0000-0000-000000000004'),
  'AK player cannot appear in secret ranking');
select is((select rank from public.get_two_in_sixty_hall_of_fame('best')
  where player_id = '95000000-0000-0000-0000-000000000001'),
  (select rank from public.get_two_in_sixty_hall_of_fame('best')
  where player_id = '95000000-0000-0000-0000-000000000002'),
  'equal best sums have the same competition rank');
select ok((select rank from public.get_two_in_sixty_hall_of_fame('frequency')
  where player_id = '95000000-0000-0000-0000-000000000001') <
  (select rank from public.get_two_in_sixty_hall_of_fame('frequency')
  where player_id = '95000000-0000-0000-0000-000000000002'),
  'frequency mode ranks two runs ahead of one');

select ok(exists (select 1 from public.get_ranked_official_attempts(100,
  (select count(*)::integer from public.qualified_official_times
   where time_hundredths < 190)) where source_id = '95200000-0000-0000-0000-000000000001')
  and exists (select 1 from public.get_ranked_official_attempts(100,
  (select count(*)::integer from public.qualified_official_times
   where time_hundredths < 290)) where source_id = '95100000-0000-0000-0000-000000000015'),
  'the same player appears for separate historical and event attempts');
select is((select rank from public.get_ranked_official_attempts(100,
  (select count(*)::integer from public.qualified_official_times
   where time_hundredths < 290))
  where source_id = '95100000-0000-0000-0000-000000000015'),
  (select rank from public.get_ranked_official_attempts(100,
  (select count(*)::integer from public.qualified_official_times
   where time_hundredths < 290))
  where source_id = '95100000-0000-0000-0000-000000000014'),
  'equal times have the same official-attempt competition rank');
select ok(not exists (select 1 from public.qualified_official_times
  where source_id in ('95100000-0000-0000-0000-000000000022',
    '95100000-0000-0000-0000-000000000023',
    '95100000-0000-0000-0000-000000000024',
    '95100000-0000-0000-0000-000000000026')),
  'DNF, deleted, AK attempt and AK player are excluded');
select is((select count(*) from public.get_ranked_official_attempts(2, 0)),
  2::bigint, 'pagination limits the initial payload');
select ok(not exists (
  select 1 from public.get_ranked_official_attempts(2, 0) first_page
  join public.get_ranked_official_attempts(2, 2) second_page
    using (source_id)
), 'offset pagination does not repeat entries');
select is((select attempt_number from public.get_ranked_official_attempts(100,
  (select count(*)::integer from public.qualified_official_times
   where time_hundredths < 300))
  where source_id = '95100000-0000-0000-0000-000000000011'), 1,
  'event attempt number comes from the canonical attempt-detail view');

select is((select best_time_hundredths
  from public.get_event_first_attempt_benchmarks('95000000-0000-0000-0000-000000000102')
  where player_id = '95000000-0000-0000-0000-000000000002'), 280,
  'historical first-attempt best ignores a faster attempt number two');
select ok(not exists (select 1
  from public.get_event_first_attempt_benchmarks('95000000-0000-0000-0000-000000000102')
  where player_id = '95000000-0000-0000-0000-000000000001'),
  'benchmark disappears after the first valid current-event attempt');
select is((select best_time_hundredths
  from public.get_event_first_attempt_benchmarks('95000000-0000-0000-0000-000000000102')
  where player_id = '95000000-0000-0000-0000-000000000003'), 350,
  'current-event DNF does not hide a historical first-attempt benchmark');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  is_ak, submitted_at, source
) values (
  '95100000-0000-0000-0000-000000000033',
  '95000000-0000-0000-0000-000000000002',
  '95000000-0000-0000-0000-000000000102',
  'approved', 275, false, false, '2026-09-10 10:02+00', 'admin'
);
select ok(not exists (select 1
  from public.get_event_first_attempt_benchmarks('95000000-0000-0000-0000-000000000102')
  where player_id = '95000000-0000-0000-0000-000000000002'),
  'benchmark disappears after saving the first valid current-event time');

select * from finish();
rollback;
