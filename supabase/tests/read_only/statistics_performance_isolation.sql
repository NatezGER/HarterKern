-- READ ONLY after migration 062. No fixtures, no user-data writes.
-- Existing season chosen from canonical season statistics, never fabricated.
with scopes as (
  select 'all-time'::text scope, null::integer season
  union all
  select 'season', max(season_year) from public.season_global_statistics
), payloads as materialized (
  select scope, season,
    case when scope = 'season' and season is null then null
      else public.get_statistics_performance_dashboard(season) end payload
  from scopes
), checks as (
  select scope, season, payload,
    (select count(*) from jsonb_array_elements(payload->'metrics') m) metrics,
    (select count(distinct m->>'key') from jsonb_array_elements(payload->'metrics') m) keys,
    (select string_agg(m->>'key', ', ' order by m->>'key')
      from jsonb_array_elements(payload->'metrics') m
      where m->>'key' like 'badge-%' or m->>'key' like 'rivalry-%'
        or m->>'key' in ('bingo-fields','rare-hunter','most-wanted','nemesis','favorite-opponent')) forbidden,
    (select count(*) from jsonb_array_elements(payload->'metrics') m
      where jsonb_typeof(m->'rankings') is distinct from 'array'
        or jsonb_array_length(m->'rankings') > 10) malformed_arrays,
    (select count(*) from jsonb_array_elements(payload->'metrics') m,
      lateral jsonb_array_elements(m->'rankings') r
      where jsonb_typeof(r->'value') is distinct from 'number'
        or jsonb_typeof(r->'rank') is distinct from 'number'
        or nullif(r->>'playerId','') is null
        or (m->>'key' in ('sub5','sub4','sub3','sub25','sub2') and (r->>'count')::numeric <= 0)) malformed_rows
  from payloads
)
select scope, season,
  case when scope = 'season' and season is null then 'SKIP'
    when jsonb_typeof(payload) = 'object' and jsonb_typeof(payload->'metrics') = 'array'
      and metrics > 0 and metrics = keys and forbidden is null
      and malformed_arrays = 0 and malformed_rows = 0
      and jsonb_typeof(payload->'regularPlayers') = 'number'
      and jsonb_typeof(payload->'eventCount') = 'number'
      and payload->'rivalryPairs' = '[]'::jsonb then 'OK'
    else 'FAIL' end status,
  concat('metrics=', metrics, '; duplicate_keys=', metrics-keys,
    '; forbidden=', coalesce(forbidden,'none'), '; malformed_arrays=', malformed_arrays,
    '; malformed_rows=', malformed_rows) detail
from checks;

-- Exact metric parity, including sporting ranks, display order, denominators,
-- details and summaries. This intentionally calls the OLD expensive path once
-- per scope: a legacy timeout is not a timing measurement of the new RPC.
with scopes as (
  select 'all-time'::text scope, null::integer season
  union all
  select 'season', max(season_year) from public.season_global_statistics
), payloads as materialized (
  select scope, season,
    case when scope = 'season' and season is null then null
      else public.get_statistics_performance_dashboard(season) end fresh,
    case when scope = 'season' and season is null then null
      else public.get_unified_statistics_dashboard(season, null) end legacy
  from scopes
), compared as (
  select scope, season,
    (select jsonb_object_agg(m->>'key',m) from jsonb_array_elements(fresh->'metrics') m) fresh,
    (select jsonb_object_agg(m->>'key',m) from jsonb_array_elements(legacy->'metrics') m
      where m->>'key' in (
        'fastest','valid','average','dnf','sub5','sub4','sub3','sub25','sub2',
        'streak','smooth','common','event-max','lead-time','event-breaks','takeovers',
        'median','fastest-five','best-five-window','consistency','fastest-first',
        'fast-starter','late-bloomer','clutch','one-shot','near-repeat','matrix-glitch',
        'two-in-sixty-total','two-in-sixty-best','pb-jump','wr-reign','wr-improvements',
        'wr-jump','chaos-magnet')) legacy
  from payloads
)
select scope, season,
  case when scope = 'season' and season is null then 'SKIP'
    when fresh = legacy then 'OK' else 'FAIL' end status,
  coalesce((select string_agg(key, ', ' order by key)
    from (select jsonb_object_keys(fresh) key union select jsonb_object_keys(legacy)) keys
    where fresh->key is distinct from legacy->key), 'identical') differing_metric_keys
from compared;

-- Chart equivalence with the former Most-Wanted hit population. Includes
-- guests, keeps canonical attempt numbers and excludes historical-only rows.
with scopes as (
  select 'all-time'::text scope, null::integer season
  union all
  select 'season', max(season_year) from public.season_global_statistics
), official as (
  select 'all-time'::text scope, source_order, time_hundredths
  from public.qualified_official_times where source_type = 'attempt' and source_order > 0
  union all
  select 'season', source_order, time_hundredths
  from public.season_qualified_official_times
  where season_year = (select season from scopes where scope = 'season')
    and source_type = 'attempt' and source_order > 0
), points as (
  select scope, source_order, count(*) samples, round(avg(time_hundredths)) average_time
  from official group by scope, source_order
), expected as (
  select scope, jsonb_agg(jsonb_build_object(
    'attemptNumber',source_order,'samples',samples,'validCount',samples,
    'dnfCount',0,'averageHundredths',average_time) order by source_order) chart
  from points group by scope
)
select s.scope, s.season,
  case when s.scope = 'season' and s.season is null then 'SKIP'
    when public.get_statistics_performance_dashboard(s.season)->'attemptNumbers'
      = coalesce(e.chart,'[]'::jsonb) then 'OK' else 'FAIL' end chart_parity
from scopes s left join expected e using (scope);

-- Existing basic-stat counters remain exact, including empty-season fallback.
with expected as (
  select null::integer season, regular_players, event_count from public.global_statistics
  union all
  select season_year, regular_players, event_count from public.season_global_statistics
  where season_year = (select max(season_year) from public.season_global_statistics)
)
select season,
  case when (payload->>'regularPlayers')::numeric = regular_players
      and (payload->>'eventCount')::numeric = event_count
    then 'OK' else 'FAIL' end counter_parity
from expected cross join lateral (
  select public.get_statistics_performance_dashboard(season) payload
) result;

