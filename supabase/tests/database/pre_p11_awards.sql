begin;
create extension if not exists pgtap;
select plan(25);

select is((select array_agg(threshold order by threshold)
  from public.badge_definitions where family_key = 'bingo-completion'),
  array[1,2,3,5], 'complete-card BINGO tiers are 1, 2, 3 and 5 hits');
select is((select design_variant from public.badge_definitions
  where badge_key = 'false-starter'), 'consolation',
  'existing ten-DNF false starter is presented as consolation');
select is((select threshold from public.badge_definitions
  where badge_key = 'false-starter'), 10,
  'false starter still requires ten DNF');
select is((select array_agg(design_variant order by badge_key)
  from public.badge_definitions
  where badge_key in ('photo-finish', 'reverse-gear', 'wooden-bronze-medal')),
  array['consolation','consolation','consolation'],
  'new ironic single badges use the consolation variant');

insert into public.players (id, display_name, is_ak) values
  ('99000000-0000-0000-0000-000000000001', 'Sub Three First', false),
  ('99000000-0000-0000-0000-000000000002', 'Sub Two First', false),
  ('99000000-0000-0000-0000-000000000003', 'BINGO Complete', false),
  ('99000000-0000-0000-0000-000000000004', 'Reverse Driver', false),
  ('99000000-0000-0000-0000-000000000005', 'DNF Starter', false);

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths,
  historical_label, sort_order
) values
  ('99000000-0000-0000-0000-000000000101',
   '99000000-0000-0000-0000-000000000001', 'Sub Three First',
   date '2020-01-01', 250, 'Award Test', 1);

select is((select count(*) from public.historical_player_trophies
  where trophy_key = 'historical:first-sub-2'), 0::bigint,
  'first sub-2 trophy is absent until someone qualifies');

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths,
  historical_label, sort_order
) values
  ('99000000-0000-0000-0000-000000000102',
   '99000000-0000-0000-0000-000000000002', 'Sub Two First',
   date '2021-01-01', 190, 'Award Test', 1);

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths,
  historical_label, sort_order
)
select gen_random_uuid(), '99000000-0000-0000-0000-000000000003'::uuid,
  'BINGO Complete', date '2022-01-01' + (hit_number - 1),
  300 + ending + ((hit_number - 1) * 100), 'BINGO Completion Test',
  ending * 10 + hit_number
from generate_series(0, 99) ending
cross join generate_series(1, 5) hit_number;

select is((select array_agg(threshold order by threshold)
  from public.bingo_card_completion_progress
  where player_id = '99000000-0000-0000-0000-000000000003'),
  array[1,2,3,5], 'a five-hit full card reaches every completion tier');
select is((select badge_key from public.visible_player_badges
  where player_id = '99000000-0000-0000-0000-000000000003'
    and family_key = 'bingo-completion'),
  'bingo-completion-diamond', 'only the highest complete-card tier is visible');
select is((select count(*) from public.visible_player_badges
  where player_id = '99000000-0000-0000-0000-000000000003'
    and family_key = 'bingo-completion'), 1::bigint,
  'complete-card family does not expose lower tiers beside diamond');

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at, awards_trophies
) values
  ('99000000-0000-0000-0000-000000000200', 'Photo and Reverse', date '2026-01-01',
   '2026-01-01 18:00:00+01', '2026-01-02 02:00:00+01', 'closed',
   '2026-01-02 02:00:00+01', true),
  ('99000000-0000-0000-0000-000000000201', 'Fourth 1', date '2026-02-01',
   '2026-02-01 18:00:00+01', '2026-02-02 02:00:00+01', 'closed', '2026-02-02 02:00:00+01', true),
  ('99000000-0000-0000-0000-000000000202', 'Fourth 2', date '2026-03-01',
   '2026-03-01 18:00:00+01', '2026-03-02 02:00:00+01', 'closed', '2026-03-02 02:00:00+01', true),
  ('99000000-0000-0000-0000-000000000203', 'Fourth 3', date '2026-04-01',
   '2026-04-01 18:00:00+01', '2026-04-02 02:00:00+01', 'closed', '2026-04-02 02:00:00+01', true),
  ('99000000-0000-0000-0000-000000000204', 'Fourth 4', date '2026-05-01',
   '2026-05-01 18:00:00+01', '2026-05-02 02:00:00+01', 'closed', '2026-05-02 02:00:00+01', true),
  ('99000000-0000-0000-0000-000000000205', 'Fourth 5', date '2026-06-01',
   '2026-06-01 18:00:00+01', '2026-06-02 02:00:00+01', 'closed', '2026-06-02 02:00:00+01', true);

insert into public.event_participants (event_id, player_id)
select e.id, p.id
from public.events e cross join public.players p
where e.id between '99000000-0000-0000-0000-000000000200'::uuid
  and '99000000-0000-0000-0000-000000000205'::uuid
  and p.id between '99000000-0000-0000-0000-000000000001'::uuid
  and '99000000-0000-0000-0000-000000000005'::uuid;

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  (gen_random_uuid(), '99000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000200', 'approved', 300, false, false, '2026-01-01 18:01:00+01', 'admin'),
  (gen_random_uuid(), '99000000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000200', 'approved', 301, false, false, '2026-01-01 18:02:00+01', 'admin'),
  (gen_random_uuid(), '99000000-0000-0000-0000-000000000004', '99000000-0000-0000-0000-000000000200', 'approved', 500, false, false, '2026-01-01 18:03:00+01', 'admin'),
  (gen_random_uuid(), '99000000-0000-0000-0000-000000000004', '99000000-0000-0000-0000-000000000200', 'approved', 501, false, false, '2026-01-01 18:04:00+01', 'admin'),
  (gen_random_uuid(), '99000000-0000-0000-0000-000000000004', '99000000-0000-0000-0000-000000000200', 'approved', 502, false, false, '2026-01-01 18:05:00+01', 'admin'),
  (gen_random_uuid(), '99000000-0000-0000-0000-000000000004', '99000000-0000-0000-0000-000000000200', 'approved', 503, false, false, '2026-01-01 18:06:00+01', 'admin'),
  (gen_random_uuid(), '99000000-0000-0000-0000-000000000004', '99000000-0000-0000-0000-000000000200', 'approved', 504, false, false, '2026-01-01 18:07:00+01', 'admin');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
)
select gen_random_uuid(), '99000000-0000-0000-0000-000000000005'::uuid,
  '99000000-0000-0000-0000-000000000200'::uuid, 'approved', null, true, false,
  timestamptz '2026-01-01 19:00:00+01' + (attempt_number || ' minutes')::interval,
  'admin'
from generate_series(1, 10) attempt_number;

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
)
select gen_random_uuid(), player_id, event_id, 'approved', time_hundredths,
  false, false, started_at + (player_order || ' minutes')::interval, 'admin'
from (
  select e.id event_id, e.started_at,
    p.player_id, p.time_hundredths, p.player_order
  from public.events e
  cross join (values
    ('99000000-0000-0000-0000-000000000002'::uuid, 300, 1),
    ('99000000-0000-0000-0000-000000000003'::uuid, 310, 2),
    ('99000000-0000-0000-0000-000000000004'::uuid, 320, 3),
    ('99000000-0000-0000-0000-000000000001'::uuid, 400, 4)
  ) p(player_id, time_hundredths, player_order)
  where e.id between '99000000-0000-0000-0000-000000000201'::uuid
    and '99000000-0000-0000-0000-000000000205'::uuid
) attempts;

select is((select count(*) from public.pre_p11_badge_awards
  where player_id = '99000000-0000-0000-0000-000000000002'
    and badge_key = 'photo-finish'), 1::bigint,
  'photo finish awards exactly one hundredth behind the prior final place');
select is((select count(*) from public.pre_p11_badge_awards
  where player_id = '99000000-0000-0000-0000-000000000004'
    and badge_key = 'reverse-gear'), 1::bigint,
  'five consecutively slower valid attempts award reverse gear');
select is((select count(*) from public.pre_p11_badge_awards
  where player_id = '99000000-0000-0000-0000-000000000001'
    and badge_key = 'wooden-bronze-medal'), 1::bigint,
  'the fifth qualified fourth place awards the wooden bronze medal');
select is((select count(*) from public.player_badge_awards
  where player_id = '99000000-0000-0000-0000-000000000005'
    and badge_key = 'false-starter'), 1::bigint,
  'the existing tenth-DNF award remains active');
select is((select count(*) from public.get_visible_player_badges(
    '99000000-0000-0000-0000-000000000002'::uuid)
  where badge_key = 'photo-finish'), 1::bigint,
  'profile badge RPC exposes a supplemental photo-finish award');
select is((select badge_key from public.get_visible_player_badges(
    '99000000-0000-0000-0000-000000000003'::uuid)
  where badge_key like 'bingo-completion-%'),
  'bingo-completion-diamond',
  'profile badge RPC exposes only the highest supplemental family tier');
select is((select count(*) from public.get_visible_player_badges(
    '99000000-0000-0000-0000-000000000003'::uuid)
  where badge_key like 'bingo-completion-%'), 1::bigint,
  'profile badge RPC keeps supplemental family awards deduplicated');
select is((select count(*) from public.get_visible_player_badges(
    '99000000-0000-0000-0000-000000000005'::uuid)
  where badge_key = 'false-starter'), 1::bigint,
  'profile badge RPC continues to expose existing awards');

select is((select player_id from public.historical_player_trophies
  where trophy_key = 'historical:first-sub-3'),
  '99000000-0000-0000-0000-000000000001'::uuid,
  'first qualified sub-3 trophy uses chronological source data');
select is((select player_id from public.historical_player_trophies
  where trophy_key = 'historical:first-sub-2'),
  '99000000-0000-0000-0000-000000000002'::uuid,
  'first qualified sub-2 trophy is omitted until and derived once achieved');
select is((select player_id from public.historical_player_trophies
  where trophy_key = 'historical:first-bingo-card'),
  '99000000-0000-0000-0000-000000000003'::uuid,
  'first full BINGO trophy uses the actual hundredth-ending completion time');
select is((select count(*) from public.player_trophies
  where competition_type = 'historical'), 3::bigint,
  'historical achievements are integrated into player trophies');
select is((select count(*) from public.player_trophies
  where competition_type = 'event' and competition_id = '99000000-0000-0000-0000-000000000200'),
  3::bigint, 'existing event trophy model remains unchanged');
select is((select array_agg(distinct competition_type order by competition_type)
  from public.get_player_trophies(
    '99000000-0000-0000-0000-000000000001'::uuid)
  where competition_type in ('event', 'historical')),
  array['event','historical'],
  'player trophy RPC combines event and historical trophies');
select ok(position('season_hall_of_fame' in pg_get_functiondef(
    'public.get_player_trophies(uuid)'::regprocedure)) > 0,
  'player trophy RPC continues to append finalized season trophies');
select is((select count(*) from public.badge_definitions
  where family_key = 'bingo' and is_active), 3::bigint,
  'existing BINGO line family remains unchanged');
select is((select count(*) from public.visible_player_badges
  where player_id = '99000000-0000-0000-0000-000000000003'
    and family_key = 'bingo'), 1::bigint,
  'existing BINGO line family still exposes only its highest tier');

select * from finish();
rollback;
