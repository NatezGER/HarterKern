-- P11.8: one scoped read for multiple canonical player PB progressions.
create or replace function public.get_player_progressions(p_player_ids uuid[], p_season_year integer default null)
returns table (source_id uuid, player_id uuid, display_name text, avatar_url text, time_hundredths integer, achieved_at timestamptz, achieved_date date, event_id uuid, source_label text, source_type text, sequence_number integer, previous_best_hundredths integer, improvement_hundredths integer, duration_days integer, is_current boolean)
language sql stable security invoker set search_path = public as $$
  select history.source_id, history.player_id, players.display_name,
    coalesce(players.avatar_url, case when players.avatar_path is not null then '/storage/v1/object/public/player-avatars/' || players.avatar_path end),
    history.time_hundredths, history.achieved_at, history.achieved_date,
    history.event_id, history.source_label, history.source_type,
    history.sequence_number, history.previous_best_hundredths,
    history.improvement_hundredths, history.duration_days, history.is_current
  from public.player_pb_history history
  join public.players players on players.id = history.player_id
  where p_season_year is null and history.player_id = any(p_player_ids)
    and not players.is_ak and not players.is_archived
  union all
  select history.source_id, history.player_id, players.display_name,
    coalesce(players.avatar_url, case when players.avatar_path is not null then '/storage/v1/object/public/player-avatars/' || players.avatar_path end),
    history.time_hundredths, history.achieved_at, history.achieved_date,
    history.event_id, history.source_label, history.source_type,
    history.sequence_number, history.previous_best_hundredths,
    history.improvement_hundredths, history.duration_days, history.is_current
  from unnest(p_player_ids) requested(player_id)
  cross join lateral public.get_player_season_pb_history(requested.player_id, p_season_year) history
  join public.players players on players.id = history.player_id
  where p_season_year is not null and not players.is_ak and not players.is_archived
  order by player_id, sequence_number;
$$;
revoke all on function public.get_player_progressions(uuid[], integer) from public;
grant execute on function public.get_player_progressions(uuid[], integer) to anon, authenticated;
