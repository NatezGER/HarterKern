BEGIN;

-- Performance route isolation. Additive read-only RPC; 056-061 stay immutable.
-- Preserve v56 baseline summaries/top-ten selection, v59 sequence/ranking rules
-- and v60 qualified pause-aware leadership. No badge/BINGO/pair/trophy path.
create function public.get_statistics_performance_dashboard(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with official as (
  select q.source_id, q.player_id, q.display_name, q.avatar_url, q.avatar_path,
    q.is_guest, q.time_hundredths, q.event_id, q.occurred_at, q.source_type, q.source_order
  from public.qualified_official_times q
  where p_season_year is null
  union all
  select q.source_id, q.player_id, q.display_name, q.avatar_url, q.avatar_path,
    q.is_guest, q.time_hundredths, q.event_id, q.occurred_at, q.source_type, q.source_order
  from public.season_qualified_official_times q
  where p_season_year is not null
    and q.season_year = p_season_year
), event_attempts as (
  select a.id, a.player_id, a.event_id, a.submitted_at, a.time_hundredths,
    a.is_dnf, e.name event_name, e.start_date event_date
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and (p_season_year is null
      or extract(year from e.start_date)::integer = p_season_year)
), player_times as (
  select player_id, min(time_hundredths)::numeric best_time,
    count(*)::numeric official_count,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2,
    count(*) filter (where mod(time_hundredths, 100) = 0)::numeric smooth_count
  from official where player_id is not null and not is_guest
  group by player_id
), event_player as (
  select player_id, count(*)::numeric attempt_count,
    count(*) filter (where is_dnf)::numeric dnf_count,
    count(*) filter (where not is_dnf and time_hundredths is not null)::numeric valid_count,
    round(avg(time_hundredths) filter (
      where not is_dnf and time_hundredths is not null
    ))::numeric average_time
  from event_attempts group by player_id
), event_max as (
  select distinct on (player_id) player_id, event_name, event_date,
    count(*)::numeric event_attempt_count
  from event_attempts
  group by player_id, event_id, event_name, event_date
  order by player_id, count(*) desc, event_date, event_name
), streak_grouped as (
  select a.*,
    sum(case when is_dnf or time_hundredths is null or time_hundredths >= 300
      then 1 else 0 end) over (
      partition by player_id, event_id order by submitted_at, id
      rows between unbounded preceding and current row
    ) streak_group
  from event_attempts a
), streak_runs as (
  select player_id, event_id, streak_group, count(*)::numeric length
  from streak_grouped
  where not is_dnf and time_hundredths is not null and time_hundredths < 300
  group by player_id, event_id, streak_group
), streaks as (
  select player_id, max(length) longest from streak_runs group by player_id
), exact_time_counts as (
  select time_hundredths, count(*)::numeric hits,
    count(distinct case when is_guest then concat('guest:', display_name)
      else concat('player:', player_id) end)::numeric participants,
    min(occurred_at) first_at
  from official group by time_hundredths
), common_time as (
  select * from exact_time_counts
  order by hits desc, first_at, time_hundredths limit 1
), common_players as (
  select o.player_id, count(*)::numeric hits
  from official o join common_time c using (time_hundredths)
  where o.player_id is not null and not o.is_guest group by o.player_id
), player_keys as (
  select player_id from player_times union select player_id from event_player
), players as (
  select p.id player_id, p.display_name, p.avatar_url, p.avatar_path,
    t.best_time, t.official_count, t.sub5, t.sub4, t.sub3, t.sub25, t.sub2,
    t.smooth_count, e.attempt_count, e.dnf_count, e.valid_count, e.average_time,
    m.event_attempt_count, m.event_name, m.event_date, s.longest,
    c.hits common_hits
  from player_keys k join public.players p on p.id = k.player_id
  left join player_times t on t.player_id = k.player_id
  left join event_player e on e.player_id = k.player_id
  left join event_max m on m.player_id = k.player_id
  left join streaks s on s.player_id = k.player_id
  left join common_players c on c.player_id = k.player_id
  where not p.is_ak and not p.is_archived
), metric_values as (
  select 'fastest'::text key, player_id, best_time value, null::numeric hit_count,
    null::numeric sample_count, null::text detail from players where best_time is not null
  union all select 'valid', player_id, valid_count, null, null, null
    from players where valid_count > 0
  union all select 'average', player_id, average_time, valid_count, null, null
    from players where valid_count >= 3 and average_time is not null
  union all select 'dnf', player_id,
    dnf_count / nullif(attempt_count, 0) * 100, dnf_count, attempt_count, null
    from players where attempt_count >= 5
  union all select 'sub5', player_id, sub5 / official_count * 100, sub5, official_count, null
    from players where official_count > 0
  union all select 'sub4', player_id, sub4 / official_count * 100, sub4, official_count, null
    from players where official_count > 0
  union all select 'sub3', player_id, sub3 / official_count * 100, sub3, official_count, null
    from players where official_count > 0
  union all select 'sub25', player_id, sub25 / official_count * 100, sub25, official_count, null
    from players where official_count > 0
  union all select 'sub2', player_id, sub2 / official_count * 100, sub2, official_count, null
    from players where official_count > 0
  union all select 'streak', player_id, longest, null, null, null
    from players where longest > 0
  union all select 'smooth', player_id, smooth_count, null, null, null
    from players where smooth_count > 0
  union all select 'common', player_id, common_hits, null, null, null
    from players where common_hits > 0
  union all select 'event-max', player_id, event_attempt_count, null, null,
    concat(event_name, ' · ', event_date)::text from players where event_attempt_count > 0
), ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by m.key order by
      case when m.key in ('fastest', 'average', 'dnf') then -m.value
        else m.value end desc) placement,
    row_number() over (partition by m.key order by
      case when m.key in ('fastest', 'average', 'dnf') then -m.value
        else m.value end desc, p.display_name, m.player_id) display_position
  from metric_values m join players p using (player_id)
), totals as (
  select count(*)::numeric official_count,
    min(time_hundredths) filter (
      where (player_id is not null and not is_guest)
    )::numeric fastest,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2,
    count(*) filter (where mod(time_hundredths, 100) = 0)::numeric smooth
  from official
), event_totals as (
  select count(*)::numeric attempts,
    count(*) filter (where is_dnf)::numeric dnf,
    count(*) filter (where not is_dnf and time_hundredths is not null)::numeric valid,
    round(avg(time_hundredths) filter (
      where not is_dnf and time_hundredths is not null
    ))::numeric average_time
  from event_attempts
), baseline as (
  select g.valid_attempts::numeric valid, g.dnf_count::numeric dnf,
    (g.valid_attempts + g.dnf_count)::numeric attempts,
    g.average_hundredths::numeric average_time,
    g.regular_players::numeric regular_players, g.event_count::numeric event_count
  from public.global_statistics g where p_season_year is null
  union all
  select s.valid_attempts::numeric, s.dnf_count::numeric,
    (s.valid_attempts + s.dnf_count)::numeric, s.average_hundredths::numeric,
    s.regular_players::numeric, s.event_count::numeric
  from public.season_global_statistics s where s.season_year = p_season_year
  union all
  select e.valid, e.dnf, e.attempts, e.average_time, 0::numeric, 0::numeric
  from event_totals e where p_season_year is not null
    and not exists (select 1 from public.season_global_statistics s where s.season_year = p_season_year)
), summary as (
  select key, value, hit_count, sample_count, detail from (
    select 'fastest'::text key, t.fastest value, null::numeric hit_count,
      null::numeric sample_count, null::text detail from totals t
    union all select 'valid', e.valid, null, null, null from baseline e
    union all select 'average', e.average_time, null, null, null from baseline e
    union all select 'dnf', round(e.dnf / nullif(e.attempts, 0) * 100, 1),
      e.dnf, e.attempts, null from baseline e
    union all select 'sub5', round(t.sub5 / nullif(t.official_count, 0) * 100, 1), t.sub5, t.official_count, null from totals t
    union all select 'sub4', round(t.sub4 / nullif(t.official_count, 0) * 100, 1), t.sub4, t.official_count, null from totals t
    union all select 'sub3', round(t.sub3 / nullif(t.official_count, 0) * 100, 1), t.sub3, t.official_count, null from totals t
    union all select 'sub25', round(t.sub25 / nullif(t.official_count, 0) * 100, 1), t.sub25, t.official_count, null from totals t
    union all select 'sub2', round(t.sub2 / nullif(t.official_count, 0) * 100, 1), t.sub2, t.official_count, null from totals t
    union all select 'streak', max(longest), null, null, null from players
    union all select 'smooth', t.smooth, null, null, null from totals t
    union all select 'common', c.time_hundredths, c.hits, c.participants,
      'Treffer / Teilnehmer'::text from common_time c
    union all select 'event-max', max(event_attempt_count), null, null, null from players
  ) metric_summary
), regular_official as (
  select * from official where player_id is not null and not is_guest
), ordered_attempts as (
  select a.*,
    row_number() over (partition by player_id, event_id order by submitted_at, id)::integer attempt_number,
    count(*) over (partition by player_id, event_id)::integer event_attempt_count,
    lag(time_hundredths) over (partition by player_id, event_id order by submitted_at, id) previous_time,
    lag(is_dnf or time_hundredths is null) over (partition by player_id, event_id order by submitted_at, id) previous_invalid
  from event_attempts a
), official_ranked as (
  select o.*, row_number() over (
    partition by player_id order by time_hundredths, occurred_at, source_id
  ) fastest_number
  from regular_official o
), official_player as (
  select player_id,
    count(*)::numeric valid_count, round(avg(time_hundredths))::numeric average_time,
    percentile_cont(0.5) within group (order by time_hundredths)::numeric median_time,
    stddev_pop(time_hundredths)::numeric deviation
  from regular_official group by player_id
), fastest_five as (
  select player_id, round(avg(time_hundredths))::numeric fastest_five
  from official_ranked where fastest_number <= 5 group by player_id having count(*) = 5
), five_windows as (
  select player_id, event_id, attempt_number,
    count(*) over window5 window_size,
    count(time_hundredths) filter (where not is_dnf) over window5 valid_size,
    avg(time_hundredths) filter (where not is_dnf) over window5 window_average
  from ordered_attempts
  window window5 as (partition by player_id, event_id order by attempt_number rows between 4 preceding and current row)
), best_windows as (
  select player_id, round(min(window_average))::numeric best_window
  from five_windows where window_size = 5 and valid_size = 5 group by player_id
), event_features as (
  select player_id, event_id, max(event_attempt_count)::numeric attempt_count,
    max(time_hundredths) filter (where attempt_number = 1 and not is_dnf and time_hundredths is not null)::numeric first_time
  from ordered_attempts group by player_id, event_id
), event_player_features as (
  select player_id,
    count(*) filter (where attempt_count >= 3 and first_time is not null)::numeric fast_starter_events,
    min(first_time) filter (where first_time is not null)::numeric fastest_first
  from event_features group by player_id
), near_repeat as (
  select player_id,
    count(*) filter (where not is_dnf and time_hundredths is not null
      and previous_time is not null and not coalesce(previous_invalid, true)
      and abs(time_hundredths - previous_time) <= 5)::numeric hits,
    count(*) filter (where not is_dnf and time_hundredths is not null
      and previous_time is not null and not coalesce(previous_invalid, true))::numeric pairs
  from ordered_attempts group by player_id
), pb_ordered as (
  select o.*, min(time_hundredths) over (partition by player_id order by occurred_at, source_id
    rows between unbounded preceding and 1 preceding) previous_best
  from regular_official o
), pb_records as (
  select *, lag(time_hundredths) over (partition by player_id order by occurred_at, source_id) previous_record
  from pb_ordered where previous_best is null or time_hundredths < previous_best
), pb_jumps as (
  select player_id, max(previous_record - time_hundredths)::numeric jump,
    count(*)::numeric record_count from pb_records group by player_id
), wr_source as (
  select h.player_id, h.duration_days::numeric duration_days,
    h.improvement_hundredths::numeric improvement
  from public.world_record_history h
  where p_season_year is null
  union all
  select h.player_id,
    greatest(0, least(coalesce(h.period_end_date, make_date(p_season_year + 1, 1, 1)),
      make_date(p_season_year + 1, 1, 1)) - h.achieved_date)::numeric,
    h.improvement_hundredths::numeric
  from public.season_world_record_history h
  where p_season_year is not null and h.season_year = p_season_year
), wr_player as (
  select player_id, max(duration_days)::numeric reign,
    count(*) filter (where improvement > 0)::numeric improvements,
    max(improvement) filter (where improvement > 0)::numeric jump
  from wr_source group by player_id
), advanced_values(metric_key, player_id, value, hit_count, sample_count, detail) as materialized (
select 'median'::text, player_id::uuid, median_time::numeric,
  null::numeric, valid_count::numeric, null::text
from official_player where valid_count >= 3
union all select 'fastest-five'::text, player_id::uuid, fastest_five::numeric,
  null::numeric, 5::numeric, null::text
from fastest_five
union all select 'best-five-window'::text, player_id::uuid, best_window::numeric,
  null::numeric, 5::numeric, null::text
from best_windows
union all select 'consistency'::text, player_id::uuid,
  round(deviation / nullif(average_time, 0) * 100, 3)::numeric,
  deviation::numeric, valid_count::numeric,
  concat('σ ', round(deviation, 1), ' · Ø ', average_time)::text
from official_player where valid_count >= 5
union all select 'fastest-first'::text, player_id::uuid, fastest_first::numeric,
  null::numeric, fast_starter_events::numeric, null::text
from event_player_features where fastest_first is not null
union all select 'near-repeat'::text, player_id::uuid,
  (hits / nullif(pairs, 0) * 100)::numeric,
  hits::numeric, pairs::numeric, null::text
from near_repeat where pairs >= 5
union all select 'pb-jump'::text, player_id::uuid, jump::numeric,
  null::numeric, record_count::numeric, null::text
from pb_jumps
where record_count >= 2 and jump is not null
union all select 'wr-reign'::text, player_id::uuid, reign::numeric,
  null::numeric, null::numeric, null::text
from wr_player where reign > 0
union all select 'wr-improvements'::text, player_id::uuid, improvements::numeric,
  null::numeric, null::numeric, null::text
from wr_player where improvements > 0
union all select 'wr-jump'::text, player_id::uuid, jump::numeric,
  null::numeric, null::numeric, null::text
from wr_player where jump > 0
union all select * from public.get_statistics_sequence_metrics(null, p_season_year, null)
union all select * from public.get_qualified_leadership_metrics(null, p_season_year, null)
), advanced_ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by metric_key order by
      case when metric_key in (
        'median', 'fastest-five', 'best-five-window', 'consistency',
        'fastest-first', 'fast-starter', 'two-in-sixty-best'
      ) then -value else value end desc) placement,
    row_number() over (partition by metric_key order by
      case when metric_key in (
        'median', 'fastest-five', 'best-five-window', 'consistency',
        'fastest-first', 'fast-starter', 'two-in-sixty-best'
      ) then -value else value end desc,
      sample_count desc nulls last, p.display_name, player_id) display_position
  from advanced_values m
  join public.players p on p.id = m.player_id
), advanced_summary as (
  select metric_key,
    (case when metric_key = 'two-in-sixty-total' then sum(value)
      else round(avg(value), 2) end)::numeric value,
    sum(hit_count)::numeric hit_count, sum(sample_count)::numeric sample_count
  from advanced_values
  group by metric_key
), canonical_lead_values as materialized (
  select segments.player_id,
    sum(segments.duration_seconds)::numeric value
  from public.event_lead_segments_all segments
  join public.events events on events.id = segments.event_id
  where events.status = 'closed'
    and (p_season_year is null
      or segments.season_year = p_season_year)
  group by segments.player_id
  having sum(segments.duration_seconds) > 0
), canonical_lead_ranked as (
  select values.player_id, values.value,
    players.display_name, players.avatar_url, players.avatar_path,
    rank() over (order by values.value desc) placement,
    row_number() over (order by values.value desc,
      players.display_name, values.player_id) display_position
  from canonical_lead_values values
  join public.players players on players.id = values.player_id
), canonical_lead_metric as (
  select case when exists(select 1 from canonical_lead_values)
    then jsonb_build_array(jsonb_build_object(
      'key', 'lead-time',
      'overallValue', (select sum(value) from canonical_lead_values),
      'overallCount', null,
      'overallTotal', null,
      'overallDetail', null,
      'rankings', coalesce((select jsonb_agg(jsonb_build_object(
        'rank', placement, 'playerId', player_id, 'name', display_name,
        'avatarUrl', avatar_url, 'avatarPath', avatar_path,
        'value', value, 'count', null, 'total', null, 'detail', null
      ) order by display_position)
      from canonical_lead_ranked where display_position <= 10), '[]'::jsonb)
    )) else '[]'::jsonb end payload
)
select jsonb_build_object(
  'metrics', coalesce((select jsonb_agg(jsonb_build_object(
      'key', s.key, 'overallValue', s.value,
      'overallCount', s.hit_count, 'overallTotal', s.sample_count,
      'overallDetail', s.detail,
      'rankings', coalesce((select jsonb_agg(jsonb_build_object(
        'rank', r.placement, 'playerId', r.player_id,
        'name', r.display_name, 'avatarUrl', r.avatar_url,
        'avatarPath', r.avatar_path, 'value', r.value,
        'count', r.hit_count, 'total', r.sample_count, 'detail', r.detail
      ) order by
        case when r.key in ('fastest','average','dnf') then -r.value else r.value end desc,
        r.sample_count desc nulls last, r.display_name, r.player_id)
      from ranked r where r.key = s.key and r.display_position <= 10
        and (r.key not in ('sub5','sub4','sub3','sub25','sub2') or r.hit_count > 0)), '[]'::jsonb)
    ) order by s.key) from summary s), '[]'::jsonb)
    || coalesce((select jsonb_agg(jsonb_build_object(
    'key', s.metric_key, 'overallValue', s.value,
    'overallCount', s.hit_count, 'overallTotal', s.sample_count,
    'overallDetail', null,
    'rankings', coalesce((select jsonb_agg(jsonb_build_object(
      'rank', r.placement, 'playerId', r.player_id, 'name', r.display_name,
      'avatarUrl', r.avatar_url, 'avatarPath', r.avatar_path,
      'value', r.value, 'count', r.hit_count, 'total', r.sample_count,
      'detail', case when r.metric_key = 'consistency'
        then concat('Streuung ', to_char(r.hit_count / 100, 'FM999990D00'),
          ' s') else r.detail end
    ) order by r.display_position)
    from advanced_ranked r
    where r.metric_key = s.metric_key and r.display_position <= 10), '[]'::jsonb)
  ) order by s.metric_key) from advanced_summary s), '[]'::jsonb)
    || (select payload from canonical_lead_metric),
  'rivalryPairs', '[]'::jsonb,
  'regularPlayers', (select regular_players from baseline),
  'eventCount', (select event_count from baseline),
  'players', coalesce((select jsonb_agg(jsonb_build_object(
    'id', player_id, 'name', display_name, 'avatarUrl', avatar_url, 'avatarPath', avatar_path
  ) order by display_name, player_id) from players), '[]'::jsonb),
  -- Same qualified hits/attempt numbering (including guests) as the old chart;
  -- no endings grid, progress or first-hit calculation is needed here.
  'attemptNumbers', coalesce((select jsonb_agg(jsonb_build_object(
    'attemptNumber', attempt_number, 'samples', samples, 'validCount', samples,
    'dnfCount', 0, 'averageHundredths', average_time
  ) order by attempt_number) from (
    select source_order attempt_number, count(*) samples,
      round(avg(time_hundredths)) average_time
    from official where source_type = 'attempt' and source_order > 0
    group by source_order
  ) points), '[]'::jsonb)
);
$$;
revoke all on function public.get_statistics_performance_dashboard(integer) from public;
grant execute on function public.get_statistics_performance_dashboard(integer) to anon, authenticated;

-- Same read permissions as the logged-in frontend; no JWT impersonation.
set local role authenticated;
-- Isolated NEW path only, before the intentionally expensive legacy comparison.
explain (analyze, buffers, timing off)
select public.get_statistics_performance_dashboard(null);
explain (analyze, buffers, timing off)
select public.get_statistics_performance_dashboard(season_year)
from (select max(season_year) season_year from public.season_global_statistics) chosen
where season_year is not null;

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

ROLLBACK;

