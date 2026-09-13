begin;
select plan(7);

select has_function('public', 'refresh_badge_ledger_after_participant_change',
  array[]::text[], 'participant ledger trigger function still exists');
select ok(
  pg_get_functiondef(
    'public.refresh_badge_ledger_after_participant_change()'::regprocedure
  ) ~ 'tg_op = ''INSERT''[\s\S]*events.status = ''active''[\s\S]*return new',
  'active-event participant inserts have an early return'
);

insert into public.players (id, display_name, is_ak) values
  ('e5130000-0000-0000-0000-000000000001', 'Hotfix One', false),
  ('e5130000-0000-0000-0000-000000000002', 'Hotfix Two', false),
  ('e5130000-0000-0000-0000-000000000003', 'Hotfix Three', false),
  ('e5130000-0000-0000-0000-000000000004', 'Hotfix Four', false),
  ('e5130000-0000-0000-0000-000000000005', 'Hotfix Five', false),
  ('e5130000-0000-0000-0000-000000000006', 'Hotfix Six', false),
  ('e5130000-0000-0000-0000-000000000007', 'Hotfix Seven', false),
  ('e5130000-0000-0000-0000-000000000008', 'Hotfix Eight', false),
  ('e5130000-0000-0000-0000-000000000009', 'Hotfix Nine', false),
  ('e5130000-0000-0000-0000-000000000010', 'Hotfix Ten', false),
  ('e5130000-0000-0000-0000-000000000011', 'Hotfix Eleven', false),
  ('e5130000-0000-0000-0000-000000000012', 'Hotfix Deferred', false),
  ('e5130000-0000-0000-0000-000000000013', 'Hotfix Closed', false);

set local statement_timeout = '5s';
select lives_ok($$
  select public.sync_start_event_v3(
    'Hotfix Event', current_date,
    (select jsonb_agg(jsonb_build_object(
      'clientId', players.id::text,
      'id', players.id::text,
      'name', players.display_name,
      'kind', 'permanent'
    ) order by players.id)
    from public.players players
    where players.id between
      'e5130000-0000-0000-0000-000000000001'::uuid and
      'e5130000-0000-0000-0000-000000000011'::uuid),
    null, null, 'event-start-trigger-hotfix', false
  )
$$, 'the production-shaped 11-player event start completes');

select is((select count(*) from public.events
  where legacy_source_id = 'event-start-trigger-hotfix'),
  1::bigint, 'event start persists exactly one event');
select is((select count(*) from public.event_participants participants
  join public.events events on events.id = participants.event_id
  where events.legacy_source_id = 'event-start-trigger-hotfix'),
  11::bigint, 'event start persists all eleven participants');

insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at, awarded_at
)
select 'hotfix:deferred-active',
  'e5130000-0000-0000-0000-000000000012'::uuid,
  definitions.badge_key, 'hotfix-fixture', now(), now()
from public.badge_definitions definitions
order by definitions.badge_key
limit 1;

insert into public.event_participants (event_id, player_id)
select events.id, 'e5130000-0000-0000-0000-000000000012'::uuid
from public.events events
where events.legacy_source_id = 'event-start-trigger-hotfix';

select is((select count(*) from public.player_badge_award_ledger
  where award_key = 'hotfix:deferred-active'),
  1::bigint, 'active-event participant insert defers ledger synchronization');

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values (
  'e5130000-0000-0000-0000-000000000020', 'Closed hotfix fixture',
  current_date - 1, now() - interval '25 hours', now() - interval '1 hour',
  'closed', now() - interval '1 hour'
);
insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at, awarded_at
)
select 'hotfix:refresh-closed',
  'e5130000-0000-0000-0000-000000000013'::uuid,
  definitions.badge_key, 'hotfix-fixture', now(), now()
from public.badge_definitions definitions
order by definitions.badge_key
limit 1;
insert into public.event_participants (event_id, player_id) values (
  'e5130000-0000-0000-0000-000000000020',
  'e5130000-0000-0000-0000-000000000013'
);

select is((select count(*) from public.player_badge_award_ledger
  where award_key = 'hotfix:refresh-closed'),
  0::bigint, 'closed-event participant mutation still synchronizes its ledger');

select * from finish();
rollback;
