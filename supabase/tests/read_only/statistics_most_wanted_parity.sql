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
