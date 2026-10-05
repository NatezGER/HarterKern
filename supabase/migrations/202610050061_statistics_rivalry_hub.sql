create function public.get_rivalry_hub(
  p_season_year integer default null,
  p_include_pairs boolean default true
) returns jsonb
language sql stable security invoker set search_path = public as $$
with scoped as materialized (
  select summaries.*
  from public.event_pair_summaries summaries
  where summaries.event_status = 'closed'
    and (p_season_year is null
      or extract(year from summaries.event_date)::integer = p_season_year)
), pair_rollup as materialized (
  select player_low_id, player_high_id,
    count(*)::integer common_events,
    count(*) filter (where is_rivalry_event)::integer rivalry_events,
    coalesce(sum(direct_takeovers), 0)::integer all_direct_takeovers,
    coalesce(sum(direct_takeovers) filter (
      where is_rivalry_event
    ), 0)::integer rivalry_direct_takeovers,
    min(event_date) filter (where is_rivalry_event) first_rivalry_date,
    max(event_date) filter (where is_rivalry_event) last_rivalry_date,
    greatest(0, max(event_date) filter (where is_rivalry_event)
      - min(event_date) filter (where is_rivalry_event))::integer span_days
  from scoped
  group by player_low_id, player_high_id
), named_pairs as materialized (
  select rollup.*, low.display_name player_low_name,
    high.display_name player_high_name
  from pair_rollup rollup
  join public.players low on low.id = rollup.player_low_id
  join public.players high on high.id = rollup.player_high_id
  where rollup.rivalry_events > 0 or rollup.all_direct_takeovers > 0
), rivalry_players as (
  select player_low_id player_id from named_pairs where rivalry_events > 0
  union
  select player_high_id from named_pairs where rivalry_events > 0
), strongest as (
  select * from named_pairs where rivalry_events > 0
  order by rivalry_direct_takeovers desc, rivalry_events desc,
    player_low_id, player_high_id limit 1
), longest as (
  select * from named_pairs where rivalry_events > 0
  order by span_days desc nulls last, rivalry_events desc,
    player_low_id, player_high_id limit 1
)
select jsonb_build_object(
  'summary', jsonb_build_object(
    'rivalryEvents', coalesce((select sum(rivalry_events) from named_pairs), 0),
    'playersWithRivalry', (select count(*) from rivalry_players),
    'directTakeovers', coalesce((select sum(all_direct_takeovers) from named_pairs), 0),
    'strongestPair', (select jsonb_build_object(
      'playerLowId', player_low_id, 'playerHighId', player_high_id,
      'playerLowName', player_low_name, 'playerHighName', player_high_name,
      'rivalryEvents', rivalry_events,
      'rivalryDirectTakeovers', rivalry_direct_takeovers
    ) from strongest),
    'longestPair', (select jsonb_build_object(
      'playerLowId', player_low_id, 'playerHighId', player_high_id,
      'playerLowName', player_low_name, 'playerHighName', player_high_name,
      'rivalryEvents', rivalry_events, 'spanDays', span_days,
      'firstRivalryDate', first_rivalry_date,
      'lastRivalryDate', last_rivalry_date
    ) from longest)
  ),
  'pairs', case when p_include_pairs then coalesce((select jsonb_agg(
    jsonb_build_object(
      'playerLowId', player_low_id, 'playerHighId', player_high_id,
      'playerLowName', player_low_name, 'playerHighName', player_high_name,
      'rivalryEvents', rivalry_events,
      'directTakeovers', all_direct_takeovers,
      'allDirectTakeovers', all_direct_takeovers,
      'rivalryDirectTakeovers', rivalry_direct_takeovers,
      'commonEvents', common_events,
      'firstRivalryDate', first_rivalry_date,
      'lastRivalryDate', last_rivalry_date,
      'spanDays', case when rivalry_events > 0 then span_days end,
      'levelReached', rivalry_events > 0
    ) order by rivalry_events desc, rivalry_direct_takeovers desc,
      all_direct_takeovers desc, player_low_id, player_high_id
  ) from named_pairs), '[]'::jsonb) else '[]'::jsonb end
);
$$;

revoke all on function public.get_rivalry_hub(integer, boolean) from public;
grant execute on function public.get_rivalry_hub(integer, boolean)
  to anon, authenticated;
