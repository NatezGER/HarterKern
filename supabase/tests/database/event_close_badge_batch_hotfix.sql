begin;
select plan(10);

select has_function('public', 'sync_player_badge_award_ledgers',
  array['uuid[]'], 'batched player ledger synchronization exists');
select ok(
  pg_get_functiondef(
    'public.refresh_badge_ledger_after_event_change()'::regprocedure
  ) ~ 'array_agg\(affected.player_id order by affected.player_id\)[\s\S]*sync_player_badge_award_ledgers\(requested_player_ids\)',
  'event changes invoke one deduplicated batch synchronization'
);

insert into public.players (id, display_name, is_ak) values
  ('e5140000-0000-0000-0000-000000000001', 'Close Gold', false),
  ('e5140000-0000-0000-0000-000000000002', 'Close Silver', false),
  ('e5140000-0000-0000-0000-000000000003', 'Close Bronze', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, awards_trophies,
  trophy_competition_key, trophy_competition_year
) values (
  'e5140000-0000-0000-0000-000000000010', 'Close Batch Trophy Event',
  current_date, now() - interval '2 hours', now() + interval '1 hour',
  'active', true, 'denmark', 2026
);

insert into public.event_participants (event_id, player_id) values
  ('e5140000-0000-0000-0000-000000000010',
    'e5140000-0000-0000-0000-000000000001'),
  ('e5140000-0000-0000-0000-000000000010',
    'e5140000-0000-0000-0000-000000000002'),
  ('e5140000-0000-0000-0000-000000000010',
    'e5140000-0000-0000-0000-000000000003');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  submitted_at, approved_at, source
) values
  ('e5140000-0000-0000-0000-000000000101',
    'e5140000-0000-0000-0000-000000000001',
    'e5140000-0000-0000-0000-000000000010', 'approved', 210, false,
    now() - interval '90 minutes', now() - interval '90 minutes', 'admin'),
  ('e5140000-0000-0000-0000-000000000102',
    'e5140000-0000-0000-0000-000000000002',
    'e5140000-0000-0000-0000-000000000010', 'approved', 250, false,
    now() - interval '80 minutes', now() - interval '80 minutes', 'admin'),
  ('e5140000-0000-0000-0000-000000000103',
    'e5140000-0000-0000-0000-000000000003',
    'e5140000-0000-0000-0000-000000000010', 'approved', 290, false,
    now() - interval '70 minutes', now() - interval '70 minutes', 'admin');

insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at, awarded_at
)
select concat('close-hotfix:stale:', players.id), players.id,
  definitions.badge_key, 'hotfix-fixture', now(), now()
from public.players players
cross join lateral (
  select badge_key from public.badge_definitions order by badge_key limit 1
) definitions
where players.id::text like 'e5140000-%';

set local statement_timeout = '5s';
select lives_ok(
  $$select public.sync_close_event(
    'e5140000-0000-0000-0000-000000000010', 'manual')$$,
  'multi-player trophy event closes on the first call'
);

select is((select status::text from public.events
  where id = 'e5140000-0000-0000-0000-000000000010'),
  'closed', 'event status is committed as closed');
select is((select count(*) from public.player_badge_award_ledger
  where award_key like 'close-hotfix:stale:%'),
  0::bigint, 'the close batch reconciles every participant ledger');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = 'e5140000-0000-0000-0000-000000000001'
    and badge_key = 'event-wins-bronze'),
  1::bigint, 'the winner badge remains available immediately after close');
select is((select count(*) from public.player_trophies
  where competition_id = 'e5140000-0000-0000-0000-000000000010'),
  3::bigint, 'all three event trophies remain derived after close');
select results_eq(
  $$select placement, trophy_tier::text from public.player_trophies
    where competition_id = 'e5140000-0000-0000-0000-000000000010'
    order by placement$$,
  $$values (1, 'gold'), (2, 'silver'), (3, 'bronze')$$,
  'trophy placements and tiers remain unchanged'
);
select results_eq(
  $$select best_time_hundredths from public.player_trophies
    where competition_id = 'e5140000-0000-0000-0000-000000000010'
    order by placement$$,
  $$values (210), (250), (290)$$,
  'trophies retain the final event best times'
);
select is((select count(*) from public.event_podium
  where event_id = 'e5140000-0000-0000-0000-000000000010'),
  3::bigint, 'the canonical event podium remains complete');

select * from finish();
rollback;
