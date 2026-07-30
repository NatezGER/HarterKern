begin;
create extension if not exists pgtap;
select plan(28);

select has_column('public', 'players', 'avatar_path', 'players have a canonical avatar path');
select has_column('public', 'event_photos', 'mime_type', 'event photos store their MIME type');
select has_column('public', 'event_photos', 'size_bytes', 'event photos store their byte size');
select has_view('public', 'event_attempt_details', 'central event-attempt details exist');
select has_view('public', 'event_participant_statistics', 'central participant statistics exist');
select has_view('public', 'player_event_history', 'central player event history exists');
select has_function('public', 'admin_set_player_avatar', array['uuid', 'text']);
select has_function('public', 'admin_clear_player_avatar', array['uuid']);
select has_function(
  'public', 'admin_register_event_photo',
  array['uuid', 'text', 'text', 'bigint', 'text']
);
select has_function('public', 'admin_remove_event_photo', array['uuid']);
select has_function(
  'public', 'admin_update_event_details',
  array['uuid', 'text', 'text', 'boolean']
);
select is(
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname like 'player_avatars_%'
        or policyname like 'event_photos_%storage%')),
  8::bigint,
  'existing PR 7A media policies remain in force'
);

insert into public.players (id, display_name)
values ('92000000-0000-0000-0000-000000000001', 'PR7B Player');
select throws_ok(
  $$update public.players set avatar_path = 'wrong/file.jpg'
    where id = '92000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'avatar paths must be scoped to the player UUID'
);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values (
  '92000000-0000-0000-0000-000000000002',
  'PR7B History',
  current_date,
  now() - interval '2 hours',
  now() - interval '1 hour',
  'closed',
  now() - interval '1 hour'
);
insert into public.event_participants (event_id, player_id)
values (
  '92000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000001'
);
insert into public.event_guests (id, event_id, display_name)
values (
  '92000000-0000-0000-0000-000000000003',
  '92000000-0000-0000-0000-000000000002',
  'PR7B Guest'
);
insert into public.attempts (
  id, player_id, guest_id, event_id, status, time_hundredths,
  is_dnf, submitted_at, source
) values
  (
    '92000000-0000-0000-0000-000000000004',
    '92000000-0000-0000-0000-000000000001', null,
    '92000000-0000-0000-0000-000000000002',
    'approved', 1, false, now() - interval '110 minutes', 'admin'
  ),
  (
    '92000000-0000-0000-0000-000000000005',
    '92000000-0000-0000-0000-000000000001', null,
    '92000000-0000-0000-0000-000000000002',
    'approved', null, true, now() - interval '100 minutes', 'admin'
  ),
  (
    '92000000-0000-0000-0000-000000000006',
    null, '92000000-0000-0000-0000-000000000003',
    '92000000-0000-0000-0000-000000000002',
    'approved', 0, false, now() - interval '90 minutes', 'admin'
  );

insert into public.event_photos (
  id, event_id, storage_path, mime_type, size_bytes
) values (
  '92000000-0000-0000-0000-000000000007',
  '92000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000002/92000000-0000-0000-0000-000000000008.jpg',
  'image/jpeg',
  1024
);

select is(
  (select count(*) from public.event_attempt_details
    where event_id = '92000000-0000-0000-0000-000000000002'),
  3::bigint,
  'all approved visible event attempts are returned once'
);
select ok(
  (select is_personal_best from public.event_attempt_details
    where attempt_id = '92000000-0000-0000-0000-000000000004'),
  'PB comes from the central historical progression'
);
select ok(
  (select is_world_record from public.event_attempt_details
    where attempt_id = '92000000-0000-0000-0000-000000000004'),
  'WR comes from the central official progression'
);
select ok(
  (select is_event_best from public.event_attempt_details
    where attempt_id = '92000000-0000-0000-0000-000000000006'),
  'the qualified event-best is marked centrally'
);
select isnt(
  (select is_event_best from public.event_attempt_details
    where attempt_id = '92000000-0000-0000-0000-000000000005'),
  true,
  'DNF can never be an event-best'
);
select is(
  (select display_name from public.event_podium
    where event_id = '92000000-0000-0000-0000-000000000002' and rank = 1),
  'PR7B Guest',
  'a guest can hold the central event podium'
);
select results_eq(
  $$select is_personal_best, is_world_record from public.event_attempt_details
    where attempt_id = '92000000-0000-0000-0000-000000000006'$$,
  $$values (false, false)$$,
  'guests never receive PB or WR markers'
);
select is(
  (select count(*) from public.player_event_history
    where player_id = '92000000-0000-0000-0000-000000000001'
      and event_id = '92000000-0000-0000-0000-000000000002'),
  1::bigint,
  'the player history contains the event exactly once'
);
select is(
  (select average_hundredths from public.player_attempt_number_statistics
    where player_id = '92000000-0000-0000-0000-000000000001'
      and attempt_number = 1),
  1,
  'attempt-number averages exclude the later DNF'
);

set local role anon;
select is(
  (select count(*) from public.event_photos
    where event_id = '92000000-0000-0000-0000-000000000002'),
  1::bigint,
  'public users can read photos of a visible event'
);
reset role;

update public.events
set deleted_at = now()
where id = '92000000-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.event_attempt_details
    where event_id = '92000000-0000-0000-0000-000000000002'),
  0::bigint,
  'soft-deleted events leave event attempts'
);
select is(
  (select count(*) from public.player_event_history
    where event_id = '92000000-0000-0000-0000-000000000002'),
  0::bigint,
  'soft-deleted events leave player histories'
);
set local role anon;
select is(
  (select count(*) from public.event_photos
    where event_id = '92000000-0000-0000-0000-000000000002'),
  0::bigint,
  'soft-delete hides event photo metadata from public users'
);
select throws_ok(
  $$select public.admin_set_player_avatar(
    '92000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001/92000000-0000-0000-0000-000000000009.jpg'
  )$$,
  '42501',
  null,
  'non-admin users cannot update avatars'
);
select throws_ok(
  $$select public.admin_register_event_photo(
    '92000000-0000-0000-0000-000000000002',
    '92000000-0000-0000-0000-000000000002/92000000-0000-0000-0000-000000000010.jpg',
    'image/jpeg',
    1024,
    null
  )$$,
  '42501',
  null,
  'non-admin users cannot register event photos'
);
reset role;

select * from finish();
rollback;
