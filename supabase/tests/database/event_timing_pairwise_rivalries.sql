begin;
create extension if not exists pgtap;
select plan(28);

insert into public.players (id, display_name) values
  ('60000000-0000-0000-0000-000000000001', 'Timing A'),
  ('60000000-0000-0000-0000-000000000002', 'Timing B'),
  ('60000000-0000-0000-0000-000000000003', 'Timing C'),
  ('60000000-0000-0000-0000-000000000004', 'Timing D');

insert into public.events (id, name, start_date, started_at, ends_at, status, closed_at) values
  ('60000000-0000-0000-0000-000000000101', 'Pairwise', '2026-10-01', '2026-10-01 00:00Z', '2026-10-02 23:00Z', 'closed', '2026-10-02 20:00Z'),
  ('60000000-0000-0000-0000-000000000102', 'Only DNF', '2026-10-03', '2026-10-03 00:00Z', '2026-10-03 23:00Z', 'closed', '2026-10-03 22:00Z'),
  ('60000000-0000-0000-0000-000000000103', 'Two switches', '2026-10-04', '2026-10-04 00:00Z', '2026-10-04 23:00Z', 'closed', '2026-10-04 22:00Z'),
  ('60000000-0000-0000-0000-000000000104', 'Tie', '2026-10-05', '2026-10-05 00:00Z', '2026-10-05 23:00Z', 'closed', '2026-10-05 22:00Z');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, approved_at) values
  ('60000000-0000-0000-0000-000000001001','60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000101','approved',420,false,'2026-10-01 00:00Z','2026-10-01 00:00Z'),
  ('60000000-0000-0000-0000-000000001002','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000101','approved',null,true,'2026-10-01 00:01Z','2026-10-01 00:01Z'),
  ('60000000-0000-0000-0000-000000001003','60000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000101','approved',null,true,'2026-10-01 00:02Z','2026-10-01 00:02Z'),
  ('60000000-0000-0000-0000-000000001004','60000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000101','approved',200,false,'2026-10-01 00:03Z','2026-10-01 00:03Z'),
  ('60000000-0000-0000-0000-000000001005','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000101','approved',410,false,'2026-10-01 00:04Z','2026-10-01 00:04Z'),
  ('60000000-0000-0000-0000-000000001006','60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000101','approved',405,false,'2026-10-01 00:05Z','2026-10-01 00:05Z'),
  ('60000000-0000-0000-0000-000000001007','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000101','approved',399,false,'2026-10-01 00:06Z','2026-10-01 00:06Z'),
  ('60000000-0000-0000-0000-000000001009','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000101','approved',null,true,'2026-10-01 00:10Z','2026-10-01 00:10Z'),
  ('60000000-0000-0000-0000-000000001010','60000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000101','approved',null,true,'2026-10-01 00:20Z','2026-10-01 00:20Z'),
  ('60000000-0000-0000-0000-000000001101','60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000102','approved',null,true,'2026-10-03 00:01Z','2026-10-03 00:01Z'),
  ('60000000-0000-0000-0000-000000001102','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000102','approved',null,true,'2026-10-03 00:02Z','2026-10-03 00:02Z'),
  ('60000000-0000-0000-0000-000000001103','60000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000102','approved',null,true,'2026-10-03 00:03Z','2026-10-03 00:03Z'),
  ('60000000-0000-0000-0000-000000001201','60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000103','approved',500,false,'2026-10-04 00:01Z','2026-10-04 00:01Z'),
  ('60000000-0000-0000-0000-000000001202','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000103','approved',490,false,'2026-10-04 00:02Z','2026-10-04 00:02Z'),
  ('60000000-0000-0000-0000-000000001203','60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000103','approved',480,false,'2026-10-04 00:03Z','2026-10-04 00:03Z'),
  ('60000000-0000-0000-0000-000000001204','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000103','approved',470,false,'2026-10-04 00:04Z','2026-10-04 00:04Z'),
  ('60000000-0000-0000-0000-000000001301','60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000104','approved',500,false,'2026-10-05 00:01Z','2026-10-05 00:01Z'),
  ('60000000-0000-0000-0000-000000001302','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000104','approved',500,false,'2026-10-05 00:02Z','2026-10-05 00:02Z'),
  ('60000000-0000-0000-0000-000000001303','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000104','approved',490,false,'2026-10-05 00:03Z','2026-10-05 00:03Z');

insert into public.event_statistical_pauses (event_id, paused_at, resumed_at, description) values
  ('60000000-0000-0000-0000-000000000101','2026-10-01 00:05Z','2026-10-01 00:07Z','Attempt inside pause'),
  ('60000000-0000-0000-0000-000000000101','2026-10-01 00:06Z','2026-10-01 00:08Z','Overlapping pause'),
  ('60000000-0000-0000-0000-000000000102','2026-10-03 02:30Z','2026-10-03 19:30Z','Exact 17 hour pause');

select is((select statistical_started_at from public.event_statistical_windows where event_id='60000000-0000-0000-0000-000000000101'), '2026-10-01 00:00Z'::timestamptz, 'event starts at first official attempt');
select is((select statistical_ended_at from public.event_statistical_windows where event_id='60000000-0000-0000-0000-000000000101'), '2026-10-01 00:20Z'::timestamptz, 'event ends at last official DNF');
select is((select qualification_started_at from public.event_lead_windows where event_id='60000000-0000-0000-0000-000000000101'), '2026-10-01 00:02Z'::timestamptz, 'third player DNF starts leadership');
select ok(exists(select 1 from public.event_lead_windows where event_id='60000000-0000-0000-0000-000000000102'), 'all-DNF event has leadership window');
select is((select count(*) from public.event_lead_segments where event_id='60000000-0000-0000-0000-000000000102'), 0::bigint, 'all-DNF window initially has no leader');
select is((select max(lead_ended_at) from public.event_lead_segments where event_id='60000000-0000-0000-0000-000000000101'), '2026-10-01 00:20Z'::timestamptz, 'last DNF ends event leadership');
select isnt((select max(lead_ended_at) from public.event_lead_segments where event_id='60000000-0000-0000-0000-000000000101'), '2026-10-02 20:00Z'::timestamptz, 'closed_at does not extend leadership');
select is((select pair_started_at from public.rivalry_pair_events where event_id='60000000-0000-0000-0000-000000000101' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), '2026-10-01 00:01Z'::timestamptz, 'DNF starts pair window');
select ok((select low_lead_seconds > 0 from public.rivalry_pair_events where event_id='60000000-0000-0000-0000-000000000101' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), 'valid A leads while B only has DNF');
select ok(not exists(select 1 from public.event_pair_lead_segments where event_id='60000000-0000-0000-0000-000000000102' and leader_player_id is not null), 'both DNF have no pair leader');
select is((select previous_player_id from public.event_direct_lead_takeovers where source_attempt_id='60000000-0000-0000-0000-000000001005'), '60000000-0000-0000-0000-000000000001'::uuid, 'later valid B time takes pair lead');
select is((select duration_seconds from public.event_pair_lead_segments where event_id='60000000-0000-0000-0000-000000000101' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002' and lead_started_at='2026-10-01 00:06Z'), 120::bigint, 'leader established in pause accrues time only after resume');
select is((select pair_ended_at from public.rivalry_pair_events where event_id='60000000-0000-0000-0000-000000000101' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), '2026-10-01 00:10Z'::timestamptz, 'last pair DNF remains pair end');
select is(61200::bigint - public.event_active_elapsed_seconds('60000000-0000-0000-0000-000000000102','2026-10-03 02:30Z','2026-10-03 19:30Z'), 61200::bigint, 'complete 17 hour pause subtracts 61200 seconds');
select is(public.event_active_elapsed_seconds('60000000-0000-0000-0000-000000000101','2026-10-01 00:04Z','2026-10-01 00:06Z'), 60::bigint, 'partial pause overlap is subtracted');
select is(public.event_active_elapsed_seconds('60000000-0000-0000-0000-000000000101','2026-10-01 00:04Z','2026-10-01 00:09Z'), 120::bigint, 'overlapping pauses are merged before subtraction');
select ok(exists(select 1 from public.event_direct_lead_takeovers where source_attempt_id='60000000-0000-0000-0000-000000001006'), 'attempt inside pause changes pair leader');
select is((select duration_seconds from public.event_pair_lead_segments where event_id='60000000-0000-0000-0000-000000000101' and lead_started_at='2026-10-01 00:05Z'), 0::bigint, 'no pair lead time accrues during pause');
select is((select direct_takeovers from public.rivalry_pair_events where event_id='60000000-0000-0000-0000-000000000101' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), 3, 'three pair takeovers survive faster third player');
select ok((select is_rivalry_event from public.rivalry_pair_events where event_id='60000000-0000-0000-0000-000000000101' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), 'three takeovers form rivalry');
select ok(not exists(select 1 from public.event_direct_lead_takeovers where event_id='60000000-0000-0000-0000-000000000101' and source_attempt_id='60000000-0000-0000-0000-000000001004' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), 'third-player global lead creates no A/B takeover');
select is((select direct_takeovers from public.rivalry_pair_events where event_id='60000000-0000-0000-0000-000000000103' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), 2, 'non-rivalry direct takeovers remain counted');
select ok(not (select is_rivalry_event from public.rivalry_pair_events where event_id='60000000-0000-0000-0000-000000000103' and player_low_id='60000000-0000-0000-0000-000000000001' and player_high_id='60000000-0000-0000-0000-000000000002'), 'two takeovers do not form rivalry');
select is((select rivalry_events from public.get_pair_rivalry('60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',null) limit 1), 1, 'pair RPC uses canonical rivalry source');
select is((select count(*)::integer from public.get_player_rivalries('60000000-0000-0000-0000-000000000001')), 1, 'profile RPC uses canonical rivalry source');
select is((select current_progress from public.get_rivalry_badge_progress() where player_id='60000000-0000-0000-0000-000000000001'), 1, 'badge progress uses canonical rivalry source');
select is((select count(*)::integer from public.rivalry_badge_awards where player_id='60000000-0000-0000-0000-000000000001' and badge_key='rivalry-bronze'), 1, 'badge proof uses canonical rivalry source');
select is((select count(*)::integer from public.event_direct_lead_takeovers where event_id='60000000-0000-0000-0000-000000000104'), 0, 'tie and later establishment create no takeover');

select * from finish();
rollback;
