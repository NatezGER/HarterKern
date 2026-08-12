begin;
create extension if not exists pgtap;
select plan(7);

insert into public.players (id, display_name, is_ak) values
  ('9b220000-0000-0000-0000-000000000001', 'Season History', false),
  ('9b220000-0000-0000-0000-000000000002', 'Preseason History', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values (
  '9b220000-0000-0000-0000-000000000010', 'New Year Event',
  date '2026-12-31', timestamptz '2026-12-31 20:00:00+00',
  timestamptz '2027-01-02 20:00:00+00', 'closed',
  timestamptz '2027-01-02 20:00:00+00'
);

insert into public.event_participants (event_id, player_id) values
  ('9b220000-0000-0000-0000-000000000010',
   '9b220000-0000-0000-0000-000000000001');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  submitted_at, source
) values (
  '9b220000-0000-0000-0000-000000000020',
  '9b220000-0000-0000-0000-000000000001',
  '9b220000-0000-0000-0000-000000000010', 'approved', 500, false,
  timestamptz '2027-01-01 01:00:00+00', 'admin'
);

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths, sort_order, source
) values
  ('9b220000-0000-0000-0000-000000000030',
   '9b220000-0000-0000-0000-000000000001', 'Season History',
   date '2026-06-01', 400, 1, 'admin'),
  ('9b220000-0000-0000-0000-000000000031',
   '9b220000-0000-0000-0000-000000000002', 'Preseason History',
   date '2025-06-01', 300, 1, 'admin');

select is(
  (select personal_best_hundredths from public.season_hall_of_fame
   where season_year = 2026
     and player_id = '9b220000-0000-0000-0000-000000000001'),
  400,
  '2026 historical time counts for the season hall of fame'
);

select is(
  (select personal_best_hundredths from public.season_player_statistics
   where season_year = 2026
     and player_id = '9b220000-0000-0000-0000-000000000001'),
  400,
  '2026 historical time can set the season PB'
);

select is(
  (select personal_best_hundredths from public.get_player_season_profile(
    '9b220000-0000-0000-0000-000000000001', 2026
  )),
  400,
  'player season profile includes the historical season PB'
);

select ok(
  not exists (
    select 1 from public.season_player_statistics
    where player_id = '9b220000-0000-0000-0000-000000000002'
  ),
  'historical times before 2026 create no season'
);

select results_eq(
  $$select approved_attempts, valid_attempts, dnf_count, average_hundredths,
      event_participations, event_wins, second_places, third_places
    from public.season_player_statistics
    where season_year = 2026
      and player_id = '9b220000-0000-0000-0000-000000000001'$$,
  $$values (1, 1, 0, 500, 1, 1, 0, 0)$$,
  'historical times do not change event statistics'
);

select is(
  (select personal_best_hundredths from public.season_player_statistics
   where season_year = 2026
     and player_id = '9b220000-0000-0000-0000-000000000001'),
  400,
  'an event starting on December 31 remains in its start season'
);

select ok(
  not exists (
    select 1 from public.season_player_statistics
    where season_year = 2027
      and player_id = '9b220000-0000-0000-0000-000000000001'
  ),
  'a later event attempt does not create a row in the following season'
);

select * from finish();
rollback;
