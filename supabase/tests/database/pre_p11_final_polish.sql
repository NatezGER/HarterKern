begin;
create extension if not exists pgtap;
select plan(10);

insert into public.players (id, display_name, is_ak) values
  ('97000000-0000-0000-0000-000000000001', 'First Best', false),
  ('97000000-0000-0000-0000-000000000002', 'Self Break', false),
  ('97000000-0000-0000-0000-000000000003', 'Late Break', false);
insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values (
  '97000000-0000-0000-0000-000000000100', 'Break Test', date '2026-08-20',
  '2026-08-20 18:00:00+02', '2026-08-22 18:00:00+02', 'closed',
  '2026-08-23 18:00:00+02'
);
insert into public.attempts (
  id, event_id, player_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('97000000-0000-0000-0000-000000000201', '97000000-0000-0000-0000-000000000100', '97000000-0000-0000-0000-000000000001', 'approved', 400, false, false, '2026-08-20 18:01:00+02', 'admin'),
  ('97000000-0000-0000-0000-000000000202', '97000000-0000-0000-0000-000000000100', '97000000-0000-0000-0000-000000000002', 'approved', 350, false, false, '2026-08-20 18:02:00+02', 'admin'),
  ('97000000-0000-0000-0000-000000000203', '97000000-0000-0000-0000-000000000100', '97000000-0000-0000-0000-000000000003', 'approved', 350, false, false, '2026-08-20 18:03:00+02', 'admin'),
  ('97000000-0000-0000-0000-000000000204', '97000000-0000-0000-0000-000000000100', '97000000-0000-0000-0000-000000000002', 'approved', 340, false, false, '2026-08-20 18:04:00+02', 'admin'),
  ('97000000-0000-0000-0000-000000000205', '97000000-0000-0000-0000-000000000100', '97000000-0000-0000-0000-000000000003', 'approved', 330, false, false, '2026-08-20 18:05:00+02', 'admin');

select is((select count(*) from public.event_best_breaks
  where source_attempt_id = '97000000-0000-0000-0000-000000000201'),
  0::bigint, 'the first event best is not a break');
select is((select count(*) from public.event_best_breaks
  where source_attempt_id = '97000000-0000-0000-0000-000000000202'),
  1::bigint, 'a strict later event best is a break');
select is((select count(*) from public.event_best_breaks
  where source_attempt_id = '97000000-0000-0000-0000-000000000204'),
  1::bigint, 'the current leader breaking their own best counts');
select is((select count(*) from public.event_best_breaks
  where source_attempt_id = '97000000-0000-0000-0000-000000000203'),
  0::bigint, 'an identical event best is not a break');
select is((select event_best_breaks from public.event_lead_player_statistics_v2
  where player_id = '97000000-0000-0000-0000-000000000002'),
  2, 'player aggregation includes both strict breaks');
select is((select count(*) from public.event_lead_time_badge_awards
  where player_id = '97000000-0000-0000-0000-000000000003'
    and badge_key = 'event-lead-time-bronze'), 0::bigint,
  'zero-second lead at statistical event end does not award bronze');
select is((select count(*) from public.event_lead_time_badge_awards
  where player_id = '97000000-0000-0000-0000-000000000002'
    and badge_key = 'event-lead-time-bronze'), 1::bigint,
  'positive qualified lead duration awards bronze');
select is((select threshold from public.badge_definitions
  where badge_key = 'event-lead-time-silver'), 36000, 'silver requires 10 hours');
select is((select threshold from public.badge_definitions
  where badge_key = 'event-lead-time-gold'), 360000, 'gold requires 100 hours');
select is((select threshold from public.badge_definitions
  where badge_key = 'event-lead-time-diamond'), 3600000, 'diamond requires 1000 hours');

select * from finish();
rollback;
