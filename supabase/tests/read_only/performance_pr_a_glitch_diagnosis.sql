-- Read-only investigation; no mutations, refresh RPCs or award recalculation.
begin read only;

-- Confirm the actual matching events before interpreting any result.
select id,name,start_date,status,deleted_at from public.events
where name ilike '%Komm ran Paul%' or name ilike '%erster Bundesliga-Spieltag%';

-- Performance: own consecutive official attempts; DNF stays in the sequence.
with ordered as (
 select a.*, e.name event_name,
   lag(a.attempt_id) over w previous_id,
   lag(a.time_hundredths) over w previous_time,
   lag(a.is_dnf) over w previous_dnf
 from public.official_event_attempts a join public.events e on e.id=a.event_id
 where e.name ilike '%Komm ran Paul%' or e.name ilike '%erster Bundesliga-Spieltag%'
 window w as (partition by a.player_id,a.event_id order by a.submitted_at,a.attempt_id)
)
select *, not is_dnf and not coalesce(previous_dnf,true)
 and time_hundredths is not null and time_hundredths=previous_time personal_performance_glitch
from ordered order by event_id,player_id,submitted_at,attempt_id;

-- Global badge evidence uses consecutive VALID regular attempts across players.
with ordered as (
 select a.*, e.name event_name,
   lag(a.player_id) over w previous_player_id,
   lag(a.attempt_id) over w previous_id,
   lag(a.time_hundredths) over w previous_time
 from public.official_event_attempts a join public.events e on e.id=a.event_id
 where (e.name ilike '%Komm ran Paul%' or e.name ilike '%erster Bundesliga-Spieltag%')
   and a.is_valid_time
 window w as (partition by a.event_id order by a.submitted_at,a.attempt_id)
)
select * from ordered where time_hundredths=previous_time
order by event_id,submitted_at,attempt_id;

-- Persisted evidence requires a role with existing read permission on this table.
-- Do not grant permissions or invoke refresh functions to run this diagnostic.
-- The personal badge helper is read-only too, but requires existing execute rights.
-- Unlike Performance, its canonical sequence may include historical/event-boundary pairs.
select a.attempt_id, a.player_id, e.name,
 public.matrix_glitch_personal_match(a.attempt_id) personal_badge_match
from public.official_event_attempts a join public.events e on e.id=a.event_id
where e.name ilike '%Komm ran Paul%' or e.name ilike '%erster Bundesliga-Spieltag%';

select evidence.* from public.matrix_glitch_event_evidence evidence
join public.events e on e.id=evidence.event_id
where e.name ilike '%Komm ran Paul%' or e.name ilike '%erster Bundesliga-Spieltag%';
rollback;
