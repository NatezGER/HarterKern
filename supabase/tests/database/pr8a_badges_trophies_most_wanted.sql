begin;
create extension if not exists pgtap;
select plan(72);

select has_column('public', 'events', 'awards_trophies', 'events.awards_trophies exists');
select has_column('public', 'badge_definitions', 'badge_kind', 'badge_definitions.badge_kind exists');
select has_column('public', 'badge_definitions', 'design_variant', 'badge_definitions.design_variant exists');
select has_column('public', 'badge_definitions', 'scope_type', 'badge_definitions.scope_type exists');
select has_view('public', 'qualified_official_times', 'qualified_official_times view exists');
select has_view('public', 'precision_events', 'precision_events view exists');
select has_view('public', 'most_wanted_endings', 'most_wanted_endings view exists');
select has_view('public', 'most_wanted_progress', 'most_wanted_progress view exists');
select has_view('public', 'most_wanted_milestones', 'most_wanted_milestones view exists');
select has_view('public', 'player_bingo_hits', 'player_bingo_hits view exists');
select has_view('public', 'player_bingo_fields', 'player_bingo_fields view exists');
select has_view('public', 'player_bingo_lines', 'player_bingo_lines view exists');
select has_view('public', 'player_bingo_statistics', 'player_bingo_statistics view exists');
select has_view('public', 'player_trophies', 'player_trophies view exists');
select has_view('public', 'league_time_statistics', 'league_time_statistics view exists');
select has_function('public', 'sync_start_event_v3',
  array['text', 'date', 'jsonb', 'timestamp with time zone',
    'timestamp with time zone', 'text', 'boolean'], 'sync_start_event_v3 exists');
select has_function('public', 'sync_update_event_v2',
  array['uuid', 'text', 'date', 'boolean'], 'sync_update_event_v2 exists');

select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'time-limits'), array[200,300,400,500], 'time tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'valid-attempts'), array[10,50,100,500], 'attempt tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'event-wins'), array[1,5,10,50], 'win tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'win-streak'), array[2,3,5,10], 'win streak tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'sub3-streak'), array[2,4,6,10], 'sub-3 tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'flawless'), array[5,10,25,50], 'flawless tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'favorite-time'), array[2,4,6,10], 'favorite tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'activity-years'), array[2,3,5,10], 'activity tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'community'), array[5,10,15,25], 'community tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'events-played'), array[5,10,25,100], 'event tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'podiums'), array[3,10,25,50], 'podium tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'precision'), array[1,3,10,25], 'precision tiers');
select is((select array_agg(threshold order by threshold) from public.badge_definitions
  where family_key = 'bingo'), array[1,2,3], 'BINGO has bronze, silver and gold only');
select lives_ok($$
  insert into public.badge_definitions (
    badge_key, category, tier, name, description, threshold, sort_order,
    family_key, requirement
  ) values (
    'legacy-streak-contract', 'streak', 'bronze', 'Legacy Streak',
    'Regression fixture for the valid PR 7A category.', 1, 9999,
    'legacy-streak-contract', 'Legacy category remains accepted'
  )
$$, 'PR 7A streak category remains accepted by the PR 8A constraint');
select is((select count(*) from (
  select distinct category from public.badge_definitions
  where category not in (
    'attempts', 'wins', 'streak', 'performance', 'record', 'podium',
    'win_streak', 'sub3_streak', 'flawless', 'favorite_time',
    'activity', 'community', 'events', 'podiums', 'precision',
    'most_wanted', 'bingo', 'first_attempt', 'dnf', 'glitch',
    'consolation'
  )
) unsupported), 0::bigint, 'all stored badge categories are covered by the constraint');

insert into public.players (id, display_name, is_ak) values
  ('98000000-0000-0000-0000-000000000001', 'PR8 Main', false),
  ('98000000-0000-0000-0000-000000000002', 'PR8 Second', false),
  ('98000000-0000-0000-0000-000000000003', 'PR8 Exact Three', false),
  ('98000000-0000-0000-0000-000000000004', 'PR8 AK', true),
  ('98000000-0000-0000-0000-000000000005', 'BINGO Row', false),
  ('98000000-0000-0000-0000-000000000006', 'BINGO Column', false),
  ('98000000-0000-0000-0000-000000000007', 'BINGO Main Diagonal', false),
  ('98000000-0000-0000-0000-000000000008', 'BINGO Anti Diagonal', false),
  ('98000000-0000-0000-0000-000000000009', 'BINGO Incomplete', false),
  ('98000000-0000-0000-0000-00000000000a', 'BINGO Silver', false),
  ('98000000-0000-0000-0000-00000000000b', 'BINGO Gold', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at,
  awards_trophies
) values (
  '98000000-0000-0000-0000-000000000010', 'PR8 Trophy Event',
  date '2026-01-10', timestamptz '2026-01-10 18:00:00+01',
  timestamptz '2026-01-11 18:00:00+01', 'closed',
  timestamptz '2026-01-10 23:00:00+01', true
);

insert into public.event_participants (event_id, player_id) values
  ('98000000-0000-0000-0000-000000000010', '98000000-0000-0000-0000-000000000001'),
  ('98000000-0000-0000-0000-000000000010', '98000000-0000-0000-0000-000000000002'),
  ('98000000-0000-0000-0000-000000000010', '98000000-0000-0000-0000-000000000003');
insert into public.event_guests (id, event_id, display_name) values
  ('98000000-0000-0000-0000-000000000020',
   '98000000-0000-0000-0000-000000000010', 'PR8 Guest');

insert into public.attempts (
  id, player_id, guest_id, event_id, status, time_hundredths,
  is_dnf, is_ak, submitted_at, source
) values
  ('98000000-0000-0000-0000-000000000101','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',299,false,false,'2026-01-10 18:01:00+01','admin'),
  ('98000000-0000-0000-0000-000000000102','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',300,false,false,'2026-01-10 18:02:00+01','admin'),
  ('98000000-0000-0000-0000-000000000103','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',290,false,false,'2026-01-10 18:03:00+01','admin'),
  ('98000000-0000-0000-0000-000000000104','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',null,true,false,'2026-01-10 18:04:00+01','admin'),
  ('98000000-0000-0000-0000-000000000105','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',280,false,false,'2026-01-10 18:05:00+01','admin'),
  ('98000000-0000-0000-0000-000000000106','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',281,false,false,'2026-01-10 18:06:00+01','admin'),
  ('98000000-0000-0000-0000-000000000107','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',282,false,false,'2026-01-10 18:07:00+01','admin'),
  ('98000000-0000-0000-0000-000000000108','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',283,false,false,'2026-01-10 18:08:00+01','admin'),
  ('98000000-0000-0000-0000-000000000109','98000000-0000-0000-0000-000000000001',null,'98000000-0000-0000-0000-000000000010','approved',284,false,false,'2026-01-10 18:09:00+01','admin'),
  ('98000000-0000-0000-0000-000000000110','98000000-0000-0000-0000-000000000002',null,'98000000-0000-0000-0000-000000000010','approved',400,false,false,'2026-01-10 18:10:00+01','admin'),
  ('98000000-0000-0000-0000-000000000111','98000000-0000-0000-0000-000000000003',null,'98000000-0000-0000-0000-000000000010','approved',300,false,false,'2026-01-10 18:11:00+01','admin'),
  ('98000000-0000-0000-0000-000000000112',null,'98000000-0000-0000-0000-000000000020','98000000-0000-0000-0000-000000000010','approved',450,false,false,'2026-01-10 18:12:00+01','admin'),
  ('98000000-0000-0000-0000-000000000113','98000000-0000-0000-0000-000000000004',null,'98000000-0000-0000-0000-000000000010','approved',355,false,true,'2026-01-10 18:13:00+01','admin'),
  ('98000000-0000-0000-0000-000000000114','98000000-0000-0000-0000-000000000002',null,'98000000-0000-0000-0000-000000000010','approved',456,false,false,'2026-01-10 18:14:00+01','admin');

update public.attempts set deleted_at = now()
where id = '98000000-0000-0000-0000-000000000114';

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths,
  historical_label, sort_order
) values
  ('98000000-0000-0000-0000-000000000201','98000000-0000-0000-0000-000000000001','PR8 Main','2025-01-01',377,'PR8 Archiv',1),
  ('98000000-0000-0000-0000-000000000202','98000000-0000-0000-0000-000000000001','PR8 Main','2025-01-01',388,'PR8 Archiv',2),
  ('98000000-0000-0000-0000-000000000203','98000000-0000-0000-0000-000000000001','PR8 Main','2025-01-01',388,'PR8 Archiv',3);

-- All BINGO fixtures are historical qualified times. Seconds vary while the
-- hundredths ending remains stable; sort_order supplies deterministic order.
insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths,
  historical_label, sort_order
)
select gen_random_uuid(), player_id, display_name, date '2024-01-01',
  300 + ending + ((hit_number - 1) * 100), 'BINGO Test',
  ending * 10 + hit_number
from (
  select '98000000-0000-0000-0000-000000000005'::uuid player_id,
    'BINGO Row'::text display_name, ending, 1 hit_number
  from generate_series(0, 9) ending
  union all
  select '98000000-0000-0000-0000-000000000005'::uuid,
    'BINGO Row', 77, hit_number from generate_series(1, 4) hit_number
  union all
  select '98000000-0000-0000-0000-000000000006'::uuid,
    'BINGO Column', ending * 10, 1 from generate_series(0, 9) ending
  union all
  select '98000000-0000-0000-0000-000000000007'::uuid,
    'BINGO Main Diagonal', ending * 11, 1 from generate_series(0, 9) ending
  union all
  select '98000000-0000-0000-0000-000000000008'::uuid,
    'BINGO Anti Diagonal', 9 + ending * 9, 1 from generate_series(0, 9) ending
  union all
  select '98000000-0000-0000-0000-000000000009'::uuid,
    'BINGO Incomplete', ending, 1 from generate_series(0, 8) ending
  union all
  select '98000000-0000-0000-0000-00000000000a'::uuid,
    'BINGO Silver', 20 + ending, hit_number
  from generate_series(0, 9) ending cross join generate_series(1, 2) hit_number
  union all
  select '98000000-0000-0000-0000-00000000000b'::uuid,
    'BINGO Gold', 30 + ending, hit_number
  from generate_series(0, 9) ending cross join generate_series(1, 3) hit_number
) bingo_fixture;

select is((select badge_key from public.visible_player_badges
  where player_id = '98000000-0000-0000-0000-000000000001'
    and family_key = 'time-limits'), 'first-sub3', 'only highest time tier is visible');
select is((select count(*) from public.player_badge_awards
  where player_id = '98000000-0000-0000-0000-000000000003'
    and badge_key = 'first-sub3'), 0::bigint, '3.00 is not under three');
select is((select badge_key from public.visible_player_badges
  where player_id = '98000000-0000-0000-0000-000000000001'
    and family_key = 'sub3-streak'), 'sub3-streak-silver', 'DNF and 3.00 interrupt sub-3 streaks');
select ok((select qualifies from public.precision_events
  where event_id = '98000000-0000-0000-0000-000000000010'
    and player_id = '98000000-0000-0000-0000-000000000001'),
  'raw population standard deviation at or below 20 qualifies');
select is((select first_source_id from public.most_wanted_endings where ending = 77),
  (select source_id from public.qualified_official_times
    where mod(time_hundredths, 100) = 77
    order by occurred_at, source_priority, source_order, source_id limit 1),
  'historical first hit follows the deterministic central source order');
select is((select count(*) from public.qualified_official_times
  where source_id = '98000000-0000-0000-0000-000000000114'),
  0::bigint, 'soft-deleted attempts do not count');
select is((select count(*) from public.qualified_official_times
  where source_id = '98000000-0000-0000-0000-000000000113'),
  0::bigint, 'AK attempts do not count');
select is((select count(*) from public.player_trophies
  where competition_id = '98000000-0000-0000-0000-000000000010'),
  3::bigint, 'trophy event derives three placements');
select is((select array_agg(trophy_tier order by placement) from public.player_trophies
  where competition_id = '98000000-0000-0000-0000-000000000010'),
  array['gold','silver','bronze'], 'trophy materials follow placement');
update public.events set deleted_at = now()
where id = '98000000-0000-0000-0000-000000000010';
select is((select count(*) from public.player_trophies
  where competition_id = '98000000-0000-0000-0000-000000000010'),
  0::bigint, 'soft delete withdraws derived trophies');
update public.events set deleted_at = null
where id = '98000000-0000-0000-0000-000000000010';
select is((select count(*) from public.player_trophies
  where competition_id = '98000000-0000-0000-0000-000000000010'),
  3::bigint, 'restoring an event restores derived trophies');
select is((select count(*) from (
  select award_key from public.player_badge_awards
  group by award_key having count(*) > 1
) duplicates), 0::bigint, 'award keys are stable and deduplicated');
select ok((select bool_and(percentage between 0 and 100)
  from public.league_time_threshold_statistics), 'threshold percentages stay valid');
select is((select total_count from public.most_wanted_progress), 100,
  'Most Wanted always exposes exactly 100 endings');

select is((select field_tier from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-000000000009' and ending = 9),
  'open', 'zero hits remain open');
select is((select field_tier from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-000000000005' and ending = 1),
  'bronze', 'one hit becomes bronze');
select is((select field_tier from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-00000000000a' and ending = 20),
  'silver', 'two hits become silver');
select is((select field_tier from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-00000000000b' and ending = 30),
  'gold', 'three hits become gold');
select is((select hit_count from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-000000000005' and ending = 77),
  4, 'all hits with the same hundredths ending are counted despite different seconds');
select is((select field_tier from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-000000000005' and ending = 77),
  'gold', 'more than three hits remain gold');
select is((select count(*) from public.player_bingo_hits
  where source_id = '98000000-0000-0000-0000-000000000104'),
  0::bigint, 'DNF attempts do not count for BINGO');
select is((select count(*) from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-000000000004'),
  0::bigint, 'AK players have no personal BINGO');
select is((select hit_count from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-000000000002' and ending = 56),
  0, 'soft-deleted attempts do not count for BINGO');
select is((select count(*) from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-000000000005'),
  22::bigint, 'every permanent player has exactly 22 possible BINGO lines');
select ok((select bool_and(cardinality(endings) = 10)
  from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-000000000005'),
  'only complete ten-cell lines exist');
select ok((select qualifies_bronze from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-000000000005' and line_key = 'row-0'),
  'complete horizontal bronze line qualifies');
select ok((select qualifies_bronze from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-000000000006' and line_key = 'column-0'),
  'complete vertical bronze line qualifies');
select ok((select qualifies_bronze from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-000000000007' and line_key = 'diagonal-main'),
  'complete main diagonal qualifies');
select ok((select qualifies_bronze from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-000000000008' and line_key = 'diagonal-anti'),
  'complete anti diagonal qualifies');
select is((select bronze_lines from public.player_bingo_statistics
  where player_id = '98000000-0000-0000-0000-000000000009'),
  0, 'nine of ten fields do not complete a line');
select is((select line_tier from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-00000000000a' and line_key = 'row-2'),
  'silver', 'two hits in every field create a silver line');
select ok((select qualifies_gold and qualifies_silver and qualifies_bronze
  from public.player_bingo_lines
  where player_id = '98000000-0000-0000-0000-00000000000b' and line_key = 'row-3'),
  'gold line cumulatively fulfils silver and bronze');
select is((select badge_key from public.visible_player_badges
  where player_id = '98000000-0000-0000-0000-000000000005' and family_key = 'bingo'),
  'bingo-bronze', 'first bronze line awards BINGO Bronze');
select is((select badge_key from public.visible_player_badges
  where player_id = '98000000-0000-0000-0000-00000000000a' and family_key = 'bingo'),
  'bingo-silver', 'first silver line awards BINGO Silver');
select is((select badge_key from public.visible_player_badges
  where player_id = '98000000-0000-0000-0000-00000000000b' and family_key = 'bingo'),
  'bingo-gold', 'first gold line awards BINGO Gold');
select is((select count(*) from public.visible_player_badges
  where player_id = '98000000-0000-0000-0000-00000000000b' and family_key = 'bingo'),
  1::bigint, 'only the highest BINGO tier is visible');
select is((select count(*) from public.badge_definitions
  where family_key = 'most-wanted' and is_active), 0::bigint,
  'personal Most-Wanted hit badges are removed');
select is((select (metadata ->> 'bronzeLines')::integer
  from public.player_badge_awards
  where player_id = '98000000-0000-0000-0000-00000000000b'
    and badge_key = 'bingo-gold'), 1,
  'BINGO badge metadata exposes cumulative bronze line count');
select is((select ending from public.player_bingo_hits
  where player_id = '98000000-0000-0000-0000-000000000005'
    and time_hundredths = 577 limit 1), 77,
  'hundredths ending is derived independently of the seconds');
select is((select count(*) from public.player_bingo_fields
  where player_id = '98000000-0000-0000-0000-000000000005'),
  100::bigint, 'personal BINGO always exposes all 100 endings');

select * from finish();
rollback;
