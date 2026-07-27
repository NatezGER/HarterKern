begin;
create extension if not exists pgtap;
select plan(15);

select has_table('public', 'players', 'players table exists');
select has_table('public', 'events', 'events table exists');
select has_table('public', 'attempts', 'attempts table exists');
select has_table('public', 'admin_roles', 'admin roles table exists');

select is(
  public.normalize_player_name('  PAUL  '),
  'paul',
  'player names are normalized'
);

insert into public.players (id, display_name)
values ('90000000-0000-0000-0000-000000000001', 'Test Player');
select throws_ok(
  $$insert into public.players (display_name) values (' test player ')$$,
  '23505',
  null,
  'normalized names are unique'
);

insert into public.events (
  id, start_date, started_at, ends_at
) values (
  '90000000-0000-0000-0000-000000000002',
  current_date,
  now(),
  now() + interval '30 hours'
);
select throws_ok(
  $$insert into public.events (start_date, started_at, ends_at)
    values (current_date, now(), now() + interval '30 hours')$$,
  '23505',
  null,
  'only one active event is allowed'
);

select throws_ok(
  $$insert into public.attempts (
      player_id, event_id, time_hundredths, is_dnf
    ) values (
      '90000000-0000-0000-0000-000000000001',
      '90000000-0000-0000-0000-000000000002',
      206,
      true
    )$$,
  '23514',
  null,
  'DNF and time are mutually exclusive'
);

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, source
) values (
  '90000000-0000-0000-0000-000000000003',
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  'approved',
  206,
  false,
  'admin'
);

select is(
  (select time_hundredths from public.attempts where id = '90000000-0000-0000-0000-000000000003'),
  206,
  'hundredths are stored as integers'
);
select isnt_empty(
  $$select * from public.public_hall_of_fame$$,
  'Hall of Fame is dynamically calculated'
);
select isnt_empty(
  $$select * from public.world_record_progression$$,
  'world record progression is dynamically calculated'
);
select is(
  (select status::text from public.events where id = '90000000-0000-0000-0000-000000000002'),
  'active',
  'event starts active'
);
select has_function('public', 'submit_public_attempt', array['text', 'boolean', 'uuid', 'text', 'integer']);
select has_function('public', 'admin_merge_players', array['uuid', 'uuid']);
select has_view('public', 'event_winners');

select * from finish();
rollback;
