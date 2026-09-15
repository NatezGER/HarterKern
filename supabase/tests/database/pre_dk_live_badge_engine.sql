begin;
create extension if not exists pgtap;
select no_plan();

select has_function('public', 'get_live_attempt_badge_unlocks', array['uuid'],
  'player/attempt-scoped live badge RPC exists');
select has_table('public', 'matrix_glitch_event_evidence',
  'global Matrix evidence is persisted canonically');

-- Fixture writes must not invoke the legacy eligibility engine. Production
-- inserts keep the hotfix trigger enabled; this test disables it only while
-- constructing pre-existing history inside the rollback transaction.
alter table public.attempts disable trigger attempts_insert_refresh_badge_ledger;
alter table public.historical_attempts disable trigger historical_attempts_refresh_badge_ledger;

insert into public.players (id, display_name, is_ak) values
  ('50000000-0000-0000-0000-000000000001', 'Live Time', false),
  ('50000000-0000-0000-0000-000000000002', 'Live Count', false),
  ('50000000-0000-0000-0000-000000000003', 'Live Event Count', false),
  ('50000000-0000-0000-0000-000000000004', 'Live Streak', false),
  ('50000000-0000-0000-0000-000000000005', 'Live Flawless', false),
  ('50000000-0000-0000-0000-000000000006', 'Broken Flawless', false),
  ('50000000-0000-0000-0000-000000000007', 'Live Rapid', false),
  ('50000000-0000-0000-0000-000000000008', 'Outside Rapid', false),
  ('50000000-0000-0000-0000-000000000009', 'Favorite', false),
  ('50000000-0000-0000-0000-000000000010', 'Specials', false),
  ('50000000-0000-0000-0000-000000000011', 'False Starter', false),
  ('50000000-0000-0000-0000-000000000012', 'Reverse', false),
  ('50000000-0000-0000-0000-000000000013', 'Bingo', false),
  ('50000000-0000-0000-0000-000000000014', 'Matrix A', false),
  ('50000000-0000-0000-0000-000000000015', 'Matrix B', false),
  ('50000000-0000-0000-0000-000000000016', 'AK Matrix', true),
  ('50000000-0000-0000-0000-000000000017', 'Inactive Definition', false),
  ('50000000-0000-0000-0000-000000000018', 'World Record', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at
) values
  ('50000000-0000-0000-0000-000000000100', 'Prior Event', '2026-09-13',
    '2026-09-13 10:00+00', '2026-09-13 20:00+00', 'closed',
    '2026-09-13 20:00+00'),
  ('50000000-0000-0000-0000-000000000101', 'Live Event', '2026-09-15',
    '2026-09-15 10:00+00', '2026-09-15 20:00+00', 'active', null);

insert into public.event_participants (event_id, player_id)
select '50000000-0000-0000-0000-000000000101', id
from public.players where id::text like '50000000-%' and not is_ak;

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths, sort_order
)
select ('51000000-0000-0000-0000-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000002', 'Live Count', '2026-09-01',
  400 + sequence, sequence
from generate_series(1, 9) sequence;

-- Pre-existing values for each narrowly scoped evaluator.
insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000101', 'approved', 450, false, false, '2026-09-15 10:01+00', 'admin'),
  ('52000000-0000-0000-0000-000000000020', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000100', 'approved', 390, false, false, '2026-09-13 12:00+00', 'admin'),
  ('52000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000101', 'approved', 391, false, false, '2026-09-15 10:10+00', 'admin'),
  ('52000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000101', 'approved', 392, false, false, '2026-09-15 10:11+00', 'admin'),
  ('52000000-0000-0000-0000-000000000023', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000101', 'approved', 393, false, false, '2026-09-15 10:12+00', 'admin'),
  ('52000000-0000-0000-0000-000000000024', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000101', 'approved', 394, false, false, '2026-09-15 10:13+00', 'admin'),
  ('52000000-0000-0000-0000-000000000030', '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000101', 'approved', 250, false, false, '2026-09-15 10:20+00', 'admin'),
  ('52000000-0000-0000-0000-000000000031', '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000101', 'approved', 310, false, false, '2026-09-15 10:21+00', 'admin'),
  ('52000000-0000-0000-0000-000000000032', '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000101', 'approved', 250, false, false, '2026-09-15 10:22+00', 'admin'),
  ('52000000-0000-0000-0000-000000000040', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000100', 'approved', 350, false, false, '2026-09-13 12:01+00', 'admin'),
  ('52000000-0000-0000-0000-000000000041', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000100', 'approved', 351, false, false, '2026-09-13 12:02+00', 'admin'),
  ('52000000-0000-0000-0000-000000000042', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000100', 'approved', 352, false, false, '2026-09-13 12:03+00', 'admin'),
  ('52000000-0000-0000-0000-000000000043', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000100', 'approved', 353, false, false, '2026-09-13 12:04+00', 'admin'),
  ('52000000-0000-0000-0000-000000000050', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000100', 'approved', 360, false, false, '2026-09-13 13:01+00', 'admin'),
  ('52000000-0000-0000-0000-000000000051', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000100', 'approved', 361, false, false, '2026-09-13 13:02+00', 'admin'),
  ('52000000-0000-0000-0000-000000000052', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000100', 'approved', 362, false, false, '2026-09-13 13:03+00', 'admin'),
  ('52000000-0000-0000-0000-000000000053', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000100', 'approved', 363, false, false, '2026-09-13 13:04+00', 'admin'),
  ('52000000-0000-0000-0000-000000000054', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000101', 'approved', null, true, false, '2026-09-15 10:30+00', 'admin'),
  ('52000000-0000-0000-0000-000000000060', '50000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000101', 'approved', 370, false, false, '2026-09-15 11:00+00', 'admin'),
  ('52000000-0000-0000-0000-000000000070', '50000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000101', 'approved', 380, false, false, '2026-09-15 11:00+00', 'admin'),
  ('52000000-0000-0000-0000-000000000080', '50000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000101', 'approved', 294, false, false, '2026-09-15 10:40+00', 'admin'),
  ('52000000-0000-0000-0000-000000000090', '50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000101', 'approved', 100, false, false, '2026-09-15 12:00+00', 'admin'),
  ('52000000-0000-0000-0000-000000000091', '50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000101', 'approved', 110, false, false, '2026-09-15 12:01+00', 'admin'),
  ('52000000-0000-0000-0000-000000000092', '50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000101', 'approved', 120, false, false, '2026-09-15 12:02+00', 'admin'),
  ('52000000-0000-0000-0000-000000000093', '50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000101', 'approved', 130, false, false, '2026-09-15 12:03+00', 'admin');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source
)
select ('53000000-0000-0000-0000-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000011',
  '50000000-0000-0000-0000-000000000101', 'approved', null, true,
  '2026-09-15 12:10+00'::timestamptz + sequence * interval '1 minute', 'admin'
from generate_series(1, 9) sequence;

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source
)
select ('54000000-0000-0000-0000-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000013',
  '50000000-0000-0000-0000-000000000101', 'approved', 300 + sequence,
  false, '2026-09-15 13:00+00'::timestamptz + sequence * interval '1 minute', 'admin'
from generate_series(0, 8) sequence;

alter table public.attempts enable trigger attempts_insert_refresh_badge_ledger;
alter table public.historical_attempts enable trigger historical_attempts_refresh_badge_ledger;
delete from public.player_badge_award_ledger where player_id::text like '50000000-%';

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf,
  submitted_at, source
) values (
  '52000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000101', 'approved', 190, false,
  '2026-09-15 14:00+00', 'admin'
);

select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000002') where badge_key = 'first-sub4'), 'sub-4 unlocks');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000002') where badge_key = 'first-sub3'), 'sub-3 unlocks');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000002') where badge_key = 'first-sub2'), 'sub-2 unlocks');
select ok(not exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000002') where badge_key = 'first-sub5'), 'an earlier sub-5 is not announced again');
insert into public.player_badge_award_ledger (
  award_key, player_id, badge_key, source_type, source_attempt_id,
  source_awarded_at, awarded_at
) values (
  '50000000-0000-0000-0000-000000000001:first-sub4',
  '50000000-0000-0000-0000-000000000001', 'first-sub4', 'attempt',
  '52000000-0000-0000-0000-000000000002', '2026-09-15 14:00+00',
  '2026-09-15 14:00+00'
);
select ok(not exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000002') where badge_key = 'first-sub4'), 'persisted ledger awards are not returned twice');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
values ('52000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000101', 'approved', 420, false, '2026-09-15 14:01+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000010') where badge_key = 'valid-attempts-bronze'), 'valid attempts combine historical and current attempts');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
values ('52000000-0000-0000-0000-000000000025', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000101', 'approved', 395, false, '2026-09-15 14:02+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000025') where badge_key = 'event-attempts-bronze'), 'event attempts exclude the prior event');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
values ('52000000-0000-0000-0000-000000000033', '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000101', 'approved', 250, false, '2026-09-15 14:03+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000033') where badge_key = 'sub3-streak-bronze'), 'sub-3 restarts after a >=3 breaker');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('52000000-0000-0000-0000-000000000044', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000101', 'approved', 354, false, '2026-09-15 14:04+00', 'admin'),
  ('52000000-0000-0000-0000-000000000055', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000101', 'approved', 364, false, '2026-09-15 14:05+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000044') where badge_key = 'flawless-bronze'), 'Flawless continues across event boundaries');
select ok(not exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000055') where badge_key = 'flawless-bronze'), 'DNF breaks Flawless across events');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('52000000-0000-0000-0000-000000000061', '50000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000101', 'approved', 371, false, '2026-09-15 12:00+00', 'admin'),
  ('52000000-0000-0000-0000-000000000071', '50000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000101', 'approved', 381, false, '2026-09-15 12:00:01+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000061') where badge_key = 'rapid-fire-bronze'), 'exactly 60 minutes is inside Rapid Fire');
select ok(not exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000071') where badge_key = 'rapid-fire-bronze'), 'just over 60 minutes is outside Rapid Fire');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
values ('52000000-0000-0000-0000-000000000081', '50000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000101', 'approved', 294, false, '2026-09-15 14:10+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000081') where badge_key = 'favorite-time-bronze'), 'Favorite Time uses exact full-time occurrence two');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
values ('52000000-0000-0000-0000-000000000082', '50000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000101', 'approved', 294, false, '2026-09-15 14:10:01+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000082') where badge_key = 'favorite-time-silver'), 'Favorite Time occurrence three unlocks Silver');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('52000000-0000-0000-0000-000000000083', '50000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000101', 'approved', 294, false, '2026-09-15 14:10:02+00', 'admin'),
  ('52000000-0000-0000-0000-000000000084', '50000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000101', 'approved', 294, false, '2026-09-15 14:10:03+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000084') where badge_key = 'favorite-time-gold'), 'Favorite Time occurrence five unlocks Gold');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
select ('52000000-0000-0000-0001-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000101',
  'approved', 294, false, '2026-09-15 14:10:03+00'::timestamptz + sequence * interval '1 second', 'admin'
from generate_series(1, 5) sequence;
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0001-000000000005') where badge_key = 'favorite-time-diamond'), 'Favorite Time occurrence ten unlocks Diamond');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('52000000-0000-0000-0000-000000000100', '50000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000101', 'approved', 300, false, '2026-09-15 14:11+00', 'admin'),
  ('52000000-0000-0000-0000-000000000101', '50000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000101', 'approved', 301, false, '2026-09-15 14:12+00', 'admin'),
  ('52000000-0000-0000-0000-000000000110', '50000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000101', 'approved', null, true, '2026-09-15 14:13+00', 'admin'),
  ('52000000-0000-0000-0000-000000000094', '50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000101', 'approved', 140, false, '2026-09-15 14:14+00', 'admin'),
  ('54000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000101', 'approved', 309, false, '2026-09-15 14:15+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000100') where badge_key = 'time-stopper'), '.00 unlocks Time Stopper');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000101') where badge_key = 'almost'), '.01 unlocks Almost');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000110') where badge_key = 'false-starter'), 'tenth qualified DNF unlocks False Starter');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('52000000-0000-0000-0000-000000000094') where badge_key = 'reverse-gear'), 'five increasingly slower event attempts unlock Reverse Gear');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('54000000-0000-0000-0000-000000000009') where badge_key = 'bingo-bronze'), 'only the affected row completion unlocks BINGO Bronze');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
select ('54000000-0000-0000-0001-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000101',
  'approved', 400 + sequence, false,
  '2026-09-15 14:16+00'::timestamptz + sequence * interval '1 second', 'admin'
from generate_series(0, 9) sequence;
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('54000000-0000-0000-0001-000000000009') where badge_key = 'bingo-silver'), 'affected line unlocks BINGO Silver at two hits per cell');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
select ('54000000-0000-0000-0002-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000101',
  'approved', 500 + sequence, false,
  '2026-09-15 14:17+00'::timestamptz + sequence * interval '1 second', 'admin'
from generate_series(0, 9) sequence;
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('54000000-0000-0000-0002-000000000009') where badge_key = 'bingo-gold'), 'affected line unlocks BINGO Gold at three hits per cell');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
select ('54000000-0000-0000-0003-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000101',
  'approved', 600 + sequence, false,
  '2026-09-15 14:18+00'::timestamptz + sequence * interval '1 second', 'admin'
from generate_series(0, 9) sequence;
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
select ('54000000-0000-0000-0004-' || lpad(sequence::text, 12, '0'))::uuid,
  '50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000101',
  'approved', 700 + sequence, false,
  '2026-09-15 14:19+00'::timestamptz + sequence * interval '1 second', 'admin'
from generate_series(0, 9) sequence;
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('54000000-0000-0000-0004-000000000009') where badge_key = 'bingo-diamond'), 'affected line unlocks BINGO Diamond at five hits per cell');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('55000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000018', '50000000-0000-0000-0000-000000000101', 'approved', 2, false, '2026-09-15 14:20+00', 'admin'),
  ('55000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000018', '50000000-0000-0000-0000-000000000101', 'approved', 1, false, '2026-09-15 14:21+00', 'admin');
select ok(exists(select 1 from public.get_live_attempt_badge_unlocks('55000000-0000-0000-0000-000000000002') where badge_key = 'official-world-record'), 'strictly faster current global minimum unlocks World Record');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('55000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000018', '50000000-0000-0000-0000-000000000101', 'approved', 1, false, '2026-09-15 14:22+00', 'admin'),
  ('55000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000018', '50000000-0000-0000-0000-000000000101', 'approved', 3, false, '2026-09-15 14:23+00', 'admin');
select ok(not exists(select 1 from public.get_live_attempt_badge_unlocks('55000000-0000-0000-0000-000000000003') where badge_key = 'official-world-record'), 'equal global time is not a new World Record');
select ok(not exists(select 1 from public.get_live_attempt_badge_unlocks('55000000-0000-0000-0000-000000000004') where badge_key = 'official-world-record'), 'slower global time is not a World Record');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('56000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000101', 'approved', 242, false, '2026-09-15 15:00+00', 'admin'),
  ('56000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000101', 'approved', 242, false, '2026-09-15 15:01+00', 'admin');
select is((select metadata->>'mode' from public.get_live_attempt_badge_unlocks('56000000-0000-0000-0000-000000000002') where badge_key = 'matrix-glitch'), 'personal_and_global', 'same player can satisfy both Matrix modes once');
select is((select mode from public.matrix_glitch_event_evidence where source_attempt_id = '56000000-0000-0000-0000-000000000002'), 'personal_and_global', 'combined Matrix mode is persisted');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('56000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000101', 'approved', 243, false, '2026-09-15 15:02+00', 'admin'),
  ('56000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000101', 'approved', 243, false, '2026-09-15 15:03+00', 'admin');
select is((select metadata->>'mode' from public.get_live_attempt_badge_unlocks('56000000-0000-0000-0000-000000000004') where badge_key = 'matrix-glitch'), 'global', 'different regular players unlock global Matrix for the second player');

update public.attempts set time_hundredths = 244 where id = '56000000-0000-0000-0000-000000000003';
select ok(not exists(select 1 from public.matrix_glitch_event_evidence where source_attempt_id = '56000000-0000-0000-0000-000000000004'), 'Matrix update locally removes stale evidence');
update public.attempts set time_hundredths = 243 where id = '56000000-0000-0000-0000-000000000003';
select ok(exists(select 1 from public.matrix_glitch_event_evidence where source_attempt_id = '56000000-0000-0000-0000-000000000004'), 'Matrix update locally recreates evidence');
delete from public.attempts where id = '56000000-0000-0000-0000-000000000003';
select ok(not exists(select 1 from public.matrix_glitch_event_evidence where source_attempt_id = '56000000-0000-0000-0000-000000000004'), 'Matrix delete locally repairs adjacency evidence');

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, is_ak, submitted_at, source) values
  ('56000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000101', 'approved', 245, false, false, '2026-09-15 15:20+00', 'admin'),
  ('56000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000101', 'approved', null, true, false, '2026-09-15 15:21+00', 'admin'),
  ('56000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000016', '50000000-0000-0000-0000-000000000101', 'approved', 245, false, true, '2026-09-15 15:22+00', 'admin');
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('56000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000101', 'pending', 245, false, '2026-09-15 15:23+00', 'public'),
  ('56000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000101', 'approved', 245, false, '2026-09-15 15:24+00', 'admin');
select is((select metadata->>'mode' from public.get_live_attempt_badge_unlocks('56000000-0000-0000-0000-000000000014') where badge_key = 'matrix-glitch'), 'global', 'global Matrix skips DNF, AK and unqualified attempts');

alter table public.badge_definitions disable trigger badge_definitions_refresh_badge_ledger;
update public.badge_definitions set is_active = false where badge_key = 'first-official-attempt';
insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source)
values ('57000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000017', '50000000-0000-0000-0000-000000000101', 'approved', 401, false, '2026-09-15 15:10+00', 'admin');
select ok(not exists(select 1 from public.get_live_attempt_badge_unlocks('57000000-0000-0000-0000-000000000001') where badge_key = 'first-official-attempt'), 'inactive definitions are never returned');
alter table public.badge_definitions enable trigger badge_definitions_refresh_badge_ledger;

insert into public.attempts (id, player_id, event_id, status, time_hundredths, is_dnf, submitted_at, source) values
  ('56000000-0000-0000-0000-000000000020', '50000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000101', 'approved', 246, false, '2026-09-15 15:30+00', 'admin'),
  ('56000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000101', 'approved', 246, false, '2026-09-15 15:31+00', 'admin');
select lives_ok($$select * from public.get_live_attempt_badge_unlocks('56000000-0000-0000-0000-000000000021')$$, 'global Matrix live evaluation succeeds before close');
update public.events set status = 'closed', closed_at = '2026-09-15 20:00+00'
where id = '50000000-0000-0000-0000-000000000101';
select ok(exists(select 1 from public.player_badge_award_ledger where player_id = '50000000-0000-0000-0000-000000000015' and badge_key = 'matrix-glitch'), 'event-close ledger sync reproduces persisted global Matrix evidence');

select * from finish();
rollback;
