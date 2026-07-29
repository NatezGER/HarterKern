begin;
create extension if not exists pgtap;
select plan(22);

select has_table('public', 'historical_attempts', 'historical attempts table exists');
select has_function(
  'public', 'sync_create_historical_attempt',
  array['uuid', 'text', 'date', 'integer', 'text']
);
select has_function(
  'public', 'sync_update_historical_attempt',
  array['uuid', 'uuid', 'text', 'date', 'integer', 'text']
);
select has_function(
  'public', 'sync_delete_historical_attempt', array['uuid']
);

select is(
  (select count(*) from public.players where not is_archived),
  16::bigint,
  'exactly 16 permanent production players exist'
);
select is(
  (select count(*) from public.players where normalized_name in ('jan', 'jan (ak)')),
  0::bigint,
  'Jan has no permanent profile'
);
select is(
  (select count(*) from public.events),
  1::bigint,
  'only one documented event exists'
);
select is(
  (select count(*) from public.events where start_date = '2025-02-22'),
  1::bigint,
  'the documented event is dated 22 February 2025'
);
select is(
  (select count(*) from public.attempts where event_id is not null),
  17::bigint,
  'the documented event contains 17 attempts'
);
select is(
  (select count(*) from public.historical_attempts where deleted_at is null),
  31::bigint,
  '31 historical attempts exist'
);
select is(
  (select count(*) from public.attempts)
    + (select count(*) from public.historical_attempts where deleted_at is null),
  48::bigint,
  'all 48 source rows exist exactly once'
);
select is(
  (select count(*) from public.attempts
    where player_id = '11000000-0000-0000-0000-000000000002'
      and time_hundredths = 269),
  2::bigint,
  'Pauls duplicate 2.69 event time is preserved twice'
);
select results_eq(
  $$select historical_label from public.historical_attempts
    where historical_label is not null group by historical_label order by historical_label$$,
  $$values ('ESC 2026'::text), ('Geburtstag Paul'::text), ('Maiwanderung 26'::text)$$,
  'context labels remain historical labels rather than events'
);
select is(
  (select count(*) from public.historical_attempts
    where display_name = 'Jan' and is_guest and out_of_competition
      and player_id is null and time_hundredths = 207),
  1::bigint,
  'Jan is one historical guest attempt out of competition'
);
select is(
  (select personal_best_hundredths from public.public_hall_of_fame
    where display_name = 'Paul'),
  206,
  'Pauls official personal best is 2.06'
);
select is(
  (select min(personal_best_hundredths) from public.public_hall_of_fame),
  206,
  'the official world record is 2.06'
);
select results_eq(
  $$select display_name, time_hundredths, achieved_at::date
    from public.world_record_progression order by achieved_at$$,
  $$values
    ('Fipsi'::text, 294, '2024-10-26'::date),
    ('Fipsi'::text, 279, '2025-01-01'::date),
    ('Paul'::text, 269, '2025-02-22'::date),
    ('Paul'::text, 242, '2025-05-02'::date),
    ('Paul'::text, 206, '2025-05-31'::date)$$,
  'world record progression includes event and historical records exactly once'
);
select is(
  (select approved_attempts from public.player_statistics
    where player_id = '11000000-0000-0000-0000-000000000002'),
  6::bigint,
  'historical attempts do not increase Pauls event attempt count'
);
select is(
  (select average_hundredths from public.player_statistics
    where player_id = '11000000-0000-0000-0000-000000000002'),
  322,
  'Pauls average uses only six event attempts'
);
select is(
  (select count(*) from public.public_hall_of_fame where display_name = 'Jan'),
  0::bigint,
  'historical guests never enter the Hall of Fame'
);
select is(
  (select valid_attempts from public.event_statistics
    where event_id = '22000000-0000-0000-0000-000000000001'),
  17::bigint,
  'the documented event contributes all 17 valid attempts'
);
select is(
  (select count(*) from public.events
    where name in ('Geburtstag Paul', 'Maiwanderung 26', 'ESC 2026')),
  0::bigint,
  'historical labels never create fake events'
);

select * from finish();
rollback;
