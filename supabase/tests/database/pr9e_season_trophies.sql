begin;
create extension if not exists pgtap;
select plan(21);

insert into public.players (id, display_name, is_ak) values
  ('9e000000-0000-0000-0000-000000000001', 'Season Alpha', false),
  ('9e000000-0000-0000-0000-000000000002', 'Season Bravo', false),
  ('9e000000-0000-0000-0000-000000000003', 'Season Charlie', false),
  ('9e000000-0000-0000-0000-000000000004', 'Season Delta', false),
  ('9e000000-0000-0000-0000-000000000005', 'Season Echo', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at, awards_trophies
) values
  ('9e000000-0000-0000-0000-000000000010', 'Special Season Event',
   date '2026-06-01', timestamptz '2026-06-01 18:00:00+00',
   timestamptz '2026-06-02 18:00:00+00', 'closed',
   timestamptz '2026-06-02 18:00:00+00', true),
  ('9e000000-0000-0000-0000-000000000011', 'New Year Event',
   date '2026-12-31', timestamptz '2026-12-31 18:00:00+00',
   timestamptz '2027-01-02 18:00:00+00', 'active', null, false);

insert into public.event_participants (event_id, player_id) values
  ('9e000000-0000-0000-0000-000000000010', '9e000000-0000-0000-0000-000000000001'),
  ('9e000000-0000-0000-0000-000000000010', '9e000000-0000-0000-0000-000000000002'),
  ('9e000000-0000-0000-0000-000000000010', '9e000000-0000-0000-0000-000000000003');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('9e000000-0000-0000-0000-000000000101', '9e000000-0000-0000-0000-000000000001',
   '9e000000-0000-0000-0000-000000000010', 'approved', 300, false, false,
   timestamptz '2026-06-01 19:00:00+00', 'admin'),
  ('9e000000-0000-0000-0000-000000000102', '9e000000-0000-0000-0000-000000000002',
   '9e000000-0000-0000-0000-000000000010', 'approved', 320, false, false,
   timestamptz '2026-06-01 19:01:00+00', 'admin'),
  ('9e000000-0000-0000-0000-000000000103', '9e000000-0000-0000-0000-000000000003',
   '9e000000-0000-0000-0000-000000000010', 'approved', 340, false, false,
   timestamptz '2026-06-01 19:02:00+00', 'admin');

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths, sort_order, source
) values
  ('9e000000-0000-0000-0000-000000000201',
   '9e000000-0000-0000-0000-000000000002', 'Season Bravo',
   date '2026-05-01', 310, 1, 'admin'),
  ('9e000000-0000-0000-0000-000000000202',
   '9e000000-0000-0000-0000-000000000004', 'Season Delta',
   date '2025-05-01', 200, 1, 'admin'),
  ('9e000000-0000-0000-0000-000000000203',
   '9e000000-0000-0000-0000-000000000004', 'Season Delta',
   date '2027-05-01', 340, 1, 'admin'),
  ('9e000000-0000-0000-0000-000000000204',
   '9e000000-0000-0000-0000-000000000001', 'Season Alpha',
   date '2027-05-01', 300, 2, 'admin'),
  ('9e000000-0000-0000-0000-000000000205',
   '9e000000-0000-0000-0000-000000000002', 'Season Bravo',
   date '2027-05-01', 300, 3, 'admin'),
  ('9e000000-0000-0000-0000-000000000206',
   '9e000000-0000-0000-0000-000000000003', 'Season Charlie',
   date '2027-05-01', 320, 4, 'admin'),
  ('9e000000-0000-0000-0000-000000000207',
   '9e000000-0000-0000-0000-000000000004', 'Season Delta',
   date '2028-05-01', 400, 1, 'admin'),
  ('9e000000-0000-0000-0000-000000000208',
   '9e000000-0000-0000-0000-000000000001', 'Season Alpha',
   date '2029-05-01', 300, 1, 'admin'),
  ('9e000000-0000-0000-0000-000000000209',
   '9e000000-0000-0000-0000-000000000002', 'Season Bravo',
   date '2029-05-01', 300, 2, 'admin'),
  ('9e000000-0000-0000-0000-000000000210',
   '9e000000-0000-0000-0000-000000000003', 'Season Charlie',
   date '2029-05-01', 320, 3, 'admin'),
  ('9e000000-0000-0000-0000-000000000211',
   '9e000000-0000-0000-0000-000000000004', 'Season Delta',
   date '2029-05-01', 320, 4, 'admin'),
  ('9e000000-0000-0000-0000-000000000212',
   '9e000000-0000-0000-0000-000000000005', 'Season Echo',
   date '2029-05-01', 340, 5, 'admin');

select is(
  (select count(*) from public.get_season_trophies(timestamptz '2026-08-01 12:00:00+00')
   where season_key = '2026'),
  0::bigint,
  'the running 2026 season has no final trophies'
);

select is(
  (select is_finalized from public.get_season_finalization_status(
    timestamptz '2027-01-01 12:00:00+00'
  ) where season_year = 2026),
  false,
  'a 2026 event still active in 2027 blocks finalization'
);

select is(
  (select count(*) from public.get_season_trophies(timestamptz '2027-01-03 12:00:00+00')
   where season_key = '2026'),
  0::bigint,
  'an active New Year event blocks all season trophies'
);

update public.events
set status = 'closed', closed_at = timestamptz '2027-01-02 18:00:00+00'
where id = '9e000000-0000-0000-0000-000000000011';

select is(
  (select is_finalized from public.get_season_finalization_status(
    timestamptz '2027-01-03 12:00:00+00'
  ) where season_year = 2026),
  true,
  'closing the last active season event finalizes 2026'
);

select results_eq(
  $$select placement, player_id from public.get_season_trophies(
      timestamptz '2027-01-03 12:00:00+00'
    ) where season_key = '2026' order by placement$$,
  $$values
    (1, '9e000000-0000-0000-0000-000000000001'::uuid),
    (2, '9e000000-0000-0000-0000-000000000002'::uuid),
    (3, '9e000000-0000-0000-0000-000000000003'::uuid)$$,
  'the final trophies use the season Hall of Fame ranking'
);

select is(
  (select competition_name from public.get_season_trophies(
    timestamptz '2027-01-03 12:00:00+00'
  ) where season_key = '2026' and placement = 1),
  'Saisonmeister 2026',
  'first place is named season champion'
);

select is(
  (select best_time_hundredths from public.get_season_trophies(
    timestamptz '2027-01-03 12:00:00+00'
  ) where season_key = '2026' and player_id = '9e000000-0000-0000-0000-000000000002'),
  310,
  'a historical 2026 time influences the season podium'
);

update public.historical_attempts
set time_hundredths = 250
where id = '9e000000-0000-0000-0000-000000000201';

select is(
  (select player_id from public.get_season_trophies(
    timestamptz '2027-01-03 12:00:00+00'
  ) where season_key = '2026' and placement = 1),
  '9e000000-0000-0000-0000-000000000002'::uuid,
  'an admin correction dynamically moves the season championship'
);

select is(
  (select placement from public.get_season_trophies(
    timestamptz '2027-01-03 12:00:00+00'
  ) where season_key = '2026' and player_id = '9e000000-0000-0000-0000-000000000001'),
  2,
  'the previous champion dynamically moves to the corrected placement'
);

select ok(
  exists (
    select 1 from public.get_season_trophies(timestamptz '2027-01-03 12:00:00+00')
    where trophy_key = concat(
      'season-trophy:2026:9e000000-0000-0000-0000-000000000002:1'
    )
  ),
  'the corrected champion receives the new stable champion key'
);

select ok(
  not exists (
    select 1 from public.get_season_trophies(timestamptz '2027-01-03 12:00:00+00')
    where trophy_key = concat(
      'season-trophy:2026:9e000000-0000-0000-0000-000000000001:1'
    )
  ),
  'the previous champion no longer retains the stale champion key'
);

select ok(
  exists (
    select 1 from public.get_season_trophies(timestamptz '2027-01-03 12:00:00+00')
    where trophy_key = concat(
      'season-trophy:2026:9e000000-0000-0000-0000-000000000001:2'
    )
  ),
  'the previous champion receives only the recalculated second-place key'
);

select is(
  (select count(*) from public.get_season_trophies(timestamptz '2029-01-02 12:00:00+00')
   where season_key = '2028'),
  1::bigint,
  'a season with fewer than three qualified players awards only existing places'
);

select results_eq(
  $$select placement, player_id from public.get_season_trophies(
      timestamptz '2028-01-02 12:00:00+00'
    ) where season_key = '2027' order by placement, player_id$$,
  $$values
    (1, '9e000000-0000-0000-0000-000000000001'::uuid),
    (1, '9e000000-0000-0000-0000-000000000002'::uuid),
    (2, '9e000000-0000-0000-0000-000000000003'::uuid),
    (3, '9e000000-0000-0000-0000-000000000004'::uuid)$$,
  'dense rank awards two champions followed by places two and three'
);

select results_eq(
  $$select placement, player_id from public.get_season_trophies(
      timestamptz '2030-01-02 12:00:00+00'
    ) where season_key = '2029' order by placement, player_id$$,
  $$values
    (1, '9e000000-0000-0000-0000-000000000001'::uuid),
    (1, '9e000000-0000-0000-0000-000000000002'::uuid),
    (2, '9e000000-0000-0000-0000-000000000003'::uuid),
    (2, '9e000000-0000-0000-0000-000000000004'::uuid),
    (3, '9e000000-0000-0000-0000-000000000005'::uuid)$$,
  'dense rank can award five trophies across tied ranks one and two'
);

select ok(
  not exists (
    select 1 from public.get_season_trophies(timestamptz '2028-01-02 12:00:00+00')
    where competition_year < 2026
  ),
  'no season trophy exists before 2026'
);

select is(
  (select count(*) from public.player_trophies
   where competition_id = '9e000000-0000-0000-0000-000000000010'),
  3::bigint,
  'existing special event trophies remain unchanged'
);

select is(
  (select count(*) from public.get_player_trophies(
    '9e000000-0000-0000-0000-000000000004'
  )),
  0::bigint,
  'a player without currently finalized season trophies loads without an error'
);

select unlike(
  pg_get_viewdef('public.player_trophies'::regclass, true),
  '%season_trophies%',
  'event trophy view has no season trophy dependency'
);

select unlike(
  pg_get_functiondef('public.get_player_trophies(uuid)'::regprocedure),
  '%from public.season_trophies%',
  'player trophy RPC does not build every season trophy before filtering'
);

select like(
  pg_get_functiondef('public.get_player_trophies(uuid)'::regprocedure),
  '%hof.player_id = p_player_id%',
  'player trophy RPC filters the ranked Hall of Fame to the requested player'
);

select * from finish();
rollback;
