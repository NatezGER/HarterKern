begin;
select plan(27);

select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions where family_key = 'valid-attempts'),
  array[10, 50, 100, 500], 'lifetime valid-attempt thresholds stay unchanged');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions where family_key = 'event-attempts'),
  array[5, 10, 20, 30], 'event-attempt thresholds are complete');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions where family_key = 'rapid-fire'),
  array[2, 4, 6, 10], 'rapid-fire thresholds are complete');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions where family_key = 'teamwork'),
  array[1, 3, 5, 10], 'teamwork thresholds are complete');
select has_view('public', 'p115_badge_expansion_awards',
  'new eligibility uses one canonical source view');

insert into public.players (id, display_name) values
  ('39000000-0000-0000-0000-000000000001', 'Event Count'),
  ('39000000-0000-0000-0000-000000000002', 'Split Count'),
  ('39000000-0000-0000-0000-000000000003', 'Rapid Fire'),
  ('39000000-0000-0000-0000-000000000004', 'Boundary'),
  ('39000000-0000-0000-0000-000000000005', 'Team A'),
  ('39000000-0000-0000-0000-000000000006', 'Team B'),
  ('39000000-0000-0000-0000-000000000007', 'Team C');

insert into public.events (id, name, start_date, started_at, ends_at, status)
values
  ('39000000-0000-0000-0000-000000000010', 'Event Attempts', '2026-08-30',
    '2026-08-30 10:00+00', '2026-08-30 20:00+00', 'active'),
  ('39000000-0000-0000-0000-000000000011', 'Split A', '2026-08-30',
    '2026-08-30 10:00+00', '2026-08-30 20:00+00', 'active'),
  ('39000000-0000-0000-0000-000000000012', 'Split B', '2026-08-30',
    '2026-08-30 10:00+00', '2026-08-30 20:00+00', 'active'),
  ('39000000-0000-0000-0000-000000000013', 'Teamwork', '2026-08-30',
    '2026-08-30 10:00+00', '2026-08-30 20:00+00', 'active');

insert into public.event_participants (event_id, player_id) values
  ('39000000-0000-0000-0000-000000000010', '39000000-0000-0000-0000-000000000001'),
  ('39000000-0000-0000-0000-000000000011', '39000000-0000-0000-0000-000000000002'),
  ('39000000-0000-0000-0000-000000000012', '39000000-0000-0000-0000-000000000002'),
  ('39000000-0000-0000-0000-000000000013', '39000000-0000-0000-0000-000000000005'),
  ('39000000-0000-0000-0000-000000000013', '39000000-0000-0000-0000-000000000006'),
  ('39000000-0000-0000-0000-000000000013', '39000000-0000-0000-0000-000000000007');

insert into public.attempts (id, player_id, event_id, status,
  time_hundredths, is_dnf, is_ak, submitted_at, source) values
  ('39000000-0000-0000-0000-000000000101', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', 301, false, false, '2026-08-30 10:01+00', 'admin'),
  ('39000000-0000-0000-0000-000000000102', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', 302, false, false, '2026-08-30 11:01+00', 'admin'),
  ('39000000-0000-0000-0000-000000000103', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', 303, false, false, '2026-08-30 12:01+00', 'admin'),
  ('39000000-0000-0000-0000-000000000104', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', 304, false, false, '2026-08-30 13:01+00', 'admin');

select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-bronze'), 0::bigint,
  'four valid attempts in one event do not award bronze');

insert into public.attempts (id, player_id, event_id, status,
  time_hundredths, is_dnf, is_ak, submitted_at, source) values
  ('39000000-0000-0000-0000-000000000105', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', 305, false, false, '2026-08-30 14:01+00', 'admin'),
  ('39000000-0000-0000-0000-000000000106', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', null, true, false, '2026-08-30 14:02+00', 'admin'),
  ('39000000-0000-0000-0000-000000000107', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', 307, false, true, '2026-08-30 14:03+00', 'admin'),
  ('39000000-0000-0000-0000-000000000108', '39000000-0000-0000-0000-000000000001', '39000000-0000-0000-0000-000000000010', 'approved', 308, false, false, '2026-08-30 14:04+00', 'admin');
update public.attempts set deleted_at = now()
where id = '39000000-0000-0000-0000-000000000108';

select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-bronze'), 1::bigint,
  'fifth valid attempt awards bronze during an active event');
select is((select source_attempt_id from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-bronze'),
  '39000000-0000-0000-0000-000000000105'::uuid,
  'fifth valid attempt is the event-attempt proof');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-silver'), 0::bigint,
  'DNF, AK and deleted attempts do not advance event attempts');

insert into public.attempts (id, player_id, event_id, status,
  time_hundredths, is_dnf, submitted_at, source)
select gen_random_uuid(), '39000000-0000-0000-0000-000000000001',
  '39000000-0000-0000-0000-000000000010', 'approved', 300 + sequence,
  false, '2026-08-31 00:00+00'::timestamptz + sequence * interval '2 hours',
  'admin'
from generate_series(6, 30) sequence;
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-silver'), 1::bigint,
  'ten valid attempts in one event award silver');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-gold'), 1::bigint,
  'twenty valid attempts in one event award gold');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-diamond'), 1::bigint,
  'thirty valid attempts in one event award diamond');
update public.attempts set is_dnf = true, time_hundredths = null
where id = '39000000-0000-0000-0000-000000000105';
select isnt((select source_attempt_id from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000001'
    and badge_key = 'event-attempts-bronze'),
  '39000000-0000-0000-0000-000000000105'::uuid,
  'removing the original proof advances the canonical event-attempt proof');

insert into public.attempts (id, player_id, event_id, status,
  time_hundredths, is_dnf, submitted_at, source) values
  ('39000000-0000-0000-0000-000000000111', '39000000-0000-0000-0000-000000000002', '39000000-0000-0000-0000-000000000011', 'approved', 310, false, '2026-08-30 10:00+00', 'admin'),
  ('39000000-0000-0000-0000-000000000112', '39000000-0000-0000-0000-000000000002', '39000000-0000-0000-0000-000000000011', 'approved', 311, false, '2026-08-30 10:01+00', 'admin'),
  ('39000000-0000-0000-0000-000000000113', '39000000-0000-0000-0000-000000000002', '39000000-0000-0000-0000-000000000011', 'approved', 312, false, '2026-08-30 10:02+00', 'admin'),
  ('39000000-0000-0000-0000-000000000114', '39000000-0000-0000-0000-000000000002', '39000000-0000-0000-0000-000000000012', 'approved', 313, false, '2026-08-30 12:00+00', 'admin'),
  ('39000000-0000-0000-0000-000000000115', '39000000-0000-0000-0000-000000000002', '39000000-0000-0000-0000-000000000012', 'approved', 314, false, '2026-08-30 12:01+00', 'admin');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000002'
    and badge_key = 'event-attempts-bronze'), 0::bigint,
  'attempts from separate events are not added together');

insert into public.attempts (id, player_id, status, time_hundredths,
  is_dnf, submitted_at, source) values
  ('39000000-0000-0000-0000-000000000121', '39000000-0000-0000-0000-000000000003', 'approved', 320, false, '2026-08-30 18:47+00', 'admin'),
  ('39000000-0000-0000-0000-000000000122', '39000000-0000-0000-0000-000000000003', 'approved', 321, false, '2026-08-30 19:02+00', 'admin'),
  ('39000000-0000-0000-0000-000000000123', '39000000-0000-0000-0000-000000000003', 'approved', null, true, '2026-08-30 19:10+00', 'admin'),
  ('39000000-0000-0000-0000-000000000124', '39000000-0000-0000-0000-000000000003', 'approved', 322, false, '2026-08-30 19:16+00', 'admin'),
  ('39000000-0000-0000-0000-000000000125', '39000000-0000-0000-0000-000000000003', 'approved', 323, false, '2026-08-30 19:31+00', 'admin');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000003'
    and badge_key = 'rapid-fire-bronze'), 1::bigint,
  'two valid attempts award rapid-fire bronze');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000003'
    and badge_key = 'rapid-fire-silver'), 1::bigint,
  'four valid attempts across the hour boundary award silver despite DNF');
select is((select source_attempt_id from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000003'
    and badge_key = 'rapid-fire-silver'),
  '39000000-0000-0000-0000-000000000125'::uuid,
  'fourth valid attempt is the rapid-fire silver proof');
insert into public.attempts (id, player_id, status, time_hundredths,
  is_dnf, submitted_at, source)
select gen_random_uuid(), '39000000-0000-0000-0000-000000000003',
  'approved', 330 + sequence, false,
  '2026-08-30 19:31+00'::timestamptz + sequence * interval '1 minute',
  'admin'
from generate_series(1, 6) sequence;
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000003'
    and badge_key = 'rapid-fire-gold'), 1::bigint,
  'six valid attempts in a rolling hour award gold');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000003'
    and badge_key = 'rapid-fire-diamond'), 1::bigint,
  'ten valid attempts in a rolling hour award diamond');

insert into public.attempts (id, player_id, status, time_hundredths,
  is_dnf, submitted_at, source) values
  ('39000000-0000-0000-0000-000000000131', '39000000-0000-0000-0000-000000000004', 'approved', 330, false, '2026-08-30 18:00+00', 'admin'),
  ('39000000-0000-0000-0000-000000000132', '39000000-0000-0000-0000-000000000004', 'approved', 331, false, '2026-08-30 19:00+00', 'admin');
select is((select count(*) from public.player_badge_award_ledger
  where player_id = '39000000-0000-0000-0000-000000000004'
    and badge_key = 'rapid-fire-bronze'), 1::bigint,
  'exactly 60 minutes is inside the rolling window');

insert into public.attempts (id, player_id, event_id, status,
  time_hundredths, is_dnf, submitted_at, source) values
  ('39000000-0000-0000-0000-000000000141', '39000000-0000-0000-0000-000000000005', '39000000-0000-0000-0000-000000000013', 'approved', 250, false, '2026-08-30 18:00+00', 'admin'),
  ('39000000-0000-0000-0000-000000000142', '39000000-0000-0000-0000-000000000006', '39000000-0000-0000-0000-000000000013', 'approved', 250, false, '2026-08-30 18:01+00', 'admin'),
  ('39000000-0000-0000-0000-000000000143', '39000000-0000-0000-0000-000000000007', '39000000-0000-0000-0000-000000000013', 'approved', 270, false, '2026-08-30 18:02+00', 'admin');
select is((select count(*) from public.player_badge_award_ledger
  where badge_key = 'teamwork-bronze' and player_id::text like '39000000-%'),
  0::bigint, 'active event creates no Teamwork award');

select lives_ok($$select public.sync_close_event(
  '39000000-0000-0000-0000-000000000013', 'manual')$$,
  'Teamwork event closes successfully');
select is((select count(*) from public.player_badge_award_ledger
  where badge_key = 'teamwork-bronze' and player_id in (
    '39000000-0000-0000-0000-000000000005',
    '39000000-0000-0000-0000-000000000006')),
  2::bigint, 'both players sharing a final PB receive Teamwork');
select results_eq($$select rank from public.event_final_standings
  where event_id = '39000000-0000-0000-0000-000000000013'
  order by best_time_hundredths, display_name$$,
  $$values (1), (1), (3)$$, 'Teamwork preserves competition ranking');
select is((select count(*) from public.player_badge_award_ledger
  where badge_key = 'teamwork-bronze'
    and player_id = '39000000-0000-0000-0000-000000000007'),
  0::bigint, 'an unshared lower placement receives no Teamwork');

update public.attempts set time_hundredths = 260
where id = '39000000-0000-0000-0000-000000000142';
select is((select count(*) from public.player_badge_award_ledger
  where badge_key = 'teamwork-bronze' and player_id in (
    '39000000-0000-0000-0000-000000000005',
    '39000000-0000-0000-0000-000000000006')),
  0::bigint, 'closed-event correction revokes Teamwork from both players');

select lives_ok($$select public.sync_all_player_badge_award_ledgers()$$,
  'global ledger rebuild is idempotent for expanded awards');

select * from finish();
rollback;
