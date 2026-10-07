-- Scoped team read; existing qualification and volume semantics are unchanged.
create function public.get_team_milestones_snapshot(
  p_season_year integer default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with scoped_times as (
  select player_id, time_hundredths
  from public.qualified_official_times
  where p_season_year is null and not is_guest and player_id is not null
  union all
  select player_id, time_hundredths
  from public.season_qualified_official_times
  where p_season_year is not null and season_year = p_season_year
    and not is_guest and player_id is not null
), personal_bests as (
  select player_id, min(time_hundredths) best_hundredths
  from scoped_times
  group by player_id
), team as materialized (
  select player_id, best_hundredths
  from personal_bests
  order by best_hundredths, player_id
  limit 10
), volume as (
  -- Same event-only valid count as the overview's existing beer-volume card.
  -- Historical times count for PBs, not for the existing consumed-volume metric.
  select valid_attempts::bigint
  from public.global_statistics where p_season_year is null
  union all
  select valid_attempts::bigint
  from public.season_global_statistics
  where p_season_year is not null and season_year = p_season_year
)
select jsonb_build_object(
  'seasonYear', p_season_year,
  'validAttempts', coalesce((select valid_attempts from volume), 0),
  'teamTimeHundredths', (select sum(best_hundredths) from team),
  'playerCount', (select count(*) from team),
  'targetPlayerCount', 10
);
$$;
revoke all on function public.get_team_milestones_snapshot(integer) from public;
grant execute on function public.get_team_milestones_snapshot(integer) to anon, authenticated;
