begin;
create extension if not exists pgtap;
select plan(11);

insert into public.players (id, display_name, is_ak) values
  ('98000000-0000-0000-0000-000000000001', 'Lead One', false),
  ('98000000-0000-0000-0000-000000000002', 'Lead Two', false),
  ('98000000-0000-0000-0000-000000000003', 'Lead Three', false),
  ('98000000-0000-0000-0000-000000000004', 'Lead Four', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values
  ('98000000-0000-0000-0000-000000000100', 'Qualified Lead Event', date '2026-08-01',
   '2026-08-01 18:00:00+02', '2026-08-03 18:00:00+02', 'closed',
   '2026-08-04 18:00:00+02'),
  ('98000000-0000-0000-0000-000000000101', 'Unqualified Lead Event', date '2026-08-02',
   '2026-08-02 18:00:00+02', '2026-08-04 18:00:00+02', 'closed',
   '2026-08-05 18:00:00+02');

insert into public.attempts (
  id, event_id, player_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('98000000-0000-0000-0000-000000000201', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000001', 'approved', 400, false, false, '2026-08-01 18:05:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000202', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000002', 'approved', 500, false, false, '2026-08-01 18:10:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000203', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000003', 'approved', 400, false, false, '2026-08-01 18:20:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000210', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000004', 'approved', 400, false, false, '2026-08-01 18:25:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000204', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000002', 'approved', 350, false, false, '2026-08-01 18:30:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000205', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000004', 'approved', 700, false, false, '2026-08-01 18:40:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000206', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000003', 'approved', 300, false, false, '2026-08-01 18:50:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000207', '98000000-0000-0000-0000-000000000100', '98000000-0000-0000-0000-000000000001', 'approved', null, true, false, '2026-08-01 19:00:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000208', '98000000-0000-0000-0000-000000000101', '98000000-0000-0000-0000-000000000001', 'approved', 400, false, false, '2026-08-02 18:05:00+02', 'admin'),
  ('98000000-0000-0000-0000-000000000209', '98000000-0000-0000-0000-000000000101', '98000000-0000-0000-0000-000000000002', 'approved', 500, false, false, '2026-08-02 18:10:00+02', 'admin');

select is((select min(lead_started_at) from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100'),
  '2026-08-01 18:20:00+02'::timestamptz,
  'lead time starts with the third qualified player');
select is((select player_id from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100' and sequence = 1),
  '98000000-0000-0000-0000-000000000001'::uuid,
  'the earlier attempt remains initial leader when qualification starts tied');
select is((select duration_seconds from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100' and sequence = 1),
  600::bigint, 'time before qualification is not credited');
select is((select array_agg(player_id order by sequence) from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100'),
  array['98000000-0000-0000-0000-000000000001'::uuid,
    '98000000-0000-0000-0000-000000000002'::uuid,
    '98000000-0000-0000-0000-000000000003'::uuid],
  'new strict event bests create deterministic lead segments');
select is((select count(*) from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100'
    and lead_started_at = '2026-08-01 18:25:00+02'::timestamptz),
  0::bigint, 'a later identical best time creates no lead segment');
select is((select max(lead_ended_at) from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100'),
  '2026-08-01 18:50:00+02'::timestamptz,
  'the last valid eligible attempt is the statistical event end');
select isnt((select max(lead_ended_at) from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100'),
  '2026-08-04 18:00:00+02'::timestamptz,
  'administrative closing does not extend lead time');
select is((select count(*) from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000101'), 0::bigint,
  'events with fewer than three qualified players have no lead statistics');
select is((select min(qualification_started_at) from public.event_lead_segments
  where event_id = '98000000-0000-0000-0000-000000000100'),
  '2026-08-01 18:20:00+02'::timestamptz,
  'a later fourth qualified player does not reset qualification');
select is((select lead_takeovers from public.event_lead_player_statistics
  where player_id = '98000000-0000-0000-0000-000000000002' and season_year = 2026),
  1, 'a strict lead change counts as a takeover');
select is((select lead_losses from public.event_lead_player_statistics
  where player_id = '98000000-0000-0000-0000-000000000001' and season_year = 2026),
  1, 'losing the lead to another player is counted');

select * from finish();
rollback;
