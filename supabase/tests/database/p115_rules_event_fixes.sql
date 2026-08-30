begin;
select plan(15);

select has_view('public', 'event_final_standings',
  'central final standings view exists');

insert into public.players (id, display_name) values
  ('38000000-0000-0000-0000-000000000001', 'Tie A'),
  ('38000000-0000-0000-0000-000000000002', 'Tie B'),
  ('38000000-0000-0000-0000-000000000003', 'Third'),
  ('38000000-0000-0000-0000-000000000004', 'Fourth');

insert into public.events (
  id, name, start_date, started_at, ends_at, status, awards_trophies
) values (
  '38000000-0000-0000-0000-000000000010', 'Competition Ranking',
  date '2026-08-30', now() - interval '2 hours', now() + interval '1 hour',
  'active', false
);

insert into public.event_participants (event_id, player_id)
select '38000000-0000-0000-0000-000000000010', id
from public.players where id::text like '38000000-%';

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  submitted_at, source
) values
  ('38000000-0000-0000-0000-000000000101',
    '38000000-0000-0000-0000-000000000001',
    '38000000-0000-0000-0000-000000000010', 'approved', 250, false,
    now() - interval '90 minutes', 'admin'),
  ('38000000-0000-0000-0000-000000000102',
    '38000000-0000-0000-0000-000000000002',
    '38000000-0000-0000-0000-000000000010', 'approved', 250, false,
    now() - interval '80 minutes', 'admin'),
  ('38000000-0000-0000-0000-000000000103',
    '38000000-0000-0000-0000-000000000003',
    '38000000-0000-0000-0000-000000000010', 'approved', 270, false,
    now() - interval '70 minutes', 'admin'),
  ('38000000-0000-0000-0000-000000000104',
    '38000000-0000-0000-0000-000000000004',
    '38000000-0000-0000-0000-000000000010', 'approved', 300, false,
    now() - interval '60 minutes', 'admin');

select is((select count(*) from public.event_final_standings
  where event_id = '38000000-0000-0000-0000-000000000010'), 0::bigint,
  'active events expose no final standings');
select is((select count(*) from public.event_podium
  where event_id = '38000000-0000-0000-0000-000000000010'), 0::bigint,
  'active events expose no final podium');
select is((select count(*) from public.event_winners
  where event_id = '38000000-0000-0000-0000-000000000010'), 0::bigint,
  'active events expose no final winner');
select is((select count(*) from public.player_badge_award_ledger
  where source_event_id = '38000000-0000-0000-0000-000000000010'
    and badge_key like 'event-wins-%'), 0::bigint,
  'active events create no final win badge in the ledger');

select lives_ok(
  $$select public.sync_close_event(
    '38000000-0000-0000-0000-000000000010', 'manual')$$,
  'event closes and synchronizes final awards'
);

select results_eq(
  $$select rank from public.event_final_standings
    where event_id = '38000000-0000-0000-0000-000000000010'
    order by best_time_hundredths, display_name$$,
  $$values (1), (1), (3), (4)$$,
  'equal first places use competition ranking 1, 1, 3, 4'
);
select is((select count(*) from public.event_winners
  where event_id = '38000000-0000-0000-0000-000000000010'), 2::bigint,
  'both tied first-place players are event winners');
select is((select count(*) from public.event_podium
  where event_id = '38000000-0000-0000-0000-000000000010'), 3::bigint,
  'podium includes both winners and competition rank three');
select is((select winner_player_id from public.events
  where id = '38000000-0000-0000-0000-000000000010'), null::uuid,
  'legacy singular winner field stays empty for a tie');
select is((select event_wins from public.player_statistics
  where player_id = '38000000-0000-0000-0000-000000000001'), 1::integer,
  'first tied player receives an event win');
select is((select event_wins from public.player_statistics
  where player_id = '38000000-0000-0000-0000-000000000002'), 1::integer,
  'second tied player receives an event win');
select is((select third_places from public.player_statistics
  where player_id = '38000000-0000-0000-0000-000000000003'), 1::integer,
  'competition rank three remains a podium result');
select is((select count(*) from public.player_badge_award_ledger
  where player_id in (
    '38000000-0000-0000-0000-000000000001',
    '38000000-0000-0000-0000-000000000002'
  ) and badge_key = 'event-wins-bronze'), 2::bigint,
  'closing the event projects the first-win tier once for both tied winners');
select results_eq(
  $$select rank from public.public_hall_of_fame
    where player_id::text like '38000000-%'
    order by personal_best_hundredths, display_name$$,
  $$values (1), (1), (3), (4)$$,
  'Hall of Fame uses the same competition ranking gaps'
);

select * from finish();
rollback;
