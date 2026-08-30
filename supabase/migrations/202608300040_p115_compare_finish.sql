-- P11.5 Compare Finish: lightweight player projections of canonical Most Wanted reads.

create or replace function public.get_player_most_wanted_statistics(
  p_player_ids uuid[],
  p_season_year integer default null
)
returns table (
  player_id uuid,
  all_time_hits integer,
  season_first_hits integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with requested_players as (
    select distinct requested.player_id
    from unnest(coalesce(p_player_ids, array[]::uuid[])) requested(player_id)
    join public.players p on p.id = requested.player_id
    where not p.is_ak and not p.is_archived
  ), all_time as (
    select
      q.player_id,
      count(distinct mod(q.time_hundredths, 100))::integer hit_count
    from public.qualified_official_times q
    join requested_players requested on requested.player_id = q.player_id
    where not q.is_guest
    group by q.player_id
  ), season_firsts as (
    select
      mw.first_player_id player_id,
      count(*)::integer hit_count
    from public.season_most_wanted_endings mw
    join requested_players requested on requested.player_id = mw.first_player_id
    where p_season_year is not null
      and mw.season_year = p_season_year
      and mw.achieved
      and not mw.first_is_guest
    group by mw.first_player_id
  )
  select
    requested.player_id,
    coalesce(all_time.hit_count, 0)::integer all_time_hits,
    case when p_season_year is null then null
      else coalesce(season_firsts.hit_count, 0)::integer end season_first_hits
  from requested_players requested
  left join all_time on all_time.player_id = requested.player_id
  left join season_firsts on season_firsts.player_id = requested.player_id;
$$;

revoke all on function public.get_player_most_wanted_statistics(uuid[], integer)
  from public;
grant execute on function public.get_player_most_wanted_statistics(uuid[], integer)
  to anon, authenticated;
