-- LOCAL disposable test database only. Fixtures are rolled back.
-- Requires migrations through 065 and pgTAP. Never run against production.
begin;
create extension if not exists pgtap;
select plan(9);

insert into public.players (id, display_name, is_ak)
select ('65000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'Team fixture ' || n, n = 14
from generate_series(1, 14) n;

insert into public.events (id, name, start_date, started_at, ends_at, status, closed_at)
values ('65000000-0000-0000-0001-000000000001', 'Team fixture', '2091-01-01',
  '2091-01-01 00:00Z', '2091-01-02 00:00Z', 'closed', '2091-01-02 00:00Z');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, approved_at)
select ('65000000-0000-0000-0002-' || lpad(n::text, 12, '0'))::uuid,
  ('65000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '65000000-0000-0000-0001-000000000001', 'approved', 200 + n, false,
  '2091-01-01 01:00Z'::timestamptz + n * interval '1 minute',
  '2091-01-01 01:00Z'::timestamptz + n * interval '1 minute'
from generate_series(1, 12) n;

insert into public.event_guests (id, event_id, display_name)
values ('65000000-0000-0000-0003-000000000001', '65000000-0000-0000-0001-000000000001', 'Event guest fixture');
insert into public.attempts (guest_id, event_id, status, time_hundredths, submitted_at, approved_at)
values ('65000000-0000-0000-0003-000000000001', '65000000-0000-0000-0001-000000000001', 'approved', 99, '2091-01-01 01:30Z', '2091-01-01 01:30Z');

-- Duplicate player's slower time must not become a second team member.
insert into public.attempts (player_id, event_id, status, time_hundredths, is_dnf, is_ak, submitted_at, approved_at)
values
 ('65000000-0000-0000-0000-000000000001', '65000000-0000-0000-0001-000000000001', 'approved', 501, false, false, '2091-01-01 02:00Z','2091-01-01 02:00Z'),
 ('65000000-0000-0000-0000-000000000013', '65000000-0000-0000-0001-000000000001', 'approved', null, true, false, '2091-01-01 02:01Z','2091-01-01 02:01Z'),
 ('65000000-0000-0000-0000-000000000013', '65000000-0000-0000-0001-000000000001', 'approved', 100, false, true, '2091-01-01 02:02Z','2091-01-01 02:02Z'),
 ('65000000-0000-0000-0000-000000000014', '65000000-0000-0000-0001-000000000001', 'approved', 100, false, false, '2091-01-01 02:03Z','2091-01-01 02:03Z');

insert into public.historical_attempts (player_id, display_name, attempt_date, time_hundredths)
values ('65000000-0000-0000-0000-000000000013', 'Team fixture 13', '2092-01-01', 199);
insert into public.historical_attempts (display_name, attempt_date, time_hundredths, is_guest, out_of_competition)
values ('Guest fixture', '2092-01-01', 100, true, true);

select is((public.get_team_milestones_snapshot(2091)->>'playerCount')::integer, 10,
  'at most ten distinct regular players, DNF and AK excluded');
select is((public.get_team_milestones_snapshot(2091)->>'teamTimeHundredths')::bigint, 2055::bigint,
  'sum exactly the ten fastest PBs: 201..210, no duplicate player');
select is((public.get_team_milestones_snapshot(2091)->>'validAttempts')::bigint, 13::bigint,
  'same event volume qualification as overview: twelve plus slower valid duplicate');
select is((public.get_team_milestones_snapshot(2092)->>'playerCount')::integer, 1,
  'partial team, seasonal historical regular PB included and guest excluded');
select is((public.get_team_milestones_snapshot(2092)->>'teamTimeHundredths')::bigint, 199::bigint,
  'partial sum uses only available player');
select is((public.get_team_milestones_snapshot(2092)->>'validAttempts')::bigint, 0::bigint,
  'historical PB does not change existing event-only beer volume');
select is((public.get_team_milestones_snapshot(2093)->>'playerCount')::integer, 0,
  'empty season has no players');
select ok(public.get_team_milestones_snapshot(2093)->'teamTimeHundredths' = 'null'::jsonb,
  'empty team has NULL time, not a fake zero');
select is((public.get_team_milestones_snapshot(null)->>'teamTimeHundredths')::bigint,
  (select sum(pb)::bigint from (
    select player_id, min(time_hundredths) pb
    from public.qualified_official_times
    where not is_guest and player_id is not null
    group by player_id order by pb, player_id limit 10
  ) expected), 'All-Time matches canonical qualified PBs including historical times');

select * from finish();
rollback;
