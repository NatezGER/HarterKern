-- Additive read-model correction; no attempt/award writes or trigger changes.

create or replace view public.global_statistics
with (security_invoker = true)
as
with event_attempts as (
  select a.*
  from public.attempts a
  join public.players p on p.id = a.player_id
  join public.events e on e.id = a.event_id and e.deleted_at is null
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
), official_times as (
  select time_hundredths from event_attempts where not is_dnf
  union all
  select h.time_hundredths
  from public.historical_attempts h join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
)
select
  (select count(*) from public.players where not is_ak and not is_archived)
    regular_players,
  (select count(*) from public.events where deleted_at is null) event_count,
  (select count(*) from event_attempts) approved_attempts,
  (select count(*) from event_attempts where not is_dnf) valid_attempts,
  (select count(*) from event_attempts where is_dnf) dnf_count,
  (select min(time_hundredths) from official_times) world_record_hundredths,
  (select round(avg(time_hundredths))::integer
    from event_attempts where not is_dnf) average_hundredths,
  (select count(*) from public.event_eligible_attempts where is_valid_time) community_valid_attempts,
  (select count(distinct g.normalized_name) from public.event_guests g
    join public.events e on e.id = g.event_id where e.deleted_at is null) guest_count,
  (select count(*) from public.events where deleted_at is null and status = 'closed') closed_event_count;

create or replace view public.season_global_statistics
with (security_invoker = true)
as
with event_counts as (
  select extract(year from start_date)::integer season_year,
    count(*)::integer event_count
  from public.events
  where deleted_at is null and extract(year from start_date)::integer >= 2026
  group by extract(year from start_date)::integer
), attempt_stats as (
  select extract(year from e.start_date)::integer season_year,
    count(distinct a.player_id)::integer regular_players,
    count(a.id)::integer approved_attempts,
    count(a.id) filter (where not a.is_dnf)::integer valid_attempts,
    count(a.id) filter (where a.is_dnf)::integer dnf_count,
    min(a.time_hundredths) filter (where not a.is_dnf) world_record_hundredths,
    round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
  group by extract(year from e.start_date)::integer
)
select ec.season_year,
  coalesce(ats.regular_players, 0) regular_players,
  ec.event_count,
  coalesce(ats.approved_attempts, 0) approved_attempts,
  coalesce(ats.valid_attempts, 0) valid_attempts,
  coalesce(ats.dnf_count, 0) dnf_count,
  ats.world_record_hundredths,
  ats.average_hundredths,
  (select count(*) from public.event_eligible_attempts a
    join public.events e on e.id = a.event_id
    where a.is_valid_time and extract(year from e.start_date)::integer = ec.season_year) community_valid_attempts,
  (select count(distinct g.normalized_name) from public.event_guests g
    join public.events e on e.id = g.event_id
    where e.deleted_at is null and extract(year from e.start_date)::integer = ec.season_year) guest_count,
  (select count(*) from public.events e where e.deleted_at is null and e.status = 'closed'
    and extract(year from e.start_date)::integer = ec.season_year) closed_event_count
from event_counts ec
left join attempt_stats ats using (season_year);

-- Targeted event-performance corrections. Historical record metrics stay unchanged.
create or replace function public.get_statistics_performance_dashboard(p_season_year integer default null)
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
  select a.attempt_id id, a.player_id, a.event_id, a.submitted_at, a.time_hundredths,
    a.is_dnf, e.name event_name, e.start_date event_date
  from public.official_event_attempts a
  join public.events e on e.id = a.event_id
  where p_season_year is null
    or extract(year from e.start_date)::integer = p_season_year
), valid_event_attempts as (
  select * from event_attempts where not is_dnf and time_hundredths is not null
), threshold_player as (
  select player_id, count(*)::numeric threshold_count,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2
  from valid_event_attempts group by player_id
), player_times as (
  select player_id, min(time_hundredths)::numeric best_time,
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
  from valid_event_attempts
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
  select player_id, time_hundredths, count(*)::numeric hits
  from valid_event_attempts group by player_id, time_hundredths
), common_players as (
  select distinct on (player_id) player_id, time_hundredths, hits
  from exact_time_counts order by player_id, hits desc, time_hundredths
), player_keys as (
  select player_id from player_times union select player_id from event_player
), players as (
  select p.id player_id, p.display_name, p.avatar_url, p.avatar_path,
    t.best_time, q.threshold_count, q.sub5, q.sub4, q.sub3, q.sub25, q.sub2,
    t.smooth_count, e.attempt_count, e.dnf_count, e.valid_count, e.average_time,
    m.event_attempt_count, m.event_name, m.event_date, s.longest,
    c.hits common_hits, c.time_hundredths common_time
  from player_keys k join public.players p on p.id = k.player_id
  left join player_times t on t.player_id = k.player_id
  left join threshold_player q on q.player_id = k.player_id
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
  union all select 'sub5', player_id, sub5 / threshold_count * 100, sub5, threshold_count, null
    from players where sub5 > 0
  union all select 'sub4', player_id, sub4 / threshold_count * 100, sub4, threshold_count, null
    from players where sub4 > 0
  union all select 'sub3', player_id, sub3 / threshold_count * 100, sub3, threshold_count, null
    from players where sub3 > 0
  union all select 'sub25', player_id, sub25 / threshold_count * 100, sub25, threshold_count, null
    from players where sub25 > 0
  union all select 'sub2', player_id, sub2 / threshold_count * 100, sub2, threshold_count, null
    from players where sub2 > 0
  union all select 'streak', player_id, longest, null, null, null
    from players where longest > 0
  union all select 'smooth', player_id, smooth_count, null, null, null
    from players where smooth_count > 0
  union all select 'common', player_id, common_hits, null, null,
    concat(replace(to_char(common_time / 100.0, 'FM999990.00'), '.', ','), ' s')::text
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
        else m.value end desc, m.sample_count desc nulls last,
      p.display_name, m.player_id) display_position
  from metric_values m join players p using (player_id)
), totals as (
  select min(time_hundredths) filter (
      where (player_id is not null and not is_guest)
    )::numeric fastest,
    count(*) filter (where mod(time_hundredths, 100) = 0)::numeric smooth
  from official
), threshold_totals as (
  select count(*)::numeric threshold_count,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2
  from valid_event_attempts
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
    union all select 'valid', e.valid, null, null, null from event_totals e
    union all select 'average', e.average_time, null, null, null from event_totals e
    union all select 'dnf', round(e.dnf / nullif(e.attempts, 0) * 100, 1),
      e.dnf, e.attempts, null from baseline e
    union all select 'sub5', round(t.sub5 / nullif(t.threshold_count, 0) * 100, 1), t.sub5, t.threshold_count, null from threshold_totals t
    union all select 'sub4', round(t.sub4 / nullif(t.threshold_count, 0) * 100, 1), t.sub4, t.threshold_count, null from threshold_totals t
    union all select 'sub3', round(t.sub3 / nullif(t.threshold_count, 0) * 100, 1), t.sub3, t.threshold_count, null from threshold_totals t
    union all select 'sub25', round(t.sub25 / nullif(t.threshold_count, 0) * 100, 1), t.sub25, t.threshold_count, null from threshold_totals t
    union all select 'sub2', round(t.sub2 / nullif(t.threshold_count, 0) * 100, 1), t.sub2, t.threshold_count, null from threshold_totals t
    union all select 'streak', max(longest), null, null, null from players
    union all select 'smooth', t.smooth, null, null, null from totals t
    union all select 'common', max(c.hits), null, null,
      'Höchste persönliche Wiederholungszahl'::text from common_players c
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

-- Badge reads only: no eligibility, award writes or changes to existing migrations.
create or replace function public.get_statistics_badge_dashboard(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with bingo_scope as materialized (
  -- Same regular qualified population as 017/026; no attempt numbering needed.
  select a.player_id, mod(a.time_hundredths, 100)::integer ending
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and not p.is_ak and not p.is_archived and a.guest_id is null
    and (a.event_id is null or e.deleted_at is null)
    and (p_season_year is null or (e.id is not null
      and extract(year from e.start_date)::integer = p_season_year and p_season_year >= 2026))
  union all
  select h.player_id, mod(h.time_hundredths, 100)::integer
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.out_of_competition and not h.is_guest
    and not p.is_ak and not p.is_archived
    and (p_season_year is null or (extract(year from h.attempt_date)::integer = p_season_year
      and p_season_year >= 2026))
), ending_popularity as (
  select ending, count(distinct player_id) players from bingo_scope group by ending
), bingo_player as (
  select b.player_id, count(distinct b.ending)::numeric fields,
    count(distinct b.ending) filter (where p.players <= 3)::numeric rare_fields
  from bingo_scope b join ending_popularity p using (ending) group by b.player_id
), bingo_field_hits as (
  select player_id, ending, count(*)::integer hits from bingo_scope
  where p_season_year is not null group by player_id, ending
), season_lines as (
  -- Canonical grid from 036, with the same 1/2/3/5 per-field thresholds.
  select f.player_id, c.line_key, min(f.hits) minimum_hit_count
  from bingo_field_hits f join public.bingo_line_cells c using (ending)
  group by f.player_id, c.line_key having count(*) = 10
), bingo_line_counts as (
  -- Each actual line contributes its highest completed color's weight once.
  -- These are line qualifications, never the player's highest badge tier.
  select player_id, sum(case when qualifies_diamond then 5
    when qualifies_gold then 3 when qualifies_silver then 2
    when qualifies_bronze then 1 else 0 end)::numeric points
  from public.player_bingo_lines where p_season_year is null group by player_id
  union all
  select player_id, sum(case when minimum_hit_count >= 5 then 5
    when minimum_hit_count >= 3 then 3 when minimum_hit_count >= 2 then 2
    when minimum_hit_count >= 1 then 1 else 0 end)::numeric
  from season_lines group by player_id
), family_maximums as (
  select ledger.player_id, definitions.family_key,
    max(case definitions.tier when 'bronze' then 1 when 'silver' then 2
      when 'gold' then 3 when 'diamond' then 4 else 0 end)::numeric tier_rank
  from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
  where p_season_year is null and definitions.is_active
    and definitions.design_variant = 'standard' and definitions.family_key is not null
  group by ledger.player_id, definitions.family_key
), badge_ladder as (
  select player_id, count(*)::numeric family_total,
    count(*) filter (where tier_rank >= 1)::numeric bronze,
    count(*) filter (where tier_rank >= 2)::numeric silver,
    count(*) filter (where tier_rank >= 3)::numeric gold,
    count(*) filter (where tier_rank >= 4)::numeric diamond
  from family_maximums group by player_id
), badge_specials as (
  select ledger.player_id,
    count(distinct ledger.badge_key) filter (where definitions.design_variant = 'positive_special')::numeric positive,
    count(distinct ledger.badge_key) filter (where definitions.design_variant = 'consolation')::numeric consolation
  from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
  where p_season_year is null and definitions.is_active
    and definitions.design_variant in ('positive_special', 'consolation')
  group by ledger.player_id
), badge_population as (
  select player_id from badge_ladder union select player_id from badge_specials
), badge_counts as (
  select population.player_id, coalesce(ladder.family_total, 0)::numeric family_total,
    coalesce(ladder.bronze, 0)::numeric bronze, coalesce(ladder.silver, 0)::numeric silver,
    coalesce(ladder.gold, 0)::numeric gold, coalesce(ladder.diamond, 0)::numeric diamond,
    coalesce(specials.positive, 0)::numeric positive,
    coalesce(specials.consolation, 0)::numeric consolation
  from badge_population population
  left join badge_ladder ladder using (player_id)
  left join badge_specials specials using (player_id)

), metrics as materialized (
  select 'bingo-fields'::text metric_key, player_id, fields::numeric value,
    fields::numeric hit_count, 100::numeric sample_count, null::text detail
  from bingo_player where fields > 0
  union all select 'bingo-lines'::text, player_id, points::numeric,
    null::numeric, null::numeric, null::text
  from bingo_line_counts where points > 0
  union all select 'rare-hunter'::text, player_id, rare_fields::numeric,
    rare_fields::numeric, fields::numeric, null::text
  from bingo_player where rare_fields > 0
union all select 'badge-total'::text, player_id::uuid,
  (family_total + positive + consolation)::numeric,
  null::numeric, null::numeric, null::text
from badge_counts
where family_total + positive + consolation > 0
union all select 'badge-bronze'::text, player_id::uuid, bronze::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where bronze > 0
union all select 'badge-silver'::text, player_id::uuid, silver::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where silver > 0
union all select 'badge-gold'::text, player_id::uuid, gold::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where gold > 0
union all select 'badge-diamond'::text, player_id::uuid, diamond::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where diamond > 0
union all select 'badge-positive'::text, player_id::uuid, positive::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where positive > 0
union all select 'badge-consolation'::text, player_id::uuid, consolation::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where consolation > 0

), ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by metric_key order by value desc) placement,
    row_number() over (partition by metric_key order by value desc,
      sample_count desc nulls last, p.display_name, player_id) display_position
  from metrics m join public.players p on p.id = m.player_id
), summary as (
  select metric_key, round(avg(value), 2)::numeric value,
    sum(hit_count)::numeric hit_count, sum(sample_count)::numeric sample_count
  from metrics group by metric_key
)
select jsonb_build_object('metrics', coalesce((select jsonb_agg(jsonb_build_object(
  'key', s.metric_key, 'overallValue', s.value, 'overallCount', s.hit_count,
  'overallTotal', s.sample_count, 'overallDetail', null,
  'rankings', coalesce((select jsonb_agg(jsonb_build_object(
    'rank', r.placement, 'playerId', r.player_id, 'name', r.display_name,
    'avatarUrl', r.avatar_url, 'avatarPath', r.avatar_path,
    'value', r.value, 'count', r.hit_count, 'total', r.sample_count, 'detail', r.detail
  ) order by r.display_position) from ranked r
    where r.metric_key = s.metric_key and r.display_position <= 10), '[]'::jsonb)
) order by s.metric_key) from summary s), '[]'::jsonb));
$$;
revoke all on function public.get_statistics_badge_dashboard(integer) from public;
grant execute on function public.get_statistics_badge_dashboard(integer) to anon, authenticated;



