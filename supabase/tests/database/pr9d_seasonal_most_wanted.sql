begin;
create extension if not exists pgtap;
select plan(14);

insert into public.players (id, display_name, is_ak) values
  ('9d000000-0000-0000-0000-000000000001', 'Season Hunter', false),
  ('9d000000-0000-0000-0000-000000000002', 'AK Hunter', true);

insert into public.events (id, name, start_date, started_at, ends_at, status, closed_at)
values
  ('9d000000-0000-0000-0000-000000000010', 'New Year Event', date '2026-12-31',
   timestamptz '2026-12-31 18:00:00+00', timestamptz '2027-01-02 18:00:00+00',
   'closed', timestamptz '2027-01-02 18:00:00+00'),
  ('9d000000-0000-0000-0000-000000000011', 'Invalid Event', date '2026-06-01',
   timestamptz '2026-06-01 18:00:00+00', timestamptz '2026-06-03 18:00:00+00',
   'closed', timestamptz '2026-06-03 18:00:00+00');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('9d000000-0000-0000-0000-000000000101', '9d000000-0000-0000-0000-000000000001',
   '9d000000-0000-0000-0000-000000000010', 'approved', 326, false, false,
   timestamptz '2027-01-01 01:00:00+00', 'admin'),
  ('9d000000-0000-0000-0000-000000000102', '9d000000-0000-0000-0000-000000000001',
   '9d000000-0000-0000-0000-000000000011', 'approved', null, true, false,
   timestamptz '2026-06-01 20:00:00+00', 'admin'),
  ('9d000000-0000-0000-0000-000000000103', '9d000000-0000-0000-0000-000000000002',
   '9d000000-0000-0000-0000-000000000011', 'approved', 327, false, true,
   timestamptz '2026-06-01 20:01:00+00', 'admin'),
  ('9d000000-0000-0000-0000-000000000104', '9d000000-0000-0000-0000-000000000001',
   '9d000000-0000-0000-0000-000000000011', 'approved', 330, false, false,
   timestamptz '2026-06-01 20:02:00+00', 'admin'),
  ('9d000000-0000-0000-0000-000000000105', '9d000000-0000-0000-0000-000000000001',
   '9d000000-0000-0000-0000-000000000011', 'pending', 331, false, false,
   timestamptz '2026-06-01 20:03:00+00', 'public');

update public.attempts set deleted_at = now()
where id = '9d000000-0000-0000-0000-000000000104';

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths, sort_order,
  is_guest, out_of_competition
) values
  ('9d000000-0000-0000-0000-000000000201', '9d000000-0000-0000-0000-000000000001',
   'Season Hunter', date '2026-05-01', 207, 1, false, false),
  ('9d000000-0000-0000-0000-000000000202', '9d000000-0000-0000-0000-000000000001',
   'Season Hunter', date '2025-05-01', 199, 2, false, false),
  ('9d000000-0000-0000-0000-000000000203', '9d000000-0000-0000-0000-000000000001',
   'Season Hunter', date '2026-05-02', 180, 3, false, true);

select is((select count(*) from public.season_most_wanted_endings where season_year = 2026), 100::bigint, 'season starts with all 100 endings');
select ok((select achieved from public.season_most_wanted_endings where season_year = 2026 and ending = 26), 'event attempt hits season ending');
select is((select first_source_id from public.season_most_wanted_endings where season_year = 2026 and ending = 26), '9d000000-0000-0000-0000-000000000101'::uuid, 'event is assigned by start year despite later submission');
select ok((select achieved from public.season_most_wanted_endings where season_year = 2026 and ending = 7), 'historical 2026 time hits season ending');
select ok(not (select achieved from public.season_most_wanted_endings where season_year = 2026 and ending = 99), 'historical pre-2026 time does not hit season ending');
select ok(not (select achieved from public.season_most_wanted_endings where season_year = 2026 and ending = 27), 'AK time does not hit season ending');
select ok(not (select achieved from public.season_most_wanted_endings where season_year = 2026 and ending = 80), 'out-of-competition history does not hit season ending');
select ok(not (select achieved from public.season_most_wanted_endings where season_year = 2026 and ending = 30), 'deleted time does not hit season ending');
select ok(not (select achieved from public.season_most_wanted_endings where season_year = 2026 and ending = 31), 'unapproved time does not hit season ending');
select is((select reached_count from public.season_most_wanted_progress where season_year = 2026), 2, 'season progress counts only season hits');
select is((select first_display_name from public.season_most_wanted_endings where season_year = 2026 and ending = 26), 'Season Hunter', 'season hunter comes from season data');
select ok(exists (select 1 from public.most_wanted_endings where ending = 99 and achieved), 'all-time remains independent and includes older qualified history');
select ok(not exists (select 1 from public.season_qualified_official_times where season_year < 2026), 'season source has no season before 2026');
select is((select min(time_hundredths) from public.season_qualified_official_times where season_year = 2026), 207, 'season best includes qualified historical time and excludes faster AK/OOC sources');

select * from finish();
rollback;
