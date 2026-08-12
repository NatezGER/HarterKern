-- PR 9B follow-up: qualified historical times count toward season PBs and rankings.

create or replace view public.season_player_statistics
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
  union
  select extract(year from h.attempt_date)::integer, h.player_id
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
    and extract(year from h.attempt_date)::integer >= 2026
), attempt_stats as (
  select extract(year from e.start_date)::integer season_year, a.player_id,
    count(a.id)::integer approved_attempts,
    count(a.id) filter (where not a.is_dnf)::integer valid_attempts,
    count(a.id) filter (where a.is_dnf)::integer dnf_count,
    round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
  group by extract(year from e.start_date)::integer, a.player_id
), pb_stats as (
  select season_year, player_id, min(time_hundredths) personal_best_hundredths
  from (
    select extract(year from e.start_date)::integer season_year,
      a.player_id, a.time_hundredths
    from public.attempts a
    join public.events e on e.id = a.event_id and e.deleted_at is null
    join public.players p on p.id = a.player_id
    where a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
      and not p.is_ak and not p.is_archived
    union all
    select extract(year from h.attempt_date)::integer,
      h.player_id, h.time_hundredths
    from public.historical_attempts h
    join public.players p on p.id = h.player_id
    where h.deleted_at is null and not h.is_guest and not h.out_of_competition
      and not p.is_ak and not p.is_archived
      and extract(year from h.attempt_date)::integer >= 2026
  ) qualified_times
  group by season_year, player_id
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
  pbs.personal_best_hundredths,
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
left join pb_stats pbs using (season_year, player_id)
left join podium_stats ps using (season_year, player_id)
left join participation_stats parts using (season_year, player_id);

create or replace view public.season_hall_of_fame
with (security_invoker = true)
as
with valid_attempts as (
  select extract(year from e.start_date)::integer season_year,
    p.id player_id, p.display_name, p.avatar_url, p.avatar_path,
    e.start_date record_date, a.time_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and not p.is_ak and not p.is_archived
    and extract(year from e.start_date)::integer >= 2026
  union all
  select extract(year from h.attempt_date)::integer,
    p.id, p.display_name, p.avatar_url, p.avatar_path,
    h.attempt_date, h.time_hundredths
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
    and extract(year from h.attempt_date)::integer >= 2026
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
    select round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths,
      count(a.id) filter (where not a.is_dnf)::integer valid_attempts,
      count(a.id) filter (where a.is_dnf)::integer dnf_count
    from public.attempts a
    join public.events e on e.id = a.event_id and e.deleted_at is null
    join public.players qualified_player on qualified_player.id = a.player_id
    where a.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and a.status = 'approved' and a.deleted_at is null and not a.is_ak
      and not qualified_player.is_ak and not qualified_player.is_archived
  ), target_pb as (
    select min(time_hundredths) personal_best_hundredths
    from (
      select a.time_hundredths
      from public.attempts a
      join public.events e on e.id = a.event_id and e.deleted_at is null
      join public.players qualified_player on qualified_player.id = a.player_id
      where a.player_id = p_player_id
        and extract(year from e.start_date)::integer = p_season_year
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
        and not qualified_player.is_ak and not qualified_player.is_archived
      union all
      select h.time_hundredths
      from public.historical_attempts h
      join public.players qualified_player on qualified_player.id = h.player_id
      where h.player_id = p_player_id
        and extract(year from h.attempt_date)::integer = p_season_year
        and h.deleted_at is null and not h.is_guest and not h.out_of_competition
        and not qualified_player.is_ak and not qualified_player.is_archived
    ) qualified_times
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
    select player_id, min(time_hundredths) personal_best_hundredths
    from (
      select a.player_id, a.time_hundredths
      from public.attempts a
      join public.events e on e.id = a.event_id and e.deleted_at is null
      join public.players qualified_player on qualified_player.id = a.player_id
      where extract(year from e.start_date)::integer = p_season_year
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
        and not qualified_player.is_ak and not qualified_player.is_archived
      union all
      select h.player_id, h.time_hundredths
      from public.historical_attempts h
      join public.players qualified_player on qualified_player.id = h.player_id
      where extract(year from h.attempt_date)::integer = p_season_year
        and h.deleted_at is null and not h.is_guest and not h.out_of_competition
        and not qualified_player.is_ak and not qualified_player.is_archived
    ) qualified_times
    group by player_id
  ), ranked_bests as (
    select player_id, dense_rank() over (order by personal_best_hundredths)::integer rank
    from season_bests
  )
  select p.id,
    pb.personal_best_hundredths,
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
  cross join target_pb pb
  cross join target_participation participation
  cross join target_podium podium
  left join ranked_bests ranks on ranks.player_id = p.id
  where p.id = p_player_id and not p.is_archived
    and p_season_year >= 2026;
$$;
