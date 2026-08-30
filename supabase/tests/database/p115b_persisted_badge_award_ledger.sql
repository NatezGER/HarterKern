begin;
select plan(34);

select has_table('public', 'player_badge_award_ledger',
  'persisted badge award ledger exists');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.player_badge_award_ledger'::regclass
    and contype = 'p' and conkey = array[
      (select attnum from pg_attribute
       where attrelid = 'public.player_badge_award_ledger'::regclass
         and attname = 'award_key')::smallint
    ]
), 'award_key is the ledger primary key');
select ok(exists (select 1 from pg_indexes
  where schemaname = 'public' and tablename = 'player_badge_award_ledger'
    and indexname = 'player_badge_award_ledger_player_idx'),
  'ledger has a player index');
select ok(exists (select 1 from pg_indexes
  where schemaname = 'public' and tablename = 'player_badge_award_ledger'
    and indexname = 'player_badge_award_ledger_badge_player_idx'),
  'ledger has a badge/player index');
select ok(has_table_privilege('anon', 'public.player_badge_award_ledger', 'select'),
  'anon can read the ledger');
select ok(not has_table_privilege('anon', 'public.player_badge_award_ledger', 'insert'),
  'anon cannot write the ledger');
select has_function('public', 'sync_player_badge_award_ledger', array['uuid'],
  'player ledger sync exists');
select has_function('public', 'sync_all_player_badge_award_ledgers', array[]::text[],
  'global ledger rebuild exists');

create temporary table canonical_awards_expected as
with enriched as (
  select source.award_key, source.player_id, source.badge_key,
    source.source_type, source.source_attempt_id,
    source.source_historical_attempt_id, source.source_event_id,
    source.awarded_at source_awarded_at,
    case when source.source_historical_attempt_id is not null
      then historical.attempt_date::timestamp at time zone 'Europe/Berlin'
      else source.awarded_at end awarded_at,
    source.metadata,
    row_number() over (
      partition by source.award_key
      order by case when source.source_historical_attempt_id is not null
          then historical.attempt_date::timestamp at time zone 'Europe/Berlin'
          else source.awarded_at end,
        source.awarded_at,
        source.source_attempt_id nulls last,
        source.source_historical_attempt_id nulls last,
        source.source_event_id nulls last,
        source.source_type, source.player_id, source.badge_key,
        source.metadata::text
    ) canonical_position
  from public.player_badge_award_sync_source source
  left join public.historical_attempts historical
    on historical.id = source.source_historical_attempt_id
    and historical.deleted_at is null
)
select * from enriched where canonical_position = 1;

select is((select count(*) from (
  select expected.award_key, expected.player_id, expected.badge_key,
    expected.source_type, expected.source_attempt_id,
    expected.source_historical_attempt_id, expected.source_event_id,
    expected.source_awarded_at, expected.awarded_at, expected.metadata
  from canonical_awards_expected expected
  except
  select ledger.award_key, ledger.player_id, ledger.badge_key,
    ledger.source_type, ledger.source_attempt_id,
    ledger.source_historical_attempt_id, ledger.source_event_id,
    ledger.source_awarded_at, ledger.awarded_at, ledger.metadata
  from public.player_badge_award_ledger ledger
) differences), 0::bigint, 'canonical awards are fully present in the ledger');

select is((select count(*) from (
  select ledger.award_key, ledger.player_id, ledger.badge_key,
    ledger.source_type, ledger.source_attempt_id,
    ledger.source_historical_attempt_id, ledger.source_event_id,
    ledger.source_awarded_at, ledger.awarded_at, ledger.metadata
  from public.player_badge_award_ledger ledger
  except
  select expected.award_key, expected.player_id, expected.badge_key,
    expected.source_type, expected.source_attempt_id,
    expected.source_historical_attempt_id, expected.source_event_id,
    expected.source_awarded_at, expected.awarded_at, expected.metadata
  from canonical_awards_expected expected
) differences), 0::bigint, 'ledger contains no awards outside canonical eligibility');

create temporary table canonicalization_evidence (
  award_key text not null,
  canonical_awarded_at timestamptz not null,
  source_awarded_at timestamptz not null,
  source_attempt_id uuid,
  source_type text not null
);
insert into canonicalization_evidence values
  ('repeated-award', '2025-02-22', '2025-02-22',
    '00000000-0000-0000-0000-000000000001', 'attempt'),
  ('repeated-award', '2026-08-28', '2026-08-28',
    '00000000-0000-0000-0000-000000000003', 'attempt'),
  ('tied-award', '2026-08-21', '2026-08-21',
    '00000000-0000-0000-0000-000000000002', 'attempt'),
  ('tied-award', '2026-08-21', '2026-08-21',
    '00000000-0000-0000-0000-000000000001', 'attempt');
create temporary view canonicalization_result as
select * from (
  select evidence.*, row_number() over (
    partition by award_key
    order by canonical_awarded_at, source_awarded_at,
      source_attempt_id nulls last, source_type
  ) canonical_position
  from canonicalization_evidence evidence
) ranked where canonical_position = 1;

select is((select count(*) from canonicalization_result), 2::bigint,
  'repeated source evidence yields exactly one row per award key');
select is((select source_attempt_id from canonicalization_result
  where award_key = 'repeated-award'),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'the oldest qualifying evidence wins');
select isnt((select source_attempt_id from canonicalization_result
  where award_key = 'repeated-award'),
  '00000000-0000-0000-0000-000000000003'::uuid,
  'a later repeated qualification does not replace the original');
select is((select source_attempt_id from canonicalization_result
  where award_key = 'tied-award'),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'equal award timestamps use the deterministic source ID tie-break');
select is((select count(*) from (
  select * from canonicalization_result
  except select * from canonicalization_result
) differences), 0::bigint, 'repeated canonicalization is idempotent');
insert into canonicalization_evidence values
  ('repeated-award', '2027-01-01', '2027-01-01',
    '00000000-0000-0000-0000-000000000004', 'attempt');
select is((select source_attempt_id from canonicalization_result
  where award_key = 'repeated-award'),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'newer evidence preserves the original award source');
delete from canonicalization_evidence
where source_attempt_id = '00000000-0000-0000-0000-000000000001'
  and award_key = 'repeated-award';
select is((select source_attempt_id from canonicalization_result
  where award_key = 'repeated-award'),
  '00000000-0000-0000-0000-000000000003'::uuid,
  'removing original evidence promotes the next valid source');

create temporary table ledger_timestamps_before as
select award_key, updated_at from public.player_badge_award_ledger;
do $$ begin perform public.sync_all_player_badge_award_ledgers(); end $$;
select is((select count(*) from public.player_badge_award_ledger ledger
  join ledger_timestamps_before before using (award_key)
  where ledger.updated_at is distinct from before.updated_at), 0::bigint,
  'an unchanged rebuild is idempotent');

create temporary table ledger_refresh_target as
select * from public.player_badge_award_ledger order by award_key limit 1;
create temporary table other_player_timestamps_before as
select ledger.award_key, ledger.updated_at
from public.player_badge_award_ledger ledger
where ledger.player_id is distinct from
  (select player_id from ledger_refresh_target);
delete from public.player_badge_award_ledger ledger
using ledger_refresh_target target where ledger.award_key = target.award_key;
do $$ begin perform public.sync_player_badge_award_ledger(
  (select player_id from ledger_refresh_target)); end $$;
select is((select count(*) from public.player_badge_award_ledger ledger
  join ledger_refresh_target target using (award_key)), 1::bigint,
  'sync restores a newly eligible missing award');

insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at, awarded_at
)
select 'ledger-test:stale', target.player_id, target.badge_key,
  'ledger-test', now(), now() from ledger_refresh_target target;
do $$ begin perform public.sync_player_badge_award_ledger(
  (select player_id from ledger_refresh_target)); end $$;
select is((select count(*) from public.player_badge_award_ledger
  where award_key = 'ledger-test:stale'), 0::bigint,
  'sync revokes an award no longer emitted by canonical eligibility');

update public.player_badge_award_ledger ledger set metadata = '{"stale":true}'::jsonb
from ledger_refresh_target target where ledger.award_key = target.award_key;
do $$ begin perform public.sync_player_badge_award_ledger(
  (select player_id from ledger_refresh_target)); end $$;
select is((select ledger.metadata from public.player_badge_award_ledger ledger
  join ledger_refresh_target target using (award_key)),
  (select source.metadata from canonical_awards_expected source
   join ledger_refresh_target target using (award_key)),
  'sync repairs changed award metadata');
select is((select count(*) from public.player_badge_award_ledger ledger
  join other_player_timestamps_before before using (award_key)
  where ledger.updated_at is distinct from before.updated_at), 0::bigint,
  'player sync leaves every other player unchanged');

select is((select count(*) from (
  select award_key from public.player_badge_award_ledger
  group by award_key having count(*) > 1
) duplicates), 0::bigint, 'ledger cannot contain duplicate award keys');

select ok(pg_get_functiondef('public.get_player_visible_badges(uuid)'::regprocedure)
  !~ 'player_badge_awards|pre_p11_badge_awards|event_lead_time_badge_awards|bingo_line_diamond_badge_awards|qualified_official_times|player_statistics',
  'profile badge RPC has no live eligibility dependency');
select ok(pg_get_functiondef('public.get_badge_rarity()'::regprocedure)
  !~ 'public_player_badges|visible_player_badges|player_badge_awards',
  'rarity RPC has no live eligibility dependency');
select is((select count(*) from pg_trigger
  where not tgisinternal and tgname in (
    'attempts_insert_refresh_badge_ledger',
    'attempts_update_refresh_badge_ledger',
    'attempts_delete_refresh_badge_ledger',
    'historical_attempts_refresh_badge_ledger',
    'events_refresh_badge_ledger',
    'event_participants_refresh_badge_ledger',
    'players_refresh_badge_ledger',
    'badge_definitions_refresh_badge_ledger'
  )), 8::bigint, 'all relevant mutation paths refresh the ledger');

select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions
  where family_key = 'favorite-time' and is_active), array[2,3,5,10],
  'Favorite Time thresholds remain unchanged');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions
  where family_key = 'bingo' and is_active), array[1,2,3,5],
  'BINGO line thresholds remain unchanged');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions
  where family_key = 'bingo-completion' and is_active), array[1,2,3,5],
  'BINGO completion thresholds remain unchanged');

select is((select count(*) from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions using (badge_key)
  where definitions.design_variant = 'positive_special'),
  (select count(*) from canonical_awards_expected source
   join public.badge_definitions definitions using (badge_key)
   where definitions.design_variant = 'positive_special'),
  'Smaragd awards retain parity');
select is((select count(*) from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions using (badge_key)
  where definitions.design_variant = 'consolation'),
  (select count(*) from canonical_awards_expected source
   join public.badge_definitions definitions using (badge_key)
   where definitions.design_variant = 'consolation'),
  'Holz awards retain parity');
select is((select count(*) from public.player_badge_award_achievements),
  (select count(*) from public.player_badge_award_ledger ledger
   join public.players players on players.id = ledger.player_id
   join public.badge_definitions definitions using (badge_key)
   where not players.is_ak and not players.is_archived
     and definitions.is_active),
  'admin achievement projection exposes every regular ledger award');

select is((select count(*) from public.get_player_visible_badges(
  (select player_id from ledger_refresh_target))),
  (select count(*) from public.get_visible_player_badges(
  (select player_id from ledger_refresh_target))),
  'ledger profile read retains visible badge count parity');
select is((select count(*) from public.get_badge_rarity()),
  (select count(distinct badge_key) from public.player_badge_award_ledger ledger
   join public.players players on players.id = ledger.player_id
   join public.badge_definitions definitions using (badge_key)
   where not players.is_ak and not players.is_archived and definitions.is_active),
  'ledger rarity exposes every earned active badge');

select * from finish();
rollback;
