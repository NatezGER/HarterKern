begin;
create extension if not exists pgtap;
select plan(32);

select has_column('public', 'badge_definitions', 'family_key');
select has_column('public', 'badge_definitions', 'requirement');
select has_column('public', 'badge_definitions', 'is_secret');
select has_table('public', 'group_milestone_definitions');
select has_view('public', 'world_record_history');
select has_view('public', 'player_pb_history');
select has_view('public', 'visible_player_badges');
select has_view('public', 'prestige_activity_feed');
select has_view('public', 'group_milestone_progress');
select has_view('public', 'event_attempt_number_statistics');
select has_view('public', 'player_prestige_statistics');
select has_view('public', 'badge_rarity_statistics');
select has_view('public', 'event_badge_unlocks');
select has_column('public', 'player_pb_progression', 'source_order');
select ok(
  not exists (
    select 1 from public.player_pb_progression
    where source_type = 'historical_attempt'
      and (achieved_at at time zone 'Europe/Berlin')::time <> time '00:00:00'
  ),
  'date-only historical attempts do not receive invented clock times'
);

select is(
  (select family_key from public.badge_definitions
    where badge_key = 'first-sub2'),
  'performance-speed',
  'performance tiers share one family'
);
select is(
  (select count(*) from public.group_milestone_definitions),
  3::bigint,
  'group milestone definitions are seeded idempotently'
);

insert into public.players (id, display_name)
values ('93000000-0000-0000-0000-000000000001', 'PR7C Player');

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values (
  '93000000-0000-0000-0000-000000000002',
  'PR7C Event', current_date - 10,
  now() - interval '11 days', now() - interval '10 days',
  'closed', now() - interval '10 days'
);

insert into public.event_participants (event_id, player_id)
values (
  '93000000-0000-0000-0000-000000000002',
  '93000000-0000-0000-0000-000000000001'
);
insert into public.event_guests (id, event_id, display_name)
values (
  '93000000-0000-0000-0000-000000000003',
  '93000000-0000-0000-0000-000000000002',
  'PR7C Guest'
);

insert into public.attempts (
  id, player_id, guest_id, event_id, status, time_hundredths,
  is_dnf, is_ak, submitted_at, source
) values
  ('93000000-0000-0000-0000-000000000010',
    '93000000-0000-0000-0000-000000000001', null,
    '93000000-0000-0000-0000-000000000002', 'approved', 600,
    false, false, now() - interval '11 days', 'admin'),
  ('93000000-0000-0000-0000-000000000011',
    '93000000-0000-0000-0000-000000000001', null,
    '93000000-0000-0000-0000-000000000002', 'approved', 450,
    false, false, now() - interval '11 days' + interval '1 minute', 'admin'),
  ('93000000-0000-0000-0000-000000000012',
    '93000000-0000-0000-0000-000000000001', null,
    '93000000-0000-0000-0000-000000000002', 'approved', 450,
    false, false, now() - interval '11 days' + interval '2 minutes', 'admin'),
  ('93000000-0000-0000-0000-000000000013',
    '93000000-0000-0000-0000-000000000001', null,
    '93000000-0000-0000-0000-000000000002', 'approved', 350,
    false, false, now() - interval '11 days' + interval '3 minutes', 'admin'),
  ('93000000-0000-0000-0000-000000000014',
    '93000000-0000-0000-0000-000000000001', null,
    '93000000-0000-0000-0000-000000000002', 'approved', 199,
    false, false, now() - interval '11 days' + interval '4 minutes', 'admin'),
  ('93000000-0000-0000-0000-000000000015',
    '93000000-0000-0000-0000-000000000001', null,
    '93000000-0000-0000-0000-000000000002', 'approved', null,
    true, false, now() - interval '11 days' + interval '5 minutes', 'admin'),
  ('93000000-0000-0000-0000-000000000016',
    null, '93000000-0000-0000-0000-000000000003',
    '93000000-0000-0000-0000-000000000002', 'approved', 300,
    false, false, now() - interval '11 days' + interval '10 seconds', 'admin'),
  ('93000000-0000-0000-0000-000000000017',
    '93000000-0000-0000-0000-000000000001', null,
    '93000000-0000-0000-0000-000000000002', 'approved', 100,
    false, true, now() - interval '11 days' + interval '6 minutes', 'admin');

select is(
  (select count(*) from public.player_pb_history
    where player_id = '93000000-0000-0000-0000-000000000001'),
  4::bigint,
  'PB history contains only strict improvements'
);
select is(
  (select improvement_hundredths from public.player_pb_history
    where source_id = '93000000-0000-0000-0000-000000000011'),
  150,
  'PB improvement is calculated in hundredths'
);
select ok(
  (select is_current from public.player_pb_history
    where source_id = '93000000-0000-0000-0000-000000000014'),
  'fastest PB is current'
);
select is(
  (select count(*) from public.visible_player_badges
    where player_id = '93000000-0000-0000-0000-000000000001'
      and family_key = 'performance-speed'),
  1::bigint,
  'only the highest performance tier is visible'
);
select is(
  (select badge_key from public.visible_player_badges
    where player_id = '93000000-0000-0000-0000-000000000001'
      and family_key = 'performance-speed'),
  'first-sub2',
  'diamond replaces lower performance tiers'
);
select is(
  (select current_progress from public.visible_player_badges
    where player_id = '93000000-0000-0000-0000-000000000001'
      and family_key = 'performance-speed'),
  199,
  'badge detail exposes the current performance value'
);
select is(
  (select next_badge_name from public.visible_player_badges
    where player_id = '93000000-0000-0000-0000-000000000001'
      and family_key = 'performance-speed'),
  null::text,
  'highest family tier has no invented next badge'
);
select is(
  (select count(*) from public.event_badge_unlocks
    where source_event_id = '93000000-0000-0000-0000-000000000002'
      and category = 'performance'),
  4::bigint,
  'event history keeps every badge unlock even when profiles collapse tiers'
);
select is(
  (select average_hundredths from public.event_attempt_number_statistics
    where event_id = '93000000-0000-0000-0000-000000000002'
      and attempt_number = 1),
  450,
  'event attempt-number average includes guests and excludes AK'
);
select is(
  (select sample_count from public.event_attempt_number_statistics
    where event_id = '93000000-0000-0000-0000-000000000002'
      and attempt_number = 1),
  2,
  'event attempt-number sample size is exposed'
);
select is(
  (select count(*) from (
    select activity_id from public.prestige_activity_feed
    group by activity_id having count(*) > 1
  ) duplicates),
  0::bigint,
  'activity IDs never duplicate'
);
select is(
  (select pb_count from public.player_prestige_statistics
    where player_id = '93000000-0000-0000-0000-000000000001'),
  4,
  'player prestige statistics reuse PB history'
);

update public.events set deleted_at = now()
where id = '93000000-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.player_pb_history
    where player_id = '93000000-0000-0000-0000-000000000001'),
  0::bigint,
  'soft delete removes event PB history'
);
select is(
  (select count(*) from public.event_attempt_number_statistics
    where event_id = '93000000-0000-0000-0000-000000000002'),
  0::bigint,
  'soft delete removes event attempt-number analytics'
);
select is(
  (select count(*) from public.visible_player_badges
    where player_id = '93000000-0000-0000-0000-000000000001'),
  0::bigint,
  'soft delete withdraws derived visible badges'
);

select * from finish();
rollback;
