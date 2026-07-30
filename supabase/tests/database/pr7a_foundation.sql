begin;
create extension if not exists pgtap;
select plan(40);

select has_column('public', 'events', 'description', 'events have descriptions');
select has_column('public', 'events', 'is_important', 'events can be important');
select has_column('public', 'events', 'deleted_at', 'events support soft-delete');
select has_column('public', 'events', 'deleted_by', 'event deletion is attributable');
select has_table('public', 'event_photos', 'event photo metadata exists');
select has_table('public', 'badge_definitions', 'badge definitions exist');
select has_view('public', 'event_podium', 'central event podium exists');
select has_view('public', 'player_badge_awards', 'derived badge awards exist');
select has_view('public', 'public_player_badges', 'public earned-badge view exists');
select has_view(
  'public', 'player_pb_progression', 'central personal-best progression exists'
);
select has_view(
  'public', 'player_attempt_number_statistics',
  'central attempt-number statistics exist'
);
select has_function('public', 'admin_soft_delete_event', array['uuid']);
select has_function('public', 'admin_restore_event', array['uuid']);
select has_function('public', 'admin_prepare_event_purge', array['uuid']);
select has_function('public', 'admin_finalize_event_purge', array['uuid']);

select is(
  (select file_size_limit from storage.buckets where id = 'player-avatars'),
  5242880::bigint,
  'avatar uploads are limited to 5 MiB'
);
select is(
  (select file_size_limit from storage.buckets where id = 'event-photos'),
  8388608::bigint,
  'event photo uploads are limited to 8 MiB'
);
select is(
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'player_avatars_%'),
  4::bigint,
  'avatar storage has public-read and admin-write policies'
);
select is(
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'event_photos_%storage%'),
  4::bigint,
  'event photo storage has public-read and admin-write policies'
);
select is(
  (select count(*) from public.badge_definitions),
  17::bigint,
  'all PR 7 badge definitions are seeded idempotently'
);
select results_eq(
  $$select tier::text from public.badge_definitions
    where badge_key = 'first-sub2'$$,
  $$values ('diamond'::text)$$,
  'diamond is available for the under-two badge'
);

create temp table pr7a_baseline as
select
  (select event_count from public.global_statistics) event_count;

insert into public.players (id, display_name)
values ('91000000-0000-0000-0000-000000000001', 'PR7A Player');

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at, is_important
) values (
  '91000000-0000-0000-0000-000000000002',
  'PR7A Important Event',
  current_date,
  now() - interval '2 hours',
  now() - interval '1 hour',
  'closed',
  now() - interval '1 hour',
  true
);

insert into public.event_participants (event_id, player_id)
values (
  '91000000-0000-0000-0000-000000000002',
  '91000000-0000-0000-0000-000000000001'
);

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  submitted_at, source
)
select
  ('91000000-0000-0000-0000-' || lpad(value::text, 12, '0'))::uuid,
  '91000000-0000-0000-0000-000000000001'::uuid,
  '91000000-0000-0000-0000-000000000002'::uuid,
  'approved'::public.attempt_status,
  case when value = 10 then 150 else 250 + value end,
  false,
  now() - interval '2 hours' + make_interval(secs => value),
  'admin'::public.attempt_source
from generate_series(10, 19) value;

select results_eq(
  $$select rank, best_time_hundredths from public.event_podium
    where event_id = '91000000-0000-0000-0000-000000000002'$$,
  $$values (1, 150)$$,
  'event podium uses the fastest valid participant time'
);
select is(
  (select count(*) from public.player_badge_awards
    where award_key = '91000000-0000-0000-0000-000000000001:valid-attempts-bronze'),
  1::bigint,
  'ten valid event attempts unlock the bronze milestone exactly once'
);
select is(
  (select count(*) from public.player_badge_awards
    where player_id = '91000000-0000-0000-0000-000000000001'
      and badge_key = 'sub3-streak-gold'),
  1::bigint,
  'a ten-attempt cross-event-capable under-three streak unlocks gold'
);
select is(
  (select count(*) from public.player_badge_awards
    where player_id = '91000000-0000-0000-0000-000000000001'
      and badge_key = 'important-event-gold'),
  1::bigint,
  'an important event awards its gold podium badge'
);
select is(
  (select count(*) from public.player_badge_awards
    where player_id = '91000000-0000-0000-0000-000000000001'
      and badge_key = 'official-world-record'),
  1::bigint,
  'an official record unlocks one world-record badge'
);
select is(
  (select count(*) from (
    select award_key from public.player_badge_awards
    group by award_key having count(*) > 1
  ) duplicates),
  0::bigint,
  'derived badge award keys never duplicate'
);
select isnt_empty(
  $$select * from public.public_player_badges
    where player_id = '91000000-0000-0000-0000-000000000001'$$,
  'public profiles can read earned badges'
);
select is(
  (select valid_attempts from public.player_attempt_number_statistics
    where player_id = '91000000-0000-0000-0000-000000000001'
      and attempt_number = 1),
  1::bigint,
  'attempt-number statistics aggregate qualified event attempts'
);

create temp table pr7a_award_count as
select count(*) award_count
from public.player_badge_awards
where player_id = '91000000-0000-0000-0000-000000000001';

update public.events
set deleted_at = now()
where id = '91000000-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.public_hall_of_fame
    where player_id = '91000000-0000-0000-0000-000000000001'),
  0::bigint,
  'soft-deleted event attempts leave the Hall of Fame'
);
select is(
  (select count(*) from public.event_statistics
    where event_id = '91000000-0000-0000-0000-000000000002'),
  0::bigint,
  'soft-deleted events leave event statistics'
);
select is(
  (select count(*) from public.event_winners
    where event_id = '91000000-0000-0000-0000-000000000002'),
  0::bigint,
  'soft-deleted events leave winner results'
);
select is(
  (select count(*) from public.world_record_progression
    where player_id = '91000000-0000-0000-0000-000000000001'),
  0::bigint,
  'soft-deleted event attempts leave WR progression'
);
select is(
  (select count(*) from public.player_pb_progression
    where player_id = '91000000-0000-0000-0000-000000000001'),
  0::bigint,
  'soft-deleted event attempts leave PB progression'
);
select is(
  (select count(*) from public.player_badge_awards
    where player_id = '91000000-0000-0000-0000-000000000001'),
  0::bigint,
  'soft-delete withdraws every award derived from that event'
);
select is(
  (select event_count from public.global_statistics),
  (select event_count from pr7a_baseline),
  'soft-deleted events do not increase global event count'
);

update public.events
set deleted_at = null
where id = '91000000-0000-0000-0000-000000000002';

select is(
  (select personal_best_hundredths from public.public_hall_of_fame
    where player_id = '91000000-0000-0000-0000-000000000001'),
  150,
  'restore reinstates the exact personal best'
);
select is(
  (select count(*) from public.player_badge_awards
    where player_id = '91000000-0000-0000-0000-000000000001'),
  (select award_count from pr7a_award_count),
  'restore recreates the same badge set without duplicates'
);

set local role anon;
select throws_ok(
  $$select public.admin_soft_delete_event(
    '91000000-0000-0000-0000-000000000002'
  )$$,
  '42501',
  null,
  'anonymous users cannot call soft-delete'
);
select throws_ok(
  $$select public.admin_finalize_event_purge(
    '91000000-0000-0000-0000-000000000002'
  )$$,
  '42501',
  null,
  'anonymous users cannot permanently purge events'
);
reset role;

select * from finish();
rollback;
