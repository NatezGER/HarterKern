begin;
create extension if not exists pgtap;
select plan(40);

select has_column('public', 'events', 'awards_trophies');
select has_column('public', 'badge_definitions', 'badge_kind');
select has_column('public', 'badge_definitions', 'design_variant');
select has_column('public', 'badge_definitions', 'scope_type');
select has_view('public', 'qualified_official_times');
select has_view('public', 'precision_events');
select has_view('public', 'most_wanted_endings');
select has_view('public', 'most_wanted_progress');
select has_view('public', 'most_wanted_milestones');
select has_view('public', 'player_trophies');
select has_view('public', 'league_time_statistics');
select has_function('public', 'sync_start_event_v3',
  array['text', 'date', 'jsonb', 'timestamp with time zone',
    'timestamp with time zone', 'text', 'boolean']);
select has_function('public', 'sync_update_event_v2',
  array['uuid', 'text', 'date', 'boolean']);

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
  where family_key = 'most-wanted'), array[1,5,10,25], 'Most Wanted tiers');

insert into public.players (id, display_name, is_ak) values
  ('98000000-0000-0000-0000-000000000001', 'PR8 Main', false),
  ('98000000-0000-0000-0000-000000000002', 'PR8 Second', false),
  ('98000000-0000-0000-0000-000000000003', 'PR8 Exact Three', false),
  ('98000000-0000-0000-0000-000000000004', 'PR8 AK', true);

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
  '98000000-0000-0000-0000-000000000201'::uuid,
  'historical first hit remains deterministic');
select is((select hit_count from public.most_wanted_endings where ending = 56),
  0, 'soft-deleted attempts do not count');
select is((select hit_count from public.most_wanted_endings where ending = 55),
  0, 'AK attempts do not count');
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

select * from finish();
rollback;
