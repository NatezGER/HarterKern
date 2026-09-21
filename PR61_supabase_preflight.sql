BEGIN;

-- Embedded verbatim from supabase/migrations/202609210058_statistics_performance_compare_polish.sql

-- PR #61: scope-first sequence metrics and qualified leadership statistics.
-- Migrations 056 and 057 remain immutable. The v57 functions are preserved
-- behind versioned names and their public signatures are composed here.

alter function public.get_advanced_statistic_player_metrics(uuid[], integer, uuid)
  rename to get_advanced_statistic_player_metrics_v57;

create function public.get_statistics_sequence_metrics(
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
), two_in_sixty_ranked as (
  select pairs.*,
    row_number() over (
      partition by player_id order by pair_time, submitted_at, second_id
    ) pair_position
  from two_in_sixty_pairs pairs
), two_in_sixty_player as (
  select player_id, count(*)::numeric run_count,
    round(avg(pair_time) filter (where pair_position <= 5), 2)::numeric best_five,
    count(*) filter (where pair_position <= 5)::numeric best_five_count
  from two_in_sixty_ranked
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
select 'two-in-sixty-best-five'::text, player_id::uuid, best_five::numeric,
  null::numeric, run_count::numeric, null::text
from two_in_sixty_player where run_count > 0;
$$;

revoke all on function public.get_statistics_sequence_metrics(uuid[], integer, uuid) from public;
grant execute on function public.get_statistics_sequence_metrics(uuid[], integer, uuid)
  to anon, authenticated;

create function public.get_qualified_leadership_metrics(
  p_player_ids uuid[] default null,
  p_season_year integer default null,
  p_event_id uuid default null
) returns table (
  metric_key text, player_id uuid, value numeric,
  hit_count numeric, sample_count numeric, detail text
)
language sql stable security invoker set search_path = public as $$
with eligible as materialized (
  select a.id, a.event_id, a.player_id, a.submitted_at, a.time_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
    and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and (p_event_id is null and e.status = 'closed'
      or p_event_id is not null and e.id = p_event_id and e.awards_trophies)
    and (p_event_id is not null or p_season_year is null
      or extract(year from e.start_date)::integer = p_season_year)
), first_valid as (
  select distinct on (event_id, player_id)
    event_id, player_id, submitted_at, id
  from eligible
  order by event_id, player_id, submitted_at, id
), qualification_ranked as (
  select first_valid.*,
    row_number() over (
      partition by event_id order by submitted_at, id, player_id
    ) qualification_rank
  from first_valid
), qualification as (
  select event_id, submitted_at qualification_at, id qualification_id
  from qualification_ranked
  where qualification_rank = 3
), contextual as (
  select a.*,
    min(a.time_hundredths) over (
      partition by a.event_id order by a.submitted_at, a.id
      rows between unbounded preceding and 1 preceding
    ) prior_best
  from eligible a
), changes as (
  select a.*,
    (select case when count(distinct prior.player_id) = 1
      then (array_agg(prior.player_id order by prior.submitted_at, prior.id))[1]
      end
    from eligible prior
    where prior.event_id = a.event_id
      and (prior.submitted_at, prior.id) < (a.submitted_at, a.id)
      and prior.time_hundredths = a.prior_best) previous_player_id
  from contextual a
  join qualification q on q.event_id = a.event_id
  where (a.submitted_at, a.id) > (q.qualification_at, q.qualification_id)
    and a.prior_best is not null and a.time_hundredths < a.prior_best
), break_counts as (
  select player_id, count(*)::numeric breaks
  from changes
  where p_player_ids is null or player_id = any(p_player_ids)
  group by player_id
), takeover_counts as (
  select player_id, count(*)::numeric takeovers
  from changes
  where previous_player_id is not null and previous_player_id <> player_id
    and (p_player_ids is null or player_id = any(p_player_ids))
  group by player_id
), chaos as (
  select participant player_id, count(*)::numeric changes
  from (
    select previous_player_id participant from changes
    where previous_player_id is not null and previous_player_id <> player_id
    union all
    select player_id from changes
    where previous_player_id is not null and previous_player_id <> player_id
  ) involved
  where p_player_ids is null or participant = any(p_player_ids)
  group by participant
)
select 'event-breaks'::text, player_id::uuid, breaks::numeric,
  null::numeric, null::numeric, null::text
from break_counts where breaks > 0
union all
select 'takeovers'::text, player_id::uuid, takeovers::numeric,
  null::numeric, null::numeric, null::text
from takeover_counts where takeovers > 0
union all
select 'chaos-magnet'::text, player_id::uuid, changes::numeric,
  null::numeric, null::numeric, null::text
from chaos where changes > 0;
$$;

revoke all on function public.get_qualified_leadership_metrics(uuid[], integer, uuid) from public;
grant execute on function public.get_qualified_leadership_metrics(uuid[], integer, uuid)
  to anon, authenticated;

create function public.get_advanced_statistic_player_metrics(
  p_player_ids uuid[] default null,
  p_season_year integer default null,
  p_event_id uuid default null
) returns table (
  metric_key text, player_id uuid, value numeric,
  hit_count numeric, sample_count numeric, detail text
)
language sql stable security invoker set search_path = public as $$
  select *
  from public.get_advanced_statistic_player_metrics_v57(
    p_player_ids, p_season_year, p_event_id
  )
  where metric_key not in (
    'event-participations', 'fast-starter', 'late-bloomer', 'clutch',
    'one-shot', 'chaos-magnet'
  )
  union all
  select * from public.get_statistics_sequence_metrics(
    p_player_ids, p_season_year, p_event_id
  )
  union all
  select * from public.get_qualified_leadership_metrics(
    p_player_ids, p_season_year, p_event_id
  );
$$;

revoke all on function public.get_advanced_statistic_player_metrics(uuid[], integer, uuid) from public;
grant execute on function public.get_advanced_statistic_player_metrics(uuid[], integer, uuid)
  to anon, authenticated;

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
    'two-in-sixty-best-five', 'bingo-fields', 'rare-hunter', 'pb-jump',
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
        'fastest-first', 'fast-starter', 'two-in-sixty-best-five'
      ) then -value else value end desc) placement,
    row_number() over (partition by metric_key order by
      case when metric_key in (
        'median', 'fastest-five', 'best-five-window', 'consistency',
        'fastest-first', 'fast-starter', 'two-in-sixty-best-five'
      ) then -value else value end desc,
      sample_count desc nulls last, p.display_name, player_id) display_position
  from metrics m
  join public.players p on p.id = m.player_id
  where m.metric_key <> 'two-in-sixty-best-five' or m.sample_count >= 5
), summary as (
  select metric_key,
    (case when metric_key = 'two-in-sixty-total' then sum(value)
      else round(avg(value), 2) end)::numeric value,
    sum(hit_count)::numeric hit_count, sum(sample_count)::numeric sample_count
  from metrics
  where metric_key <> 'two-in-sixty-best-five' or sample_count >= 5
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

create or replace function public.get_unified_statistics_dashboard(
  p_season_year integer default null,
  p_event_id uuid default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with baseline as materialized (
  select public.get_unified_statistics_dashboard_v56(p_season_year, p_event_id) payload
), advanced as materialized (
  select public.get_advanced_statistics_dashboard(p_season_year, p_event_id) payload
), normalized_baseline_metrics as (
  select jsonb_set(metric, '{rankings}', coalesce((select jsonb_agg(entry order by
      case when metric->>'key' in ('fastest', 'average', 'dnf')
        then (entry->>'value')::numeric end asc,
      case when metric->>'key' not in ('fastest', 'average', 'dnf')
        then (entry->>'value')::numeric end desc,
      (entry->>'total')::numeric desc nulls last,
      entry->>'name', entry->>'playerId')
    from jsonb_array_elements(metric->'rankings') entry
    where metric->>'key' not in ('sub5', 'sub4', 'sub3', 'sub25', 'sub2')
      or coalesce((entry->>'count')::numeric, 0) > 0), '[]'::jsonb)) metric
  from baseline,
    jsonb_array_elements(coalesce(payload->'metrics', '[]'::jsonb)) metric
  where metric->>'key' not in ('event-breaks', 'takeovers')
    and (p_event_id is null or (
      metric->>'key' not like 'badge-%'
      and metric->>'key' not like 'wr-%'
      and metric->>'key' not like 'rivalry-%'
      and metric->>'key' not in (
        'pb-jump', 'rare-hunter', 'nemesis', 'favorite-opponent'
      )
    ))
)
select case when baseline.payload is null then null else jsonb_build_object(
  'metrics', coalesce((select jsonb_agg(metric) from normalized_baseline_metrics), '[]'::jsonb)
    || coalesce(advanced.payload->'metrics', '[]'::jsonb),
  'rivalryPairs', case when p_event_id is not null
    then coalesce(baseline.payload->'rivalryPairs', '[]'::jsonb)
    else public.get_advanced_rivalry_pair_rankings(p_season_year) end
) end
from baseline cross join advanced;
$$;

alter function public.get_player_compare_metric_bundle(uuid[], integer)
  rename to get_player_compare_metric_bundle_v57;

create function public.get_player_compare_metric_bundle(
  p_player_ids uuid[],
  p_season_year integer default null
) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  normalized_player_ids uuid[];
begin
  select array_agg(player_id order by request_order)
  into normalized_player_ids
  from (
    select player_id, min(request_order)::bigint request_order
    from unnest(coalesce(p_player_ids, array[]::uuid[])) with ordinality
      requested_input(player_id, request_order)
    where player_id is not null
    group by player_id
    order by min(request_order)
    limit 2
  ) normalized;

  if coalesce(cardinality(normalized_player_ids), 0) = 0 then
    return jsonb_build_object('players', '[]'::jsonb, 'pair', '{}'::jsonb);
  end if;

  return (
    with baseline as materialized (
      select public.get_player_compare_metric_bundle_v57(
        normalized_player_ids, p_season_year
      ) payload
    ), compare_official as materialized (
      select q.source_id, q.player_id, q.time_hundredths, q.occurred_at
      from public.qualified_official_times q
      where p_season_year is null and q.player_id = any(normalized_player_ids)
        and q.player_id is not null and not q.is_guest
      union all
      select q.source_id, q.player_id, q.time_hundredths, q.occurred_at
      from public.season_qualified_official_times q
      where p_season_year is not null and q.season_year = p_season_year
        and q.player_id = any(normalized_player_ids)
        and q.player_id is not null and not q.is_guest
    ), compare_ranked as (
      select source.*,
        row_number() over (
          partition by player_id order by time_hundredths, occurred_at, source_id
        ) fastest_position
      from compare_official source
    ), fastest_three as (
      select 'fastest-three'::text metric_key, player_id::uuid,
        round(avg(time_hundredths))::numeric value,
        null::numeric hit_count, 3::numeric sample_count, null::text detail
      from compare_ranked
      where fastest_position <= 3
      group by player_id
      having count(*) = 3
    ), replacements as materialized (
      select * from public.get_statistics_sequence_metrics(
        normalized_player_ids, p_season_year, null
      )
      union all
      select * from public.get_qualified_leadership_metrics(
        normalized_player_ids, p_season_year, null
      )
      union all
      select * from fastest_three
    ), players as (
      select jsonb_build_object(
        'playerId', player->>'playerId',
        'metrics', coalesce((select jsonb_agg(metric order by metric->>'key')
          from jsonb_array_elements(coalesce(player->'metrics', '[]'::jsonb)) metric
          where metric->>'key' not in (
            'event-participations', 'fast-starter', 'late-bloomer', 'clutch',
            'one-shot', 'chaos-magnet', 'event-breaks', 'takeovers'
          )), '[]'::jsonb) || coalesce((select jsonb_agg(jsonb_build_object(
            'key', replacement.metric_key, 'value', replacement.value,
            'count', replacement.hit_count, 'total', replacement.sample_count,
            'detail', replacement.detail, 'qualified', true
          ) order by replacement.metric_key)
          from replacements replacement
          where replacement.player_id = (player->>'playerId')::uuid), '[]'::jsonb)
      ) player, position
      from baseline,
        jsonb_array_elements(coalesce(payload->'players', '[]'::jsonb))
          with ordinality source(player, position)
    )
    select jsonb_build_object(
      'players', coalesce((select jsonb_agg(player order by position)
        from players), '[]'::jsonb),
      'pair', coalesce(baseline.payload->'pair', '{}'::jsonb)
    )
    from baseline
  );
end;
$$;

revoke all on function public.get_player_compare_metric_bundle(uuid[], integer) from public;
grant execute on function public.get_player_compare_metric_bundle(uuid[], integer)
  to anon, authenticated;

revoke all on function public.get_advanced_statistics_dashboard(integer, uuid) from public;
grant execute on function public.get_advanced_statistics_dashboard(integer, uuid)
  to anon, authenticated;
revoke all on function public.get_unified_statistics_dashboard(integer, uuid) from public;
grant execute on function public.get_unified_statistics_dashboard(integer, uuid)
  to anon, authenticated;

-- Read-only runtime smoke tests. Every row is OK, SKIP or FAIL.
with parameters as (
  select
    (select extract(year from e.start_date)::integer
     from public.events e
     where e.deleted_at is null
     order by e.start_date desc, e.id
     limit 1) season_year,
    (select e.id from public.events e
     where e.deleted_at is null and e.awards_trophies and e.status = 'active'
     order by e.start_date desc, e.id limit 1) active_trophy_id,
    (select e.id from public.events e
     where e.deleted_at is null and e.awards_trophies and e.status = 'closed'
     order by e.start_date desc, e.id limit 1) closed_trophy_id,
    (select e.id from public.events e
     where e.deleted_at is null and not e.awards_trophies
     order by e.start_date desc, e.id limit 1) normal_event_id,
    coalesce((select array_agg(candidate.id order by candidate.display_name, candidate.id)
      from (select p.id, p.display_name
        from public.players p
        where not p.is_ak and not p.is_archived
        order by p.display_name, p.id limit 2) candidate), array[]::uuid[]) player_ids
), payloads as materialized (
  select parameters.*,
    public.get_unified_statistics_dashboard(null, null) all_time,
    case when season_year is null then null
      else public.get_unified_statistics_dashboard(season_year, null) end season,
    case when active_trophy_id is null then null
      else public.get_unified_statistics_dashboard(null, active_trophy_id) end active_trophy,
    case when closed_trophy_id is null then null
      else public.get_unified_statistics_dashboard(null, closed_trophy_id) end closed_trophy,
    case when normal_event_id is null then null
      else public.get_unified_statistics_dashboard(null, normal_event_id) end normal_event,
    public.get_player_compare_metric_bundle(player_ids, null) compare_bundle,
    public.get_player_compare_metric_bundle(array[]::uuid[], null) empty_compare,
    public.get_player_compare_metric_bundle(array[null::uuid], null) null_compare
  from parameters
), normalized as (
  select payloads.*,
    case when jsonb_typeof(all_time->'metrics') = 'array'
      then all_time->'metrics' else '[]'::jsonb end all_metrics,
    case when jsonb_typeof(season->'metrics') = 'array'
      then season->'metrics' else '[]'::jsonb end season_metrics,
    case when jsonb_typeof(active_trophy->'metrics') = 'array'
      then active_trophy->'metrics' else '[]'::jsonb end active_trophy_metrics,
    case when jsonb_typeof(closed_trophy->'metrics') = 'array'
      then closed_trophy->'metrics' else '[]'::jsonb end closed_trophy_metrics,
    case when jsonb_typeof(compare_bundle->'players') = 'array'
      then compare_bundle->'players' else '[]'::jsonb end compare_players
  from payloads
), checks as (
  select 1 ordinal, 'all_time_root_and_metrics'::text check_name,
    case when jsonb_typeof(all_time) = 'object'
      and jsonb_typeof(all_time->'metrics') = 'array' then 'OK' else 'FAIL' end status,
    concat('root=', coalesce(jsonb_typeof(all_time), 'null'),
      ', metrics=', coalesce(jsonb_typeof(all_time->'metrics'), 'null')) detail
  from payloads

  union all
  select 2, 'all_time_no_duplicate_metric_keys',
    case when not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      group by metric->>'key' having count(*) > 1) then 'OK' else 'FAIL' end,
    concat('duplicates=', (select count(*) from (select metric->>'key'
      from jsonb_array_elements(all_metrics) metric
      group by metric->>'key' having count(*) > 1) duplicate_keys))
  from normalized

  union all
  select 3, 'ranking_arrays_bounded_and_well_formed',
    case when not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where jsonb_typeof(metric->'rankings') is distinct from 'array'
        or case when jsonb_typeof(metric->'rankings') = 'array'
          then jsonb_array_length(metric->'rankings') > 10 else false end
        or exists (select 1 from jsonb_array_elements(case
          when jsonb_typeof(metric->'rankings') = 'array' then metric->'rankings'
          else '[]'::jsonb end) ranking
          where jsonb_typeof(ranking) is distinct from 'object'
            or jsonb_typeof(ranking->'rank') is distinct from 'number'
            or jsonb_typeof(ranking->'playerId') is distinct from 'string'
            or jsonb_typeof(ranking->'value') is distinct from 'number'))
      then 'OK' else 'FAIL' end,
    'Jede Rankings-Struktur ist ein Array mit höchstens 10 gültigen Zeilen.'
  from normalized

  union all
  select 4, 'event_participations_removed',
    case when not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'event-participations') then 'OK' else 'FAIL' end,
    'event-participations darf im finalen Dashboard nicht vorkommen.'
  from normalized

  union all
  select 5, 'matrix_glitch_structure',
    case when not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'matrix-glitch') then 'SKIP'
    when exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'matrix-glitch'
        and jsonb_typeof(metric->'rankings') = 'array'
        and not exists (select 1 from jsonb_array_elements(case
          when jsonb_typeof(metric->'rankings') = 'array' then metric->'rankings'
          else '[]'::jsonb end) ranking
          where jsonb_typeof(ranking->'value') is distinct from 'number'
            or case when jsonb_typeof(ranking->'value') = 'number'
              then (ranking->>'value')::numeric < 0 else false end)) then 'OK'
    else 'FAIL' end,
    'SKIP bedeutet: keine auswertbaren benachbarten gültigen Versuche vorhanden.'
  from normalized

  union all
  select 6, 'event_patterns_visible_from_one_event',
    case when not exists (select 1 from public.get_advanced_statistic_player_metrics(
      null, null, null) where metric_key in ('fast-starter','late-bloomer','clutch','one-shot'))
      then 'SKIP'
    when not exists (select 1 from public.get_advanced_statistic_player_metrics(
      null, null, null) where metric_key in ('fast-starter','late-bloomer','clutch','one-shot')
        and sample_count < 1) then 'OK' else 'FAIL' end,
    'Vorhandene Eventmuster müssen bereits ab einer qualifizierten Event-Stichprobe erscheinen.'
  from normalized

  union all
  select 7, 'two_in_sixty_total_structure',
    case when not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'two-in-sixty-total') then 'SKIP'
    when exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'two-in-sixty-total'
        and jsonb_typeof(metric->'overallValue') = 'number'
        and jsonb_typeof(metric->'rankings') = 'array') then 'OK' else 'FAIL' end,
    'SKIP bedeutet: aktuell existiert kein kanonischer 2-in-60-Doppelschlag.'
  from normalized

  union all
  select 8, 'two_in_sixty_best_five_qualification',
    case when not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'two-in-sixty-best-five') then 'SKIP'
    when exists (select 1 from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'two-in-sixty-best-five'
        and jsonb_typeof(metric->'rankings') = 'array')
      and not exists (select 1
      from jsonb_array_elements(all_metrics) metric,
        jsonb_array_elements(case when jsonb_typeof(metric->'rankings') = 'array'
          then metric->'rankings' else '[]'::jsonb end) ranking
      where metric->>'key' = 'two-in-sixty-best-five'
        and (jsonb_typeof(ranking->'total') is distinct from 'number'
          or case when jsonb_typeof(ranking->'total') = 'number'
            then (ranking->>'total')::numeric < 5 else false end)) then 'OK' else 'FAIL' end,
    'Jede Rankingzeile benötigt mindestens fünf qualifizierende Doppelschläge.'
  from normalized

  union all
  select 9, 'two_in_sixty_metric_keys_unique',
    case when not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' in ('two-in-sixty-total','two-in-sixty-best-five')
      group by metric->>'key' having count(*) > 1) then 'OK' else 'FAIL' end,
    'Keine 2-in-60-Metric darf doppelt im finalen Dashboard vorkommen.'
  from normalized

  union all
  select 10, 'season_dashboard',
    case when season_year is null then 'SKIP'
      when jsonb_typeof(season) = 'object'
        and jsonb_typeof(season->'metrics') = 'array' then 'OK' else 'FAIL' end,
    case when season_year is null then 'Keine Saison in events vorhanden.'
      else concat('Saison ', season_year) end
  from normalized

  union all
  select 11, 'season_no_duplicate_metric_keys',
    case when season_year is null then 'SKIP'
      when not exists (select 1
        from jsonb_array_elements(season_metrics) metric
        group by metric->>'key' having count(*) > 1) then 'OK' else 'FAIL' end,
    'Prüft die automatisch gewählte vorhandene Saison.'
  from normalized

  union all
  select 12, 'active_trophy_dashboard',
    case when active_trophy_id is null then 'SKIP'
      when jsonb_typeof(active_trophy) = 'object'
        and jsonb_typeof(active_trophy->'metrics') = 'array' then 'OK' else 'FAIL' end,
    coalesce(active_trophy_id::text, 'Kein aktives Trophy-Event vorhanden.')
  from normalized

  union all
  select 13, 'closed_trophy_dashboard',
    case when closed_trophy_id is null then 'SKIP'
      when jsonb_typeof(closed_trophy) = 'object'
        and jsonb_typeof(closed_trophy->'metrics') = 'array' then 'OK' else 'FAIL' end,
    coalesce(closed_trophy_id::text, 'Kein geschlossenes Trophy-Event vorhanden.')
  from normalized

  union all
  select 14, 'trophy_excludes_career_history_metrics',
    case when active_trophy_id is null and closed_trophy_id is null then 'SKIP'
      when not exists (select 1 from jsonb_array_elements(case
        when active_trophy_id is not null then active_trophy_metrics
        else closed_trophy_metrics end) metric
        where metric->>'key' like 'badge-%'
          or metric->>'key' like 'wr-%'
          or metric->>'key' like 'rivalry-%'
          or metric->>'key' in ('pb-jump','rare-hunter')) then 'OK' else 'FAIL' end,
    case when active_trophy_id is null and closed_trophy_id is null
      then 'Kein Trophy-Event vorhanden.'
      else 'forbidden=' || coalesce((select string_agg(
        metric->>'key', ', ' order by metric->>'key')
        from jsonb_array_elements(case when active_trophy_id is not null
          then active_trophy_metrics else closed_trophy_metrics end) metric
        where metric->>'key' like 'badge-%'
          or metric->>'key' like 'wr-%'
          or metric->>'key' like 'rivalry-%'
          or metric->>'key' in (
            'pb-jump', 'rare-hunter', 'nemesis', 'favorite-opponent'
          )), 'none') end
  from normalized

  union all
  select 15, 'normal_event_has_no_trophy_dashboard',
    case when normal_event_id is null then 'SKIP'
      when normal_event is null then 'OK' else 'FAIL' end,
    coalesce(normal_event_id::text, 'Kein normales Event vorhanden.')
  from normalized

  union all
  select 16, 'compare_exact_requested_players',
    case when cardinality(player_ids) < 2 then 'SKIP'
      when jsonb_typeof(compare_bundle) is distinct from 'object'
        or jsonb_typeof(compare_bundle->'players') is distinct from 'array' then 'FAIL'
      when jsonb_array_length(compare_players) = 2
        and not exists (select 1 from jsonb_array_elements(compare_players) player
          where not (player->>'playerId' = any(array(
            select requested_id::text from unnest(player_ids) requested(requested_id)
          )))) then 'OK'
      else 'FAIL' end,
    concat('requested=', cardinality(player_ids), ', returned=',
      jsonb_array_length(compare_players))
  from normalized

  union all
  select 17, 'compare_metric_structure',
    case when cardinality(player_ids) < 2 then 'SKIP'
      when not exists (select 1
        from jsonb_array_elements(compare_players) player,
          jsonb_array_elements(case when jsonb_typeof(player->'metrics') = 'array'
            then player->'metrics' else '[]'::jsonb end) metric
        where jsonb_typeof(metric) is distinct from 'object'
          or jsonb_typeof(metric->'key') is distinct from 'string'
          or (jsonb_typeof(metric->'value') is distinct from 'null'
            and jsonb_typeof(metric->'value') is distinct from 'number')) then 'OK' else 'FAIL' end,
    'Alle Compare-Metrics besitzen Key und numerischen beziehungsweise null Wert.'
  from normalized

  union all
  select 18, 'compare_empty_and_null_only_ids',
    case when empty_compare = jsonb_build_object('players','[]'::jsonb,'pair','{}'::jsonb)
      and null_compare = jsonb_build_object('players','[]'::jsonb,'pair','{}'::jsonb)
      then 'OK' else 'FAIL' end,
    'Leere und NULL-only UUID-Arrays dürfen keine globale Aggregation auslösen.'
  from normalized

  union all
  select 19, 'qualified_leadership_definition',
    case when position('qualification_rank = 3' in pg_get_functiondef(
      'public.get_qualified_leadership_metrics(uuid[],integer,uuid)'::regprocedure)) > 0
      then 'OK' else 'FAIL' end,
    'Leadership beginnt in der Funktion nach Qualifikation des dritten regulären Spielers.'
  from normalized

  union all
  select 20, 'historical_rivalry_closed_only',
    case when pg_get_viewdef('public.rivalry_pair_events'::regclass, true)
      ilike '%status%closed%' then 'OK' else 'FAIL' end,
    'Die bestehende Rivalry-View muss weiterhin ausschließlich geschlossene Events verwenden.'
  from normalized
)
select check_name, status, detail
from checks
order by ordinal;

-- Intentionally no EXPLAIN ANALYZE: the smoke calls above execute every selected
-- payload once; repeating the expensive reads would add avoidable production load.

ROLLBACK;
