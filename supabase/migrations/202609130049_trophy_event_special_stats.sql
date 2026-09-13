-- Trophy-event special statistics are derived on read. Event lifecycle writes
-- intentionally remain untouched after the 2026-09-13 latency hotfixes.

create or replace function public.get_trophy_event_special_stats(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with trophy_event as (
  select e.id, coalesce(nullif(trim(e.name), ''), 'Spieleabend') name
  from public.events e
  where e.id = p_event_id
    and e.deleted_at is null
    and e.awards_trophies
), visible_event_attempts as (
  select
    a.id source_id,
    a.player_id,
    a.guest_id,
    coalesce(p.display_name, g.display_name) display_name,
    p.avatar_url,
    p.avatar_path,
    a.guest_id is not null is_guest,
    a.time_hundredths,
    a.is_dnf,
    a.is_ak or coalesce(p.is_ak, false) is_ak,
    a.submitted_at occurred_at,
    (a.submitted_at at time zone 'Europe/Berlin')::date occurred_date,
    row_number() over (
      partition by a.event_id, a.player_id, a.guest_id
      order by a.submitted_at, a.id
    )::integer source_order
  from trophy_event event
  join public.attempts a on a.event_id = event.id
  left join public.players p on p.id = a.player_id
  left join public.event_guests g on g.id = a.guest_id and g.event_id = event.id
  where a.status = 'approved'
    and a.deleted_at is null
), qualified as (
  select
    visible.*,
    mod(visible.time_hundredths, 100)::integer ending,
    case when visible.is_guest then concat('guest:', visible.guest_id)
      else concat('player:', visible.player_id) end participant_key
  from visible_event_attempts visible
  left join public.players p on p.id = visible.player_id
  left join public.event_guests g on g.id = visible.guest_id
  where not visible.is_dnf
    and visible.time_hundredths is not null
    and not visible.is_ak
    and (
      (visible.player_id is not null and not p.is_ak and not p.is_archived)
      or (visible.guest_id is not null and g.id is not null)
    )
), ranked_hits as (
  select qualified.*,
    row_number() over (
      partition by ending
      order by occurred_at, source_order, source_id
    )::integer hit_sequence
  from qualified
), ending_counts as (
  select ending, count(*)::integer hit_count,
    count(distinct participant_key)::integer participant_count
  from qualified
  group by ending
), ending_hits as (
  select hit.ending, jsonb_agg(jsonb_build_object(
    'id', hit.source_id,
    'playerId', hit.player_id,
    'guestId', hit.guest_id,
    'playerName', hit.display_name,
    'avatarUrl', hit.avatar_url,
    'avatarPath', hit.avatar_path,
    'isGuest', hit.is_guest,
    'timeHundredths', hit.time_hundredths,
    'occurredAt', hit.occurred_at,
    'occurredDate', hit.occurred_date,
    'hasExactTime', true,
    'sourceType', 'attempt',
    'sourceOrder', hit.source_order
  ) order by hit.occurred_at, hit.source_order, hit.source_id) hits
  from ranked_hits hit
  group by hit.ending
), ending_rows as (
  select
    ending.value::integer ending,
    lpad(ending.value::text, 2, '0') label,
    first_hit.source_id,
    first_hit.player_id,
    first_hit.guest_id,
    first_hit.display_name,
    first_hit.avatar_url,
    first_hit.avatar_path,
    coalesce(first_hit.is_guest, false) is_guest,
    first_hit.time_hundredths,
    first_hit.occurred_at,
    first_hit.occurred_date,
    first_hit.source_order,
    coalesce(counts.hit_count, 0)::integer hit_count,
    coalesce(counts.participant_count, 0)::integer participant_count,
    first_hit.source_id is not null achieved,
    coalesce(hits.hits, '[]'::jsonb) hits
  from generate_series(0, 99) ending(value)
  left join ranked_hits first_hit
    on first_hit.ending = ending.value and first_hit.hit_sequence = 1
  left join ending_counts counts on counts.ending = ending.value
  left join ending_hits hits on hits.ending = ending.value
), first_hunters as (
  select participant_key, player_id, guest_id, display_name, avatar_url,
    avatar_path, is_guest, count(*)::integer ending_count
  from ranked_hits
  where hit_sequence = 1
  group by participant_key, player_id, guest_id, display_name, avatar_url,
    avatar_path, is_guest
), top_hunters as (
  select * from first_hunters
  order by ending_count desc, display_name, participant_key
  limit 5
), achieved_endings as (
  select ending from ending_counts
), bingo_lines as (
  select cells.line_key
  from public.bingo_line_cells cells
  join achieved_endings achieved on achieved.ending = cells.ending
  group by cells.line_key
  having count(*) = 10
), matching_time_participants as (
  select q.time_hundredths, q.participant_key,
    min(q.display_name) display_name
  from qualified q
  group by q.time_hundredths, q.participant_key
), matching_times as (
  select time_hundredths, count(*)::integer participant_count,
    jsonb_agg(display_name order by display_name, participant_key) participant_names
  from matching_time_participants
  group by time_hundredths
), best_matching_time as (
  select * from matching_times
  order by participant_count desc, time_hundredths
  limit 1
), common_ending as (
  select ending, hit_count
  from ending_counts
  order by hit_count desc, ending
  limit 1
), summary as (
  select
    (select count(*)::integer from qualified) valid_attempts,
    (select count(*)::integer from achieved_endings) distinct_endings,
    (select count(*)::integer from achieved_endings where mod(ending, 11) = 0)
      snap_endings,
    (select count(*)::integer from bingo_lines) bingo_lines
)
select case when event.id is null then null else jsonb_build_object(
  'eventId', event.id,
  'eventName', event.name,
  'endings', (
    select jsonb_agg(jsonb_build_object(
      'ending', row.ending,
      'label', row.label,
      'achieved', row.achieved,
      'hitCount', row.hit_count,
      'participantCount', row.participant_count,
      'playerId', row.player_id,
      'guestId', row.guest_id,
      'playerName', row.display_name,
      'avatarUrl', row.avatar_url,
      'avatarPath', row.avatar_path,
      'isGuest', row.is_guest,
      'timeHundredths', row.time_hundredths,
      'occurredAt', row.occurred_at,
      'occurredDate', row.occurred_date,
      'hasExactTime', row.achieved,
      'eventId', event.id,
      'sourceType', case when row.achieved then 'attempt' else null end,
      'sourceOrder', row.source_order,
      'sourceLabel', case when row.achieved then event.name else null end,
      'hits', row.hits
    ) order by row.ending)
    from ending_rows row
  ),
  'topHunters', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', hunter.participant_key,
      'playerId', hunter.player_id,
      'guestId', hunter.guest_id,
      'playerName', hunter.display_name,
      'avatarUrl', hunter.avatar_url,
      'avatarPath', hunter.avatar_path,
      'isGuest', hunter.is_guest,
      'endingCount', hunter.ending_count
    ) order by hunter.ending_count desc, hunter.display_name, hunter.participant_key)
    from top_hunters hunter
  ), '[]'::jsonb),
  'metrics', jsonb_build_object(
    'bingoLines', summary.bingo_lines,
    'distinctEndings', summary.distinct_endings,
    'snapEndings', summary.snap_endings,
    'matchingTimeParticipantCount', coalesce(matching.participant_count, 0),
    'matchingTimeHundredths', matching.time_hundredths,
    'matchingTimeParticipantNames', coalesce(matching.participant_names, '[]'::jsonb),
    'validAttempts', summary.valid_attempts,
    'mostCommonEnding', common.ending,
    'mostCommonEndingHits', coalesce(common.hit_count, 0)
  )
) end
from (select 1) anchor
left join trophy_event event on true
cross join summary
left join best_matching_time matching on true
left join common_ending common on true;
$$;

comment on function public.get_trophy_event_special_stats(uuid) is
  'One event-scoped read model for Trophy Most Wanted, canonical BINGO and milestones; never used by write triggers.';

grant execute on function public.get_trophy_event_special_stats(uuid)
  to anon, authenticated;
