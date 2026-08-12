begin;
create extension if not exists pgtap;
select plan(24);

insert into public.players (id, display_name, is_ak) values
  ('9c100000-0000-0000-0000-000000000001', 'Player One', false),
  ('9c100000-0000-0000-0000-000000000002', 'Player Two', false),
  ('9c100000-0000-0000-0000-000000000003', 'Player Three', false),
  ('9c100000-0000-0000-0000-000000000004', 'AK Player', true);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at, awards_trophies
) values
  ('9c100000-0000-0000-0000-000000000010', 'Two Players', date '2026-01-01',
   timestamptz '2026-01-01 18:00:00+00', timestamptz '2026-01-02 18:00:00+00',
   'closed', timestamptz '2026-01-02 18:00:00+00', false),
  ('9c100000-0000-0000-0000-000000000011', 'Three Players', date '2026-02-01',
   timestamptz '2026-02-01 18:00:00+00', timestamptz '2026-02-02 18:00:00+00',
   'closed', timestamptz '2026-02-02 18:00:00+00', false),
  ('9c100000-0000-0000-0000-000000000012', 'DNF Third', date '2026-03-01',
   timestamptz '2026-03-01 18:00:00+00', timestamptz '2026-03-02 18:00:00+00',
   'closed', timestamptz '2026-03-02 18:00:00+00', false),
  ('9c100000-0000-0000-0000-000000000013', 'AK Third', date '2026-04-01',
   timestamptz '2026-04-01 18:00:00+00', timestamptz '2026-04-02 18:00:00+00',
   'closed', timestamptz '2026-04-02 18:00:00+00', false),
  ('9c100000-0000-0000-0000-000000000014', 'Invalid Third', date '2026-05-01',
   timestamptz '2026-05-01 18:00:00+00', timestamptz '2026-05-02 18:00:00+00',
   'closed', timestamptz '2026-05-02 18:00:00+00', false),
  ('9c100000-0000-0000-0000-000000000015', 'One Player', date '2026-06-01',
   timestamptz '2026-06-01 18:00:00+00', timestamptz '2026-06-02 18:00:00+00',
   'closed', timestamptz '2026-06-02 18:00:00+00', false),
  ('9c100000-0000-0000-0000-000000000016', 'Special Event', date '2026-07-01',
   timestamptz '2026-07-01 18:00:00+00', timestamptz '2026-07-02 18:00:00+00',
   'closed', timestamptz '2026-07-02 18:00:00+00', true);

insert into public.event_participants (event_id, player_id) values
  ('9c100000-0000-0000-0000-000000000010', '9c100000-0000-0000-0000-000000000001'),
  ('9c100000-0000-0000-0000-000000000010', '9c100000-0000-0000-0000-000000000002'),
  ('9c100000-0000-0000-0000-000000000011', '9c100000-0000-0000-0000-000000000001'),
  ('9c100000-0000-0000-0000-000000000011', '9c100000-0000-0000-0000-000000000002'),
  ('9c100000-0000-0000-0000-000000000011', '9c100000-0000-0000-0000-000000000003'),
  ('9c100000-0000-0000-0000-000000000012', '9c100000-0000-0000-0000-000000000001'),
  ('9c100000-0000-0000-0000-000000000012', '9c100000-0000-0000-0000-000000000002'),
  ('9c100000-0000-0000-0000-000000000012', '9c100000-0000-0000-0000-000000000003'),
  ('9c100000-0000-0000-0000-000000000013', '9c100000-0000-0000-0000-000000000001'),
  ('9c100000-0000-0000-0000-000000000013', '9c100000-0000-0000-0000-000000000002'),
  ('9c100000-0000-0000-0000-000000000013', '9c100000-0000-0000-0000-000000000004'),
  ('9c100000-0000-0000-0000-000000000014', '9c100000-0000-0000-0000-000000000001'),
  ('9c100000-0000-0000-0000-000000000014', '9c100000-0000-0000-0000-000000000002'),
  ('9c100000-0000-0000-0000-000000000014', '9c100000-0000-0000-0000-000000000003'),
  ('9c100000-0000-0000-0000-000000000015', '9c100000-0000-0000-0000-000000000001'),
  ('9c100000-0000-0000-0000-000000000016', '9c100000-0000-0000-0000-000000000001'),
  ('9c100000-0000-0000-0000-000000000016', '9c100000-0000-0000-0000-000000000002'),
  ('9c100000-0000-0000-0000-000000000016', '9c100000-0000-0000-0000-000000000003');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('9c100000-0000-0000-0000-000000000101', '9c100000-0000-0000-0000-000000000001', '9c100000-0000-0000-0000-000000000010', 'approved', 250, false, false, timestamptz '2026-01-01 19:00:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000102', '9c100000-0000-0000-0000-000000000002', '9c100000-0000-0000-0000-000000000010', 'approved', 300, false, false, timestamptz '2026-01-01 19:01:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000111', '9c100000-0000-0000-0000-000000000001', '9c100000-0000-0000-0000-000000000011', 'approved', 260, false, false, timestamptz '2026-02-01 19:00:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000112', '9c100000-0000-0000-0000-000000000002', '9c100000-0000-0000-0000-000000000011', 'approved', 310, false, false, timestamptz '2026-02-01 19:01:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000113', '9c100000-0000-0000-0000-000000000003', '9c100000-0000-0000-0000-000000000011', 'approved', 320, false, false, timestamptz '2026-02-01 19:02:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000121', '9c100000-0000-0000-0000-000000000001', '9c100000-0000-0000-0000-000000000012', 'approved', 270, false, false, timestamptz '2026-03-01 19:00:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000122', '9c100000-0000-0000-0000-000000000002', '9c100000-0000-0000-0000-000000000012', 'approved', 330, false, false, timestamptz '2026-03-01 19:01:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000123', '9c100000-0000-0000-0000-000000000003', '9c100000-0000-0000-0000-000000000012', 'approved', null, true, false, timestamptz '2026-03-01 19:02:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000131', '9c100000-0000-0000-0000-000000000001', '9c100000-0000-0000-0000-000000000013', 'approved', 280, false, false, timestamptz '2026-04-01 19:00:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000132', '9c100000-0000-0000-0000-000000000002', '9c100000-0000-0000-0000-000000000013', 'approved', 340, false, false, timestamptz '2026-04-01 19:01:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000133', '9c100000-0000-0000-0000-000000000004', '9c100000-0000-0000-0000-000000000013', 'approved', 350, false, true, timestamptz '2026-04-01 19:02:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000141', '9c100000-0000-0000-0000-000000000001', '9c100000-0000-0000-0000-000000000014', 'approved', 290, false, false, timestamptz '2026-05-01 19:00:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000142', '9c100000-0000-0000-0000-000000000002', '9c100000-0000-0000-0000-000000000014', 'approved', 360, false, false, timestamptz '2026-05-01 19:01:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000143', '9c100000-0000-0000-0000-000000000003', '9c100000-0000-0000-0000-000000000014', 'approved', 370, false, false, timestamptz '2026-05-01 19:02:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000151', '9c100000-0000-0000-0000-000000000001', '9c100000-0000-0000-0000-000000000015', 'approved', 295, false, false, timestamptz '2026-06-01 19:00:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000161', '9c100000-0000-0000-0000-000000000001', '9c100000-0000-0000-0000-000000000016', 'approved', 265, false, false, timestamptz '2026-07-01 19:00:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000162', '9c100000-0000-0000-0000-000000000002', '9c100000-0000-0000-0000-000000000016', 'approved', 315, false, false, timestamptz '2026-07-01 19:01:00+00', 'admin'),
  ('9c100000-0000-0000-0000-000000000163', '9c100000-0000-0000-0000-000000000003', '9c100000-0000-0000-0000-000000000016', 'approved', 325, false, false, timestamptz '2026-07-01 19:02:00+00', 'admin');

update public.attempts set deleted_at = now()
where id = '9c100000-0000-0000-0000-000000000143';

select ok(not exists (select 1 from public.qualified_events where event_id = '9c100000-0000-0000-0000-000000000010'), 'two-player normal event has no medal podium');
select ok(exists (select 1 from public.event_winners where event_id = '9c100000-0000-0000-0000-000000000010' and player_id = '9c100000-0000-0000-0000-000000000001'), 'two-player event still has a winner');
select is((select personal_best_hundredths from public.player_statistics where player_id = '9c100000-0000-0000-0000-000000000001'), 250, 'two-player event still sets all-time PB');
select is((select valid_attempts from public.player_statistics where player_id = '9c100000-0000-0000-0000-000000000001'), 7, 'all event attempts still count');
select is((select count(*) from public.qualified_event_podium where event_id = '9c100000-0000-0000-0000-000000000010'), 0::bigint, 'two-player event awards no medals');
select results_eq($$select event_participations, event_wins, second_places, third_places from public.player_statistics where player_id = '9c100000-0000-0000-0000-000000000001'$$, $$values (7::bigint, 7::bigint, 0::bigint, 0::bigint)$$, 'all-time participation and wins include every event');
select ok(exists (select 1 from public.qualified_events where event_id = '9c100000-0000-0000-0000-000000000011'), 'three valid regular players qualify normal medals');
select is((select count(*) from public.qualified_event_podium where event_id = '9c100000-0000-0000-0000-000000000011'), 3::bigint, 'qualified normal event awards its podium medals');
select ok(not exists (select 1 from public.qualified_events where event_id = '9c100000-0000-0000-0000-000000000012'), 'DNF-only third player does not qualify medals');
select ok(exists (select 1 from public.event_winners where event_id = '9c100000-0000-0000-0000-000000000012'), 'DNF-third event still has a winner');
select ok(not exists (select 1 from public.qualified_events where event_id = '9c100000-0000-0000-0000-000000000013'), 'AK third player does not qualify medals');
select ok(not exists (select 1 from public.qualified_events where event_id = '9c100000-0000-0000-0000-000000000014'), 'deleted third attempt does not qualify medals');
select ok(not exists (select 1 from public.qualified_events where event_id = '9c100000-0000-0000-0000-000000000015'), 'one-player event has no medal podium');
select ok(exists (select 1 from public.event_winners where event_id = '9c100000-0000-0000-0000-000000000015'), 'one-player event still has a winner');
select ok(not exists (select 1 from public.qualified_event_podium where event_id = '9c100000-0000-0000-0000-000000000016'), 'special event receives no normal medals');
select ok(exists (select 1 from public.player_trophies where competition_id = '9c100000-0000-0000-0000-000000000016'), 'special event trophy logic remains active');
select is((select personal_best_hundredths from public.season_player_statistics where season_year = 2026 and player_id = '9c100000-0000-0000-0000-000000000001'), 250, 'two-player event still sets season PB');
select ok(exists (select 1 from public.season_world_record_history where season_year = 2026 and record_id = '9c100000-0000-0000-0000-000000000101'), 'two-player event still affects season WR progression');
select ok(exists (select 1 from public.get_player_season_pb_history('9c100000-0000-0000-0000-000000000001', 2026) where source_id = '9c100000-0000-0000-0000-000000000101'), 'two-player event still affects season PB progression');
select results_eq($$select event_participations, event_wins, second_places, third_places from public.season_player_statistics where season_year = 2026 and player_id = '9c100000-0000-0000-0000-000000000001'$$, $$values (7, 7, 0, 0)$$, 'season participation and wins include every event');
select ok(exists (select 1 from public.player_badge_awards where player_id = '9c100000-0000-0000-0000-000000000001' and badge_key = 'events-played-bronze'), 'all events advance participation badges');
select ok(not exists (select 1 from public.player_badge_awards where player_id = '9c100000-0000-0000-0000-000000000001' and badge_key = 'podiums-bronze'), 'only medal-qualified podiums advance podium badges');
select ok(exists (select 1 from public.player_badge_awards where player_id = '9c100000-0000-0000-0000-000000000001' and badge_key = 'event-wins-bronze'), 'all event wins advance win badges');
select ok(exists (select 1 from public.player_badge_awards where player_id = '9c100000-0000-0000-0000-000000000001' and badge_key = 'win-streak-bronze'), 'all consecutive event wins advance win-streak badges');

select * from finish();
rollback;
