BEGIN;

-- Embedded verbatim from supabase/migrations/202609210059_compare_scoring_two_in_sixty_fix.sql

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
), two_in_sixty_ordered as materialized (
  select a.player_id, a.event_id, a.id, a.submitted_at, a.time_hundredths,
    lag(a.submitted_at) over (
      partition by a.player_id, a.event_id order by a.submitted_at, a.id
    ) previous_submitted_at,
    lag(a.time_hundredths) over (
      partition by a.player_id, a.event_id order by a.submitted_at, a.id
    ) previous_time
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
    and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
), two_in_sixty_expected as materialized (
  select player_id, min(previous_time + time_hundredths)::numeric expected_best,
    count(*)::numeric expected_runs
  from two_in_sixty_ordered
  where previous_submitted_at is not null
    and submitted_at - previous_submitted_at <= interval '180 seconds'
  group by player_id
), two_in_sixty_actual as materialized (
  select player_id, value actual_best, sample_count actual_runs
  from public.get_statistics_sequence_metrics(null, null, null)
  where metric_key = 'two-in-sixty-best'
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
  select 8, 'two_in_sixty_best_is_exact_minimum',
    case when not exists (select 1 from two_in_sixty_expected) then 'SKIP'
      when not exists (
        select 1
        from two_in_sixty_expected expected
        full join two_in_sixty_actual actual using (player_id)
        where expected.player_id is null or actual.player_id is null
          or actual.actual_best is distinct from expected.expected_best
          or actual.actual_runs is distinct from expected.expected_runs
      ) then 'OK' else 'FAIL' end,
    concat('players=', (select count(*) from two_in_sixty_expected),
      ', smallest_run_count=', coalesce((select min(expected_runs)
        from two_in_sixty_expected)::text, 'none'),
      ', mismatches=', (select count(*) from two_in_sixty_expected expected
        full join two_in_sixty_actual actual using (player_id)
        where expected.player_id is null or actual.player_id is null
          or actual.actual_best is distinct from expected.expected_best
          or actual.actual_runs is distinct from expected.expected_runs))
  from normalized

  union all
  select 9, 'two_in_sixty_public_keys',
    case when exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'two-in-sixty-best-five') then 'FAIL'
    when not exists (select 1 from two_in_sixty_expected) then 'SKIP'
    when (select count(*) from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'two-in-sixty-total') = 1
      and (select count(*) from jsonb_array_elements(all_metrics) metric
      where metric->>'key' = 'two-in-sixty-best') = 1
      and not exists (select 1
      from jsonb_array_elements(all_metrics) metric
      where metric->>'key' in ('two-in-sixty-total','two-in-sixty-best')
      group by metric->>'key' having count(*) > 1) then 'OK' else 'FAIL' end,
    'Erwartet total und best jeweils einmal; best-five darf nicht öffentlich erscheinen.'
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

  union all
  select 21, 'migration_059_function_definitions',
    case when position('min(pair_time)::numeric best_pair_time' in pg_get_functiondef(
        'public.get_statistics_sequence_metrics(uuid[],integer,uuid)'::regprocedure)) > 0
      and position('two-in-sixty-best-five' in pg_get_functiondef(
        'public.get_statistics_sequence_metrics(uuid[],integer,uuid)'::regprocedure)) = 0
      and position('two-in-sixty-best' in pg_get_functiondef(
        'public.get_advanced_statistics_dashboard(integer,uuid)'::regprocedure)) > 0
      then 'OK' else 'FAIL' end,
    '059 muss beide öffentlichen Funktionen mit der neuen Bestwert-Semantik ersetzt haben.'
  from normalized

  union all
  select 22, 'two_in_sixty_single_pair_qualifies',
    case when not exists (select 1 from two_in_sixty_expected where expected_runs = 1)
      then 'SKIP'
      when not exists (
        select 1 from two_in_sixty_expected expected
        left join two_in_sixty_actual actual using (player_id)
        where expected.expected_runs = 1
          and (actual.player_id is null
            or actual.actual_best is distinct from expected.expected_best
            or actual.actual_runs is distinct from 1)
      ) then 'OK' else 'FAIL' end,
    concat('single_pair_players=', (select count(*) from two_in_sixty_expected
      where expected_runs = 1))
  from normalized

  union all
  select 23, 'old_two_in_sixty_key_absent_from_public_payloads',
    case when not exists (select 1 from jsonb_array_elements(all_metrics) metric
        where metric->>'key' = 'two-in-sixty-best-five')
      and not exists (select 1 from jsonb_array_elements(season_metrics) metric
        where metric->>'key' = 'two-in-sixty-best-five')
      and not exists (select 1 from jsonb_array_elements(active_trophy_metrics) metric
        where metric->>'key' = 'two-in-sixty-best-five')
      and not exists (select 1 from jsonb_array_elements(closed_trophy_metrics) metric
        where metric->>'key' = 'two-in-sixty-best-five')
      and not exists (select 1
        from jsonb_array_elements(compare_players) player,
          jsonb_array_elements(case when jsonb_typeof(player->'metrics') = 'array'
            then player->'metrics' else '[]'::jsonb end) metric
        where metric->>'key' = 'two-in-sixty-best-five')
      then 'OK' else 'FAIL' end,
    'Dashboard-, Saison-, Trophy- und Compare-Payloads dürfen den alten Key nicht liefern.'
  from normalized

  union all
  select 24, 'compare_threshold_metrics_are_not_filtered',
    case when cardinality(player_ids) < 2 then 'SKIP'
      when not exists (
        select 1
        from jsonb_array_elements(coalesce(
          public.get_player_compare_metric_bundle_v57(player_ids, null)->'players',
          '[]'::jsonb)) baseline_player,
          jsonb_array_elements(coalesce(baseline_player->'metrics', '[]'::jsonb)) baseline_metric
        where baseline_metric->>'key' in ('sub5','sub4','sub3','sub25','sub2')
          and not exists (
            select 1
            from jsonb_array_elements(compare_players) actual_player,
              jsonb_array_elements(coalesce(actual_player->'metrics', '[]'::jsonb)) actual_metric
            where actual_player->>'playerId' = baseline_player->>'playerId'
              and actual_metric->>'key' = baseline_metric->>'key'
          )
      ) then 'OK' else 'FAIL' end,
    'Vorhandene Threshold-Metrics bleiben unabhängig vom qualified-Wert im Compare-Payload.'
  from normalized
)
select check_name, status, detail
from checks
order by ordinal;

-- Intentionally no EXPLAIN ANALYZE: the smoke calls above execute every selected
-- payload once; repeating the expensive reads would add avoidable production load.

ROLLBACK;
