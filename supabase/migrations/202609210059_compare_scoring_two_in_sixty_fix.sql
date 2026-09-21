-- PR #61 follow-up: replace the productive best-five interpretation of
-- 2 in 60 with each player's fastest qualifying adjacent pair.

create or replace function public.get_statistics_sequence_metrics(
  p_player_ids uuid[] default null,
  p_season_year integer default null,
  p_event_id uuid default null
) returns table (
  metric_key text, player_id uuid, value numeric,
  hit_count numeric, sample_count numeric, detail text
)
language sql stable security invoker set search_path = public as $$
with scoped_attempts as materialized (
  select a.id, a.player_id, a.event_id, a.submitted_at, a.time_hundredths,
    a.is_dnf
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
    and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and (p_player_ids is null or a.player_id = any(p_player_ids))
    and (p_event_id is null or (a.event_id = p_event_id and e.awards_trophies))
    and (p_event_id is not null or p_season_year is null
      or extract(year from e.start_date)::integer = p_season_year)
), ordered as (
  select a.*,
    row_number() over (
      partition by player_id, event_id order by submitted_at, id
    )::integer attempt_number,
    count(*) over (partition by player_id, event_id)::integer event_attempt_count,
    min(time_hundredths) filter (
      where not is_dnf and time_hundredths is not null
    ) over (partition by player_id, event_id)::numeric final_event_pb,
    min(time_hundredths) filter (
      where not is_dnf and time_hundredths is not null
    ) over (
      partition by player_id, event_id order by submitted_at, id
      rows between unbounded preceding and 1 preceding
    )::numeric prior_player_pb,
    lag(time_hundredths) over (
      partition by player_id, event_id order by submitted_at, id
    ) previous_time,
    lag(is_dnf or time_hundredths is null) over (
      partition by player_id, event_id order by submitted_at, id
    ) previous_invalid
  from scoped_attempts a
), event_features as (
  select player_id, event_id, max(event_attempt_count)::numeric attempt_count,
    max(time_hundredths) filter (
      where attempt_number = 1 and not is_dnf and time_hundredths is not null
    )::numeric first_time,
    max(final_event_pb)::numeric final_pb,
    min(attempt_number) filter (
      where not is_dnf and time_hundredths = final_event_pb
    )::numeric first_final_pb_number,
    bool_or(
      attempt_number > event_attempt_count - 2 and not is_dnf
      and time_hundredths = final_event_pb and prior_player_pb is not null
      and time_hundredths < prior_player_pb
    ) clutch
  from ordered
  group by player_id, event_id
), player_features as (
  select player_id,
    percentile_cont(0.5) within group (order by first_time - final_pb)
      filter (where attempt_count >= 3 and first_time is not null)::numeric fast_starter,
    count(*) filter (
      where attempt_count >= 3 and first_time is not null
    )::numeric fast_starter_events,
    count(*) filter (
      where attempt_count >= 4 and first_final_pb_number > attempt_count / 2.0
    )::numeric late_events,
    count(*) filter (where attempt_count >= 4)::numeric late_total,
    count(*) filter (where attempt_count >= 3 and clutch)::numeric clutch_events,
    count(*) filter (where attempt_count >= 3)::numeric clutch_total,
    count(*) filter (
      where attempt_count >= 3 and first_time is not null and first_time = final_pb
    )::numeric one_shot_events,
    count(*) filter (
      where attempt_count >= 3 and first_time is not null
    )::numeric one_shot_total
  from event_features
  group by player_id
), glitches as (
  select player_id,
    count(*) filter (
      where not is_dnf and time_hundredths is not null
        and previous_time is not null and not coalesce(previous_invalid, true)
        and time_hundredths = previous_time
    )::numeric hits,
    count(*) filter (
      where not is_dnf and time_hundredths is not null
        and previous_time is not null and not coalesce(previous_invalid, true)
    )::numeric pairs
  from ordered
  group by player_id
), two_in_sixty_ordered as (
  select player_id, event_id, id, submitted_at, time_hundredths,
    lag(id) over attempt_order previous_id,
    lag(submitted_at) over attempt_order previous_submitted_at,
    lag(time_hundredths) over attempt_order previous_time
  from scoped_attempts
  where not is_dnf and time_hundredths is not null
  window attempt_order as (
    partition by player_id, event_id order by submitted_at, id
  )
), two_in_sixty_pairs as (
  select player_id, id second_id, submitted_at,
    (previous_time + time_hundredths)::numeric pair_time
  from two_in_sixty_ordered
  where previous_id is not null
    and submitted_at - previous_submitted_at <= interval '180 seconds'
), two_in_sixty_player as (
  select player_id, count(*)::numeric run_count,
    min(pair_time)::numeric best_pair_time
  from two_in_sixty_pairs
  group by player_id
)
select 'fast-starter'::text, player_id::uuid, fast_starter::numeric,
  null::numeric, fast_starter_events::numeric, null::text
from player_features where fast_starter_events >= 1
union all
select 'late-bloomer'::text, player_id::uuid,
  (late_events / nullif(late_total, 0) * 100)::numeric,
  late_events::numeric, late_total::numeric, null::text
from player_features where late_total >= 1
union all
select 'clutch'::text, player_id::uuid,
  (clutch_events / nullif(clutch_total, 0) * 100)::numeric,
  clutch_events::numeric, clutch_total::numeric, null::text
from player_features where clutch_total >= 1
union all
select 'one-shot'::text, player_id::uuid,
  (one_shot_events / nullif(one_shot_total, 0) * 100)::numeric,
  one_shot_events::numeric, one_shot_total::numeric, null::text
from player_features where one_shot_total >= 1
union all
select 'matrix-glitch'::text, player_id::uuid, hits::numeric,
  hits::numeric, pairs::numeric, null::text
from glitches where pairs > 0
union all
select 'two-in-sixty-total'::text, player_id::uuid, run_count::numeric,
  null::numeric, run_count::numeric, null::text
from two_in_sixty_player where run_count > 0
union all
select 'two-in-sixty-best'::text, player_id::uuid, best_pair_time::numeric,
  null::numeric, run_count::numeric, null::text
from two_in_sixty_player where run_count > 0;
$$;

create or replace function public.get_advanced_statistics_dashboard(
  p_season_year integer default null,
  p_event_id uuid default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with metrics as materialized (
  select *
  from public.get_advanced_statistic_player_metrics(null, p_season_year, p_event_id)
  where metric_key in (
    'median', 'fastest-five', 'best-five-window', 'consistency',
    'fastest-first', 'fast-starter', 'late-bloomer', 'clutch', 'one-shot',
    'near-repeat', 'matrix-glitch', 'two-in-sixty-total',
    'two-in-sixty-best', 'bingo-fields', 'rare-hunter', 'pb-jump',
    'badge-total', 'badge-bronze', 'badge-silver', 'badge-gold',
    'badge-diamond', 'badge-positive', 'badge-consolation', 'wr-reign',
    'wr-improvements', 'wr-jump', 'event-breaks', 'takeovers', 'chaos-magnet'
  )
    and (p_event_id is null or (
      metric_key not like 'badge-%'
      and metric_key not like 'wr-%'
      and metric_key not like 'rivalry-%'
      and metric_key not in (
        'pb-jump', 'rare-hunter', 'nemesis', 'favorite-opponent'
      )
    ))
), ranked as (
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
  from metrics m
  join public.players p on p.id = m.player_id
), summary as (
  select metric_key,
    (case when metric_key = 'two-in-sixty-total' then sum(value)
      else round(avg(value), 2) end)::numeric value,
    sum(hit_count)::numeric hit_count, sum(sample_count)::numeric sample_count
  from metrics
  group by metric_key
)
select jsonb_build_object(
  'metrics', coalesce((select jsonb_agg(jsonb_build_object(
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
    from ranked r
    where r.metric_key = s.metric_key and r.display_position <= 10), '[]'::jsonb)
  ) order by s.metric_key) from summary s), '[]'::jsonb)
);
$$;

