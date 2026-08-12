-- PR 9B: season-scoped core read models. Existing all-time views stay unchanged.

create view public.season_player_statistics
with (security_invoker = true)
as
with season_players as (
  select extract(year from e.start_date)::integer season_year, ep.player_id
  from public.event_participants ep
  join public.events e on e.id = ep.event_id and e.deleted_at is null
  join public.players p on p.id = ep.player_id
  where not p.is_ak and not p.is_archived
    and extract(year from e.start_date)::integer >= 2026
  union
  select extract(year from e.start_date)::integer, a.player_id
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.player_id is not null
    and a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
    and extract(year from e.start_date)::integer >= 2026
), attempt_stats as (
  select extract(year from e.start_date)::integer season_year, a.player_id,
    count(a.id)::integer approved_attempts,
    count(a.id) filter (where not a.is_dnf)::integer valid_attempts,
    count(a.id) filter (where a.is_dnf)::integer dnf_count,
    min(a.time_hundredths) filter (where not a.is_dnf) personal_best_hundredths,
    round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
  group by extract(year from e.start_date)::integer, a.player_id
), podium_stats as (
  select extract(year from e.start_date)::integer season_year, ep.player_id,
    count(distinct ep.event_id) filter (where ep.rank = 1)::integer event_wins,
    count(distinct ep.event_id) filter (where ep.rank = 2)::integer second_places,
    count(distinct ep.event_id) filter (where ep.rank = 3)::integer third_places
  from public.event_podium ep
  join public.events e on e.id = ep.event_id and e.deleted_at is null
  where ep.player_id is not null
  group by extract(year from e.start_date)::integer, ep.player_id
), participation_stats as (
  select extract(year from e.start_date)::integer season_year, ep.player_id,
    count(distinct ep.event_id)::integer event_participations
  from public.event_participants ep
  join public.events e on e.id = ep.event_id and e.deleted_at is null
  join public.players p on p.id = ep.player_id
  where not p.is_ak and not p.is_archived
  group by extract(year from e.start_date)::integer, ep.player_id
)
select sp.season_year, sp.player_id,
  ats.personal_best_hundredths,
  coalesce(ats.approved_attempts, 0) approved_attempts,
  coalesce(ats.valid_attempts, 0) valid_attempts,
  coalesce(ats.dnf_count, 0) dnf_count,
  ats.average_hundredths,
  coalesce(ps.event_wins, 0) event_wins,
  coalesce(parts.event_participations, 0) event_participations,
  coalesce(ps.second_places, 0) second_places,
  coalesce(ps.third_places, 0) third_places
from season_players sp
left join attempt_stats ats using (season_year, player_id)
left join podium_stats ps using (season_year, player_id)
left join participation_stats parts using (season_year, player_id);

create view public.season_hall_of_fame
with (security_invoker = true)
as
with valid_attempts as (
  select extract(year from e.start_date)::integer season_year,
    p.id player_id, p.display_name, p.avatar_url, p.avatar_path,
    a.event_id, e.start_date record_date, a.time_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and not p.is_ak and not p.is_archived
    and extract(year from e.start_date)::integer >= 2026
), bests as (
  select season_year, player_id, display_name, avatar_url, avatar_path,
    min(time_hundredths) personal_best_hundredths
  from valid_attempts
  group by season_year, player_id, display_name, avatar_url, avatar_path
), ranked as (
  select *, dense_rank() over (
    partition by season_year order by personal_best_hundredths
  )::integer rank
  from bests
)
select r.season_year, r.player_id, r.display_name, r.avatar_url, r.avatar_path,
  r.personal_best_hundredths, min(va.record_date) record_date,
  r.rank
from ranked r
join valid_attempts va
  on va.season_year = r.season_year
  and va.player_id = r.player_id
  and va.time_hundredths = r.personal_best_hundredths
group by r.season_year, r.player_id, r.display_name, r.avatar_url,
  r.avatar_path, r.personal_best_hundredths, r.rank;

create view public.season_global_statistics
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
  ats.average_hundredths
from event_counts ec
left join attempt_stats ats using (season_year);

create or replace function public.get_player_season_profile(
  p_player_id uuid,
  p_season_year integer
)
returns table (
  player_id uuid,
  personal_best_hundredths integer,
  season_rank integer,
  average_hundredths integer,
  event_participations integer,
  event_wins integer,
  second_places integer,
  third_places integer,
  valid_attempts integer,
  dnf_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with target_attempt_stats as (
    select min(a.time_hundredths) filter (where not a.is_dnf) personal_best_hundredths,
      round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths,
      count(a.id) filter (where not a.is_dnf)::integer valid_attempts,
      count(a.id) filter (where a.is_dnf)::integer dnf_count
    from public.attempts a
    join public.events e on e.id = a.event_id and e.deleted_at is null
    join public.players qualified_player on qualified_player.id = a.player_id
    where a.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and a.status = 'approved' and a.deleted_at is null and not a.is_ak
      and not qualified_player.is_ak and not qualified_player.is_archived
  ), target_participation as (
    select count(distinct ep.event_id)::integer event_participations
    from public.event_participants ep
    join public.events e on e.id = ep.event_id and e.deleted_at is null
    join public.players qualified_player on qualified_player.id = ep.player_id
    where ep.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and not qualified_player.is_ak and not qualified_player.is_archived
  ), target_podium as (
    select count(distinct ep.event_id) filter (where ep.rank = 1)::integer event_wins,
      count(distinct ep.event_id) filter (where ep.rank = 2)::integer second_places,
      count(distinct ep.event_id) filter (where ep.rank = 3)::integer third_places
    from public.event_podium ep
    join public.events e on e.id = ep.event_id and e.deleted_at is null
    join public.players qualified_player on qualified_player.id = ep.player_id
    where ep.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and not qualified_player.is_ak and not qualified_player.is_archived
  ), season_bests as (
    select a.player_id, min(a.time_hundredths) personal_best_hundredths
    from public.attempts a
    join public.events e on e.id = a.event_id and e.deleted_at is null
    join public.players qualified_player on qualified_player.id = a.player_id
    where extract(year from e.start_date)::integer = p_season_year
      and a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
      and not qualified_player.is_ak and not qualified_player.is_archived
    group by a.player_id
  ), ranked_bests as (
    select player_id, dense_rank() over (order by personal_best_hundredths)::integer rank
    from season_bests
  )
  select p.id,
    attempts.personal_best_hundredths,
    ranks.rank,
    attempts.average_hundredths,
    coalesce(participation.event_participations, 0),
    coalesce(podium.event_wins, 0),
    coalesce(podium.second_places, 0),
    coalesce(podium.third_places, 0),
    coalesce(attempts.valid_attempts, 0),
    coalesce(attempts.dnf_count, 0)
  from public.players p
  cross join target_attempt_stats attempts
  cross join target_participation participation
  cross join target_podium podium
  left join ranked_bests ranks on ranks.player_id = p.id
  where p.id = p_player_id and not p.is_archived
    and p_season_year >= 2026;
$$;

grant select on public.season_player_statistics,
  public.season_hall_of_fame,
  public.season_global_statistics
  to anon, authenticated;
revoke all on function public.get_player_season_profile(uuid, integer)
  from public;
grant execute on function public.get_player_season_profile(uuid, integer)
  to anon, authenticated;
