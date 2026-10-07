-- Rivalry Hub V2: additive, read-only projections of 060; no award changes.
-- Central formula, numeric arithmetic and rounding; no cap at 100.
create function public.calculate_rivalry_metrics_v1(
  p_takeovers numeric, p_events numeric, p_length numeric
) returns table (rivalry_score numeric, intensity_percent numeric)
language sql immutable security invoker set search_path = public as $$
with constants as (
  select 3::numeric takeover_threshold, 100::numeric scale,
    0.25::numeric history_weight, 0.4::numeric density_floor,
    0.6::numeric density_weight, 0.12::numeric length_weight
)
select
  case when p_takeovers > 0 and p_events > 0 then round(
    scale * sqrt(p_takeovers / takeover_threshold)
    * (1 + history_weight * ln(p_events))
    * (density_floor + density_weight * least(1::numeric, p_takeovers / p_events))
    * (1 + length_weight * greatest(0::numeric, p_length - 1))
  ) else 0::numeric end,
  case when p_events > 0 then round(
    scale * p_takeovers / (p_events * takeover_threshold)
  ) else null::numeric end
from constants;
$$;
revoke all on function public.calculate_rivalry_metrics_v1(numeric, numeric, numeric) from public;
grant execute on function public.calculate_rivalry_metrics_v1(numeric, numeric, numeric) to anon, authenticated;

create function public.get_rivalry_hub_v2(
  p_season_year integer default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with canonical as materialized (
  -- One shared canonical fact read for scope metrics and lifetime metadata.
  -- Narrow projection avoids requesting unused lead-time aggregates.
  select event_id, player_low_id, player_high_id, event_date,
    direct_takeovers, is_rivalry_event
  from public.rivalry_pair_events
), history as (
  select player_low_id, player_high_id,
    count(*) filter (where is_rivalry_event)::integer rivalry_length_all_time,
    min(event_date) filter (where is_rivalry_event) first_rivalry_event_date_all_time
  from canonical
  group by player_low_id, player_high_id
), scoped as materialized (
  select * from canonical
  where p_season_year is null or extract(year from event_date)::integer = p_season_year
), final_times as materialized (
  -- Same comparable population as Compare's event history + valid PB check.
  -- One grouped read, NOT get_player_event_history per player/pair.
  select a.event_id, a.player_id, min(a.time_hundredths) best_hundredths
  from public.official_event_attempts a
  join public.events e on e.id = a.event_id and e.status = 'closed'
  where a.is_valid_time
    and (p_season_year is null or extract(year from e.start_date)::integer = p_season_year)
    and exists (select 1 from public.event_participants ep
      where ep.event_id = a.event_id and ep.player_id = a.player_id)
  group by a.event_id, a.player_id
), facts as (
  select s.*, a.best_hundredths best_a, b.best_hundredths best_b,
    a.best_hundredths is not null and b.best_hundredths is not null comparable
  from scoped s
  left join final_times a on a.event_id = s.event_id and a.player_id = s.player_low_id
  left join final_times b on b.event_id = s.event_id and b.player_id = s.player_high_id
), rollup as (
  select player_low_id, player_high_id,
    count(*)::integer canonical_common_events,
    count(*) filter (where comparable)::integer comparable_h2h_events,
    count(*) filter (where comparable and best_a < best_b)::integer h2h_wins_a,
    count(*) filter (where comparable and best_b < best_a)::integer h2h_wins_b,
    count(*) filter (where comparable and best_a = best_b)::integer ties,
    coalesce(sum(direct_takeovers) filter (where comparable), 0)::bigint total_direct_takeovers,
    coalesce(sum(direct_takeovers), 0)::bigint canonical_direct_takeovers,
    count(*) filter (where comparable and direct_takeovers > 0)::integer events_with_takeover,
    count(*) filter (where is_rivalry_event)::integer rivalry_length,
    coalesce(sum(direct_takeovers) filter (where is_rivalry_event), 0)::bigint rivalry_direct_takeovers,
    min(event_date) filter (where is_rivalry_event) first_rivalry_event_date_scope,
    max(event_date) filter (where is_rivalry_event) last_rivalry_event_date_scope
  from facts group by player_low_id, player_high_id
), pairs as materialized (
  select r.*, h.rivalry_length_all_time, h.first_rivalry_event_date_all_time,
    h.rivalry_length_all_time > 0 rivalry_status_all_time,
    r.rivalry_length > 0 formal_rivalry_in_scope,
    h.rivalry_length_all_time > 0 and r.rivalry_length = 0 historical_rivalry,
    h.rivalry_length_all_time = 0 and r.total_direct_takeovers > 0 duel_only,
    a.display_name player_a_display_name, b.display_name player_b_display_name,
    a.avatar_url player_a_avatar_url, a.avatar_path player_a_avatar_path,
    b.avatar_url player_b_avatar_url, b.avatar_path player_b_avatar_path,
    metrics.rivalry_score, metrics.intensity_percent
  from rollup r
  join history h on h.player_low_id = r.player_low_id and h.player_high_id = r.player_high_id
  join public.players a on a.id = r.player_low_id
  join public.players b on b.id = r.player_high_id
  cross join lateral public.calculate_rivalry_metrics_v1(
    r.total_direct_takeovers::numeric, r.comparable_h2h_events::numeric, r.rivalry_length::numeric
  ) metrics
  -- Historical pairs need a canonical encounter in scope (rollup guarantees it).
  -- Zero-takeover ordinary pairs are not duels. Historical pairs may have T=0.
  where r.total_direct_takeovers > 0 or h.rivalry_length_all_time > 0
), rivalry_players as (
  select player_low_id player_id from pairs where formal_rivalry_in_scope
  union
  select player_high_id from pairs where formal_rivalry_in_scope
), payloads as (
  select pairs.*, jsonb_build_object(
    'playerAId', player_low_id, 'playerBId', player_high_id,
    'playerADisplayName', player_a_display_name, 'playerBDisplayName', player_b_display_name,
    'playerAAvatarUrl', player_a_avatar_url, 'playerAAvatarPath', player_a_avatar_path,
    'playerBAvatarUrl', player_b_avatar_url, 'playerBAvatarPath', player_b_avatar_path,
    'comparableH2hEvents', comparable_h2h_events,
    'h2hWinsA', h2h_wins_a, 'h2hWinsB', h2h_wins_b, 'ties', ties,
    'totalDirectTakeovers', total_direct_takeovers, 'eventsWithTakeover', events_with_takeover,
    'canonicalCommonEvents', canonical_common_events,
    'canonicalDirectTakeovers', canonical_direct_takeovers,
    'rivalryDirectTakeovers', rivalry_direct_takeovers,
    'rivalryLength', rivalry_length, 'rivalryEvents', rivalry_length,
    'rivalryScore', rivalry_score, 'intensityPercent', intensity_percent,
    'firstRivalryEventDateScope', first_rivalry_event_date_scope,
    'lastRivalryEventDateScope', last_rivalry_event_date_scope,
    'rivalryStatusAllTime', rivalry_status_all_time,
    'firstRivalryEventDateAllTime', first_rivalry_event_date_all_time,
    'rivalryLengthAllTime', rivalry_length_all_time,
    'formalRivalryInScope', formal_rivalry_in_scope,
    'historicalRivalry', historical_rivalry, 'duelOnly', duel_only
  ) payload
  from pairs
)
select jsonb_build_object(
  'seasonYear', p_season_year,
  'summary', jsonb_build_object(
    'rivalryEvents', coalesce((select sum(rivalry_length) from pairs), 0),
    'playersWithRivalry', (select count(*) from rivalry_players),
    'directTakeovers', coalesce((select sum(total_direct_takeovers) from pairs), 0)
  ),
  'pairs', coalesce((select jsonb_agg(payload order by
    rivalry_score desc, rivalry_length desc, total_direct_takeovers desc,
    comparable_h2h_events desc, player_low_id, player_high_id)
    from payloads), '[]'::jsonb)
);
$$;
revoke all on function public.get_rivalry_hub_v2(integer) from public;
grant execute on function public.get_rivalry_hub_v2(integer) to anon, authenticated;
