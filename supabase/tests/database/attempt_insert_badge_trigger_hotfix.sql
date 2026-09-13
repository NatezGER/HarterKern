begin;
select plan(8);

select has_function('public', 'refresh_badge_ledger_after_attempt_insert',
  array[]::text[], 'attempt ledger trigger function still exists');
select ok(
  pg_get_functiondef(
    'public.refresh_badge_ledger_after_attempt_insert()'::regprocedure
  ) ~ 'events.status <> ''active''',
  'active-event attempts are excluded from synchronous ledger refresh'
);

insert into public.players (id, display_name, is_ak) values
  ('a5130000-0000-0000-0000-000000000001', 'Attempt Hotfix One', false),
  ('a5130000-0000-0000-0000-000000000002', 'Attempt Hotfix Two', false),
  ('a5130000-0000-0000-0000-000000000003', 'Attempt Hotfix Three', false);

select lives_ok($$
  select public.sync_start_event_v3(
    'Attempt Hotfix Event', current_date,
    '[
      {"clientId":"one","id":"a5130000-0000-0000-0000-000000000001","name":"Attempt Hotfix One","kind":"permanent"},
      {"clientId":"two","id":"a5130000-0000-0000-0000-000000000002","name":"Attempt Hotfix Two","kind":"permanent"},
      {"clientId":"three","id":"a5130000-0000-0000-0000-000000000003","name":"Attempt Hotfix Three","kind":"permanent"}
    ]'::jsonb,
    null, null, 'attempt-trigger-hotfix', false
  )
$$, 'multi-participant event starts before attempt regression checks');

insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at, awarded_at
)
select 'hotfix:deferred-attempt',
  'a5130000-0000-0000-0000-000000000001'::uuid,
  definitions.badge_key, 'hotfix-fixture', now(), now()
from public.badge_definitions definitions
order by definitions.badge_key
limit 1;

set local statement_timeout = '5s';
select lives_ok($$
  do $attempts$
  declare
    selected_event uuid := (select id from public.events
      where legacy_source_id = 'attempt-trigger-hotfix');
    attempt_number integer;
  begin
    for attempt_number in 1..5 loop
      perform public.sync_create_event_attempt(
        ('a5130000-0000-0000-0001-' || lpad(attempt_number::text, 12, '0'))::uuid,
        selected_event,
        'a5130000-0000-0000-0000-000000000001'::uuid,
        'permanent',
        620 + attempt_number,
        false,
        now() + make_interval(secs => attempt_number)
      );
    end loop;
  end
  $attempts$
$$, 'multiple active-event attempt writes complete inside the short timeout');

select is((select count(*) from public.attempts attempts
  join public.events events on events.id = attempts.event_id
  where events.legacy_source_id = 'attempt-trigger-hotfix'),
  5::bigint, 'all normal attempts are persisted');
select is((select count(*) from public.player_badge_award_ledger
  where award_key = 'hotfix:deferred-attempt'),
  1::bigint, 'active attempt writes do not synchronously rebuild the ledger');

set local statement_timeout = '30s';
select lives_ok($$
  select public.sync_close_event(
    (select id from public.events where legacy_source_id = 'attempt-trigger-hotfix'),
    'manual'
  )
$$, 'existing event-close path performs the deferred ledger refresh');
select is((select count(*) from public.player_badge_award_ledger
  where award_key = 'hotfix:deferred-attempt'),
  0::bigint, 'event close removes stale ledger evidence');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = 'a5130000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-bronze'),
  1::bigint, 'event close persists the badge earned by the fifth attempt');

select * from finish();
rollback;
