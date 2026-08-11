-- Player-scoped prestige metrics without another visible badge evaluation.
-- The profile service derives visible_badge_count from its already loaded
-- get_visible_player_badges result.
create or replace function public.get_player_profile_prestige(p_player_id uuid)
returns table (
  player_id uuid,
  pb_count integer,
  largest_pb_improvement_hundredths integer,
  average_pb_improvement_hundredths integer,
  world_record_count integer,
  world_record_days integer,
  longest_world_record_days integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with requested_player as materialized (
    select id
    from public.players
    where id = p_player_id and not is_ak and not is_archived
  ), pb as (
    select
      count(*)::integer as pb_count,
      max(history.improvement_hundredths)::integer
        as largest_pb_improvement_hundredths,
      round(avg(history.improvement_hundredths) filter (
        where history.improvement_hundredths is not null
      ))::integer as average_pb_improvement_hundredths
    from public.player_pb_history history
    where history.player_id = p_player_id
  ), wr as (
    select
      count(*)::integer as world_record_count,
      coalesce(sum(history.duration_days), 0)::integer as world_record_days,
      coalesce(max(history.duration_days), 0)::integer as longest_world_record_days
    from public.world_record_history history
    where history.player_id = p_player_id
  )
  select
    player.id,
    pb.pb_count,
    pb.largest_pb_improvement_hundredths,
    pb.average_pb_improvement_hundredths,
    wr.world_record_count,
    wr.world_record_days,
    wr.longest_world_record_days
  from requested_player player
  cross join pb
  cross join wr;
$$;

revoke all on function public.get_player_profile_prestige(uuid) from public;
grant execute on function public.get_player_profile_prestige(uuid) to anon, authenticated;
