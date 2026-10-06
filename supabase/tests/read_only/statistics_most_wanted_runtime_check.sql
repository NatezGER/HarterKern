BEGIN;

-- Most Wanted route snapshot. Existing views and migrations remain untouched.
-- Canonical qualification/order: 017; seasonal membership: 026.
create or replace function public.get_most_wanted_snapshot(p_season_year integer default null)
returns jsonb
language sql stable security invoker
set search_path = public
as $$
with numbered_attempts as (
  -- Number BEFORE time/AK/player qualification, exactly as event_attempt_details.
  -- Event-less attempts have no event_attempt_details row and therefore order 0.
  select a.id, a.event_id, a.player_id, a.guest_id, a.time_hundredths,
    a.submitted_at, a.is_dnf, a.is_ak, e.name event_name,
    case when e.id is null then 0 else
      row_number() over (
        partition by a.event_id, a.player_id, a.guest_id
        order by a.submitted_at, a.id
      )::integer
    end source_order
  from public.attempts a
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null
    and (a.event_id is null or e.deleted_at is null)
    and (p_season_year is null or (
      e.id is not null and e.deleted_at is null
      and extract(year from e.start_date)::integer = p_season_year
      and p_season_year >= 2026
    ))
), qualified as materialized (
  select a.id source_id, a.player_id, a.guest_id,
    coalesce(p.display_name, g.display_name) display_name,
    p.avatar_url, p.avatar_path, a.guest_id is not null is_guest,
    a.event_id, a.time_hundredths, a.submitted_at occurred_at,
    (a.submitted_at at time zone 'Europe/Berlin')::date occurred_date,
    'attempt'::text source_type, 2::integer source_priority,
    a.source_order, true has_exact_time,
    coalesce(nullif(trim(a.event_name), ''), 'Historischer Einzelversuch') source_label
  from numbered_attempts a
  left join public.players p on p.id = a.player_id
  left join public.event_guests g on g.id = a.guest_id
  where not a.is_dnf and a.time_hundredths is not null and not a.is_ak
    and ((a.player_id is not null and not p.is_ak and not p.is_archived)
      or (a.guest_id is not null and g.id is not null))
  union all
  select h.id, h.player_id, null::uuid, h.display_name,
    p.avatar_url, p.avatar_path, h.is_guest, null::uuid, h.time_hundredths,
    h.attempt_date::timestamp at time zone 'Europe/Berlin', h.attempt_date,
    'historical_attempt'::text, 1::integer, h.sort_order, false,
    coalesce(h.historical_label, 'Historischer Einzelversuch')
  from public.historical_attempts h
  left join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.out_of_competition
    and (h.is_guest or (h.player_id is not null and not p.is_ak and not p.is_archived))
    and (p_season_year is null or (
      extract(year from h.attempt_date)::integer = p_season_year
      and p_season_year >= 2026
    ))
), ranked as materialized (
  select q.*, mod(time_hundredths, 100)::integer ending,
    row_number() over (
      partition by mod(time_hundredths, 100)
      order by occurred_at, source_priority, source_order, source_id
    ) hit_sequence
  from qualified q
), counts as (
  select ending, count(*)::integer hit_count,
    count(distinct case when is_guest then concat('guest:', display_name)
      else concat('player:', player_id) end)::integer participant_count,
    -- Only the existing "Weitere Treffer" presentation, not the qualified raw list.
    coalesce(jsonb_agg(jsonb_build_object(
      'source_id', source_id, 'player_id', player_id, 'guest_id', guest_id,
      'display_name', display_name, 'avatar_url', avatar_url, 'avatar_path', avatar_path,
      'is_guest', is_guest, 'time_hundredths', time_hundredths,
      'source_type', source_type, 'source_order', source_order
    ) order by hit_sequence) filter (where hit_sequence > 1), '[]'::jsonb) additional_hits
  from ranked group by ending
), endings as materialized (
  select e.ending, lpad(e.ending::text, 2, '0') ending_label,
    f.source_id first_source_id, f.player_id first_player_id,
    f.guest_id first_guest_id, f.display_name first_display_name,
    f.avatar_url first_avatar_url, f.avatar_path first_avatar_path,
    coalesce(f.is_guest, false) first_is_guest,
    f.time_hundredths first_time_hundredths,
    f.occurred_at first_occurred_at, f.occurred_date first_occurred_date,
    coalesce(f.has_exact_time, false) first_has_exact_time,
    f.event_id first_event_id, f.source_type first_source_type,
    f.source_order first_source_order, f.source_label,
    coalesce(c.hit_count, 0)::integer hit_count,
    coalesce(c.participant_count, 0)::integer participant_count,
    f.source_id is not null achieved,
    coalesce(c.additional_hits, '[]'::jsonb) additional_hits
  from generate_series(0, 99) e(ending)
  left join ranked f on f.ending = e.ending and f.hit_sequence = 1
  left join counts c on c.ending = e.ending
), progress as (
  select count(*) filter (where achieved)::integer reached_count,
    100::integer total_count,
    -- Preserve the canonical stored value; the UI calculates reached / total.
    round(count(*) filter (where achieved) * 100.0, 1) progress_percent,
    array_agg(ending order by ending) filter (where not achieved) open_endings,
    (array_agg(ending order by hit_count desc, ending) filter (where achieved))[1]
      most_common_ending,
    max(hit_count)::integer most_common_hit_count,
    min(hit_count) filter (where achieved)::integer least_common_hit_count,
    array_agg(ending order by hit_count, ending) filter (
      where achieved and hit_count = (select min(hit_count) from endings where achieved)
    ) rarest_achieved_endings
  from endings
)
select jsonb_build_object(
  'endings', (select jsonb_agg(to_jsonb(e) order by ending) from endings e),
  'progress', (select to_jsonb(p) from progress p)
);
$$;

revoke all on function public.get_most_wanted_snapshot(integer) from public;
grant execute on function public.get_most_wanted_snapshot(integer) to anon, authenticated;

SET LOCAL ROLE authenticated;

-- Read Execution Time for All-Time.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT public.get_most_wanted_snapshot(NULL);

-- Highest existing supported season. Zero rows means no season: SKIP.
-- Execution Time includes this small source-year lookup.
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT public.get_most_wanted_snapshot(season_year)
FROM (
  SELECT max(season_year) season_year FROM (
    SELECT extract(year from start_date)::integer season_year
    FROM public.events WHERE deleted_at IS NULL
    UNION
    SELECT extract(year from attempt_date)::integer
    FROM public.historical_attempts WHERE deleted_at IS NULL
  ) years
  WHERE season_year BETWEEN 2026 AND greatest(2026, extract(year from current_date)::integer)
) latest
WHERE season_year IS NOT NULL;

ROLLBACK;
