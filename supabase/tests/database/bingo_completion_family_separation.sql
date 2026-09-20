begin;
create extension if not exists pgtap;
select plan(13);

select ok(exists (
  select 1 from pg_constraint constraint_row
  where constraint_row.conname = 'badge_definitions_category_check'
    and constraint_row.conrelid = 'public.badge_definitions'::regclass
    and pg_get_constraintdef(constraint_row.oid) like '%bingo_completion%'
), 'category constraint explicitly permits bingo_completion');

insert into public.players (id, display_name, is_ak) values
  ('97000000-0000-0000-0000-000000000001', '48 fields', false),
  ('97000000-0000-0000-0000-000000000002', '99 fields', false),
  ('97000000-0000-0000-0000-000000000003', '100 bronze', false),
  ('97000000-0000-0000-0000-000000000004', '99 silver', false),
  ('97000000-0000-0000-0000-000000000005', '100 silver', false),
  ('97000000-0000-0000-0000-000000000006', '100 diamond', false);

insert into public.historical_attempts (
  player_id, display_name, attempt_date, time_hundredths, sort_order, source
)
select fixture.player_id, fixture.display_name, date '2026-09-20',
  100 + ending, row_number() over (
    partition by fixture.player_id order by repetition, ending
  ), 'admin'
from (values
  ('97000000-0000-0000-0000-000000000001'::uuid, '48 fields', 48, 1),
  ('97000000-0000-0000-0000-000000000002'::uuid, '99 fields', 99, 1),
  ('97000000-0000-0000-0000-000000000003'::uuid, '100 bronze', 100, 1),
  ('97000000-0000-0000-0000-000000000004'::uuid, '99 silver', 100, 2),
  ('97000000-0000-0000-0000-000000000005'::uuid, '100 silver', 100, 2),
  ('97000000-0000-0000-0000-000000000006'::uuid, '100 diamond', 100, 5)
) fixture(player_id, display_name, fields, repetitions)
cross join lateral generate_series(1, fixture.repetitions) repetition
cross join lateral generate_series(0, case
  when fixture.player_id = '97000000-0000-0000-0000-000000000004'::uuid
    and repetition = 2 then 98
  else fixture.fields - 1 end) ending;

select ok(exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000001'
    and badge_key = 'bingo-bronze'), '48 fields include a Bronze line');
select ok(not exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000001'
    and badge_key = 'bingo-completion-bronze'), '48 fields never complete the card');
select ok(not exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000002'
    and badge_key = 'bingo-completion-bronze'), '99 fields never complete the card');
select ok(exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000003'
    and badge_key = 'bingo-completion-bronze'), '100 first hits complete Bronze');
select ok(not exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000004'
    and badge_key = 'bingo-completion-silver'), 'one single-hit field blocks Silver');
select ok(exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000005'
    and badge_key = 'bingo-completion-silver'), '100 second hits complete Silver');
select ok(exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000006'
    and badge_key = 'bingo-completion-gold'), '100 third hits complete Gold');
select ok(exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000006'
    and badge_key = 'bingo-completion-diamond'), '100 fifth hits complete Diamond');

insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at, awarded_at
) values (
  '97000000-0000-0000-0000-000000000001:bingo-completion-bronze',
  '97000000-0000-0000-0000-000000000001',
  'bingo-completion-bronze', 'bingo', now(), now()
);
select ok(exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000001'
    and badge_key = 'bingo-completion-bronze'), 'stale completion exists before targeted sync');
select public.sync_player_badge_award_ledgers(array(
  select distinct ledger.player_id
  from public.player_badge_award_ledger ledger
  where ledger.badge_key like 'bingo-completion-%'
));
select ok(not exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000001'
    and badge_key = 'bingo-completion-bronze'), 'targeted sync retracts stale completion');
select ok(exists (select 1 from public.player_badge_award_ledger
  where player_id = '97000000-0000-0000-0000-000000000003'
    and badge_key = 'bingo-completion-bronze'), 'targeted sync preserves true full-card completion');
select is((select count(*) from public.badge_definitions
  where family_key = 'bingo-completion' and category = 'bingo_completion'),
  4::bigint, 'line and completion definitions use separate categories');

select * from finish();
rollback;
