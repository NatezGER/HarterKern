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

-- Existing-data parity only. No fixtures or data writes.
with latest as (
  select max(season_year) season_year from (
    select extract(year from start_date)::integer season_year from public.events
    where deleted_at is null
    union
    select extract(year from attempt_date)::integer from public.historical_attempts
    where deleted_at is null
  ) years where season_year between 2026 and greatest(2026, extract(year from current_date)::integer)
), scopes as (
  select 'all-time'::text scope, null::integer season_year
  union all select 'season', season_year from latest where season_year is not null
), snapshots as materialized (
  select s.*, public.get_most_wanted_snapshot(season_year) payload from scopes s
), old_endings as materialized (
  select 'all-time'::text scope, to_jsonb(e) row from public.most_wanted_endings e
  union all
  select 'season', to_jsonb(e) - 'season_year'
  from public.season_most_wanted_endings e join latest l using (season_year)
), old_progress as (
  select 'all-time'::text scope, to_jsonb(p) row from public.most_wanted_progress p
  union all
  select 'season', to_jsonb(p) - 'season_year'
  from public.season_most_wanted_progress p join latest l using (season_year)
), old_hits as materialized (
  select 'all-time'::text scope, q.* from public.qualified_official_times q
  union all
  select 'season', q.source_id, q.player_id, q.guest_id, q.display_name,
    q.avatar_url, q.avatar_path, q.is_guest, q.event_id, q.time_hundredths,
    q.occurred_at, q.occurred_date, q.source_type, q.source_priority,
    q.source_order, q.has_exact_time
  from public.season_qualified_official_times q join latest l using (season_year)
), ordered_hits as (
  select q.*, mod(time_hundredths, 100)::integer ending,
    row_number() over (partition by scope, mod(time_hundredths, 100)
      order by occurred_at, source_priority, source_order, source_id) hit_sequence
  from old_hits q
), expected_display as (
  select scope, ending,
    coalesce(jsonb_agg(jsonb_build_object(
      'source_id', source_id, 'player_id', player_id, 'guest_id', guest_id,
      'display_name', display_name, 'avatar_url', avatar_url, 'avatar_path', avatar_path,
      'is_guest', is_guest, 'time_hundredths', time_hundredths,
      'source_type', source_type, 'source_order', source_order
    ) order by hit_sequence) filter (where hit_sequence > 1), '[]'::jsonb) hits,
    max(source_order) filter (where hit_sequence = 1) first_order
  from ordered_hits group by scope, ending
), new_endings as materialized (
  select s.scope, e.row from snapshots s
  cross join lateral jsonb_array_elements(s.payload->'endings') e(row)
), differences as (
  select coalesce(n.scope, o.scope) scope,
    coalesce(n.row->>'ending', o.row->>'ending') ending
  from new_endings n full join old_endings o
    on n.scope = o.scope and n.row->>'ending' = o.row->>'ending'
  where n.row - 'additional_hits' - 'first_source_order' is distinct from o.row
), display_differences as (
  select n.scope, n.row->>'ending' ending
  from new_endings n
  left join expected_display d on d.scope = n.scope and d.ending = (n.row->>'ending')::integer
  where n.row->'additional_hits' is distinct from coalesce(d.hits, '[]'::jsonb)
    or (n.row->>'first_source_order')::integer is distinct from d.first_order
), checks as (
  select s.scope, 'matrix_first_hit_counts_guests_history'::text check_name,
    not exists(select 1 from differences d where d.scope = s.scope) passed,
    coalesce((select string_agg(ending, ', ' order by ending)
      from differences d where d.scope = s.scope), 'all 100 canonical endings match') detail
  from snapshots s
  union all
  select s.scope, 'matrix_00_99',
    jsonb_array_length(s.payload->'endings') = 100
    and (select count(distinct (row->>'ending')::integer) from new_endings n
      where n.scope = s.scope and (row->>'ending')::integer between 0 and 99) = 100,
    '100 distinct endings including 00 and 99'
  from snapshots s
  union all
  select s.scope, 'progress_missing_common_rarest',
    (s.payload->'progress') - 'least_common_hit_count' is not distinct from p.row,
    'exact canonical progress object (including canonical percent representation)'
  from snapshots s left join old_progress p using (scope)
  union all
  select s.scope, 'display_hits_order_attempt_number',
    not exists(select 1 from display_differences d where d.scope = s.scope),
    coalesce((select string_agg(ending, ', ' order by ending)
      from display_differences d where d.scope = s.scope), 'all later hits and first source_order match')
  from snapshots s
  union all
  select s.scope, 'least_common_hit_count',
    (s.payload->'progress'->>'least_common_hit_count')::integer is not distinct from
      (select min((row->>'hit_count')::integer) from old_endings o
        where o.scope = s.scope and (row->>'achieved')::boolean),
    'minimum over achieved endings only'
  from snapshots s
  union all
  select s.scope, 'guest_case_parity',
    case when exists(select 1 from old_hits q where q.scope = s.scope and q.is_guest)
      then not exists(select 1 from differences d where d.scope = s.scope)
        and not exists(select 1 from display_differences d where d.scope = s.scope)
      else null::boolean end,
    concat('canonical guest rows=', (select count(*) from old_hits q
      where q.scope = s.scope and q.is_guest), '; no rows means SKIP')
  from snapshots s
  union all
  select s.scope, 'historical_case_parity',
    case when exists(select 1 from old_hits q where q.scope = s.scope and q.source_type = 'historical_attempt')
      then not exists(select 1 from differences d where d.scope = s.scope)
        and not exists(select 1 from display_differences d where d.scope = s.scope)
      else null::boolean end,
    concat('canonical historical rows=', (select count(*) from old_hits q
      where q.scope = s.scope and q.source_type = 'historical_attempt'), '; no rows means SKIP')
  from snapshots s
)
select scope, check_name,
  case when passed is null then 'SKIP' when passed then 'OK' else 'FAIL' end result, detail
from checks
union all
select 'season', 'available_season', 'SKIP', 'No existing supported season'
where (select season_year from latest) is null
order by scope, check_name;

ROLLBACK;
