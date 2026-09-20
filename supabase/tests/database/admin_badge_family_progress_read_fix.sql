begin;
create extension if not exists pgtap;
select plan(12);

select has_function('public', 'get_admin_badge_family_progress',
  array[]::text[], 'family progress RPC exists');
select unlike(pg_get_functiondef(
  'public.get_admin_badge_family_progress()'::regprocedure),
  'player_badge_award_sync_source', 'catalog read does not expand the live award union');

-- Fixture history must not start the unrelated transactional badge sync.
alter table public.attempts disable trigger attempts_insert_refresh_badge_ledger;
alter table public.historical_attempts disable trigger historical_attempts_refresh_badge_ledger;

insert into public.players (id, display_name, is_ak) values
  ('96000000-0000-0000-0000-000000000001', 'Long Rapid', false),
  ('96000000-0000-0000-0000-000000000002', 'Short Rapid', false),
  ('96000000-0000-0000-0000-000000000003', 'Partial Card', false),
  ('96000000-0000-0000-0000-000000000004', 'Full Card', false),
  ('96000000-0000-0000-0000-000000000005', 'Boundary Rapid', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values (
  '96000000-0000-0000-0000-000000000100', 'Progress Fixture',
  '2026-09-01', '2026-09-01 00:00+00', '2026-09-02 00:00+00',
  'closed', '2026-09-02 00:00+00'
);

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  is_ak, submitted_at, source
)
select ('96100000-0000-0000-0000-' || lpad(sequence::text, 12, '0'))::uuid,
  '96000000-0000-0000-0000-000000000001',
  '96000000-0000-0000-0000-000000000100',
  'approved', 350, false, false,
  '2026-09-01 01:00+00'::timestamptz + sequence * interval '1 minute',
  'admin'
from generate_series(0, 999) sequence;

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  is_ak, submitted_at, source
) values
  ('96200000-0000-0000-0000-000000000001',
   '96000000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000100',
   'approved', 301, false, false, '2026-09-01 12:00+00', 'admin'),
  ('96200000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000100',
   'approved', 302, false, false, '2026-09-01 13:00+00', 'admin'),
  ('96200000-0000-0000-0000-000000000003',
   '96000000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000100',
   'approved', 303, false, false, '2026-09-01 13:01+00', 'admin'),
  ('96200000-0000-0000-0000-000000000004',
   '96000000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000100',
   'approved', null, true, false, '2026-09-01 13:01+00', 'admin'),
  ('96200000-0000-0000-0000-000000000005',
   '96000000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000100',
   'approved', 304, false, true, '2026-09-01 13:01+00', 'admin'),
  ('96200000-0000-0000-0000-000000000006',
   '96000000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000100',
   'approved', 305, false, false, '2026-09-01 13:01+00', 'admin'),
  ('96200000-0000-0000-0000-000000000007',
   '96000000-0000-0000-0000-000000000005',
   '96000000-0000-0000-0000-000000000100',
   'approved', 306, false, false, '2026-09-01 12:00+00', 'admin'),
  ('96200000-0000-0000-0000-000000000008',
   '96000000-0000-0000-0000-000000000005',
   '96000000-0000-0000-0000-000000000100',
   'approved', 307, false, false, '2026-09-01 13:00+00', 'admin');

insert into public.historical_attempts (
  player_id, display_name, attempt_date, time_hundredths, sort_order
)
select fixture.player_id, fixture.display_name, '2026-08-01',
  100 + ending, ending
from (values
  ('96000000-0000-0000-0000-000000000003'::uuid, 'Partial Card', 48),
  ('96000000-0000-0000-0000-000000000004'::uuid, 'Full Card', 100)
) fixture(player_id, display_name, field_count)
cross join lateral generate_series(0, fixture.field_count - 1) ending;

insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_awarded_at,
  awarded_at, metadata
) values
  ('96000000-0000-0000-0000-000000000002:favorite-time-silver',
   '96000000-0000-0000-0000-000000000002', 'favorite-time-silver',
   'attempt', now(), now(), '{"progress":4,"timeHundredths":301}'::jsonb),
  ('96000000-0000-0000-0000-000000000002:flawless-bronze',
   '96000000-0000-0000-0000-000000000002', 'flawless-bronze',
   'attempt', now(), now(), '{"progress":5}'::jsonb);

create temp table progress_snapshot on commit drop as
select * from public.get_admin_badge_family_progress();

select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000001'
    and family_key = 'rapid-fire'), 61,
  '1000 one-minute attempts have a maximum inclusive 60-minute window of 61');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000002'
    and family_key = 'rapid-fire'), 3,
  'same-timestamp peers count together while DNF and AK are excluded');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000005'
    and family_key = 'rapid-fire'), 2,
  'the exact inclusive 60-minute boundary counts');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000001'
    and family_key = 'event-attempts'), 1000,
  'event attempt maximum retains the qualified large-history count');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000002'
    and family_key = 'valid-attempts'), 4,
  'valid attempt total excludes DNF and AK');
select ok((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000003'
    and family_key = 'bingo') > 0,
  '48 fields can yield a Bronze BINGO line');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000003'
    and family_key = 'bingo-completion'), 48,
  'partial card completion is distinct from line progress');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000004'
    and family_key = 'bingo-completion'), 100,
  'full card completion reaches all 100 endings');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000002'
    and family_key = 'favorite-time'), 4,
  'favorite-time evidence comes from persisted ledger');
select is((select current_progress from progress_snapshot
  where player_id = '96000000-0000-0000-0000-000000000002'
    and family_key = 'flawless'), 5,
  'flawless evidence comes from persisted ledger');

select * from finish();
rollback;
