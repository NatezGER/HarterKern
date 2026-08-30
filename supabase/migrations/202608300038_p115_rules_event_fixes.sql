-- P11.5: central competition ranking, final-only placement results and
-- tie-safe event finalization. Existing eligibility rules remain canonical.

create view public.event_final_standings
with (security_invoker = true)
as
with participants as (
  select ep.event_id, ep.player_id, null::uuid guest_id,
    p.display_name, p.avatar_url, p.avatar_path,
    false is_guest, p.is_ak
  from public.event_participants ep
  join public.events e on e.id = ep.event_id
    and e.status = 'closed' and e.deleted_at is null
  join public.players p on p.id = ep.player_id
  union all
  select guests.event_id, null::uuid, guests.id, guests.display_name,
    null::text, null::text, true, false
  from public.event_guests guests
  join public.events e on e.id = guests.event_id
    and e.status = 'closed' and e.deleted_at is null
), attempt_stats as (
  select a.event_id, a.player_id, a.guest_id,
    count(*)::integer attempt_count,
    count(*) filter (where not a.is_dnf and not a.is_ak
      and a.time_hundredths is not null)::integer valid_attempts,
    count(*) filter (where a.is_dnf and not a.is_ak)::integer dnf_count,
    min(a.time_hundredths) filter (where not a.is_dnf and not a.is_ak)
      best_time_hundredths,
    round(avg(a.time_hundredths) filter (where not a.is_dnf and not a.is_ak))::integer
      average_hundredths
  from public.attempts a
  where a.status = 'approved' and a.deleted_at is null
  group by a.event_id, a.player_id, a.guest_id
), first_bests as (
  select a.event_id, a.player_id, a.guest_id, min(a.submitted_at) first_best_at
  from public.attempts a
  join attempt_stats stats
    on stats.event_id = a.event_id
    and stats.player_id is not distinct from a.player_id
    and stats.guest_id is not distinct from a.guest_id
    and stats.best_time_hundredths = a.time_hundredths
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak
  group by a.event_id, a.player_id, a.guest_id
), eligible as (
  select participants.*, coalesce(stats.attempt_count, 0) attempt_count,
    coalesce(stats.valid_attempts, 0) valid_attempts,
    coalesce(stats.dnf_count, 0) dnf_count,
    case when not participants.is_ak then stats.best_time_hundredths end
      best_time_hundredths,
    case when not participants.is_ak then stats.average_hundredths end
      average_hundredths,
    case when not participants.is_ak then first_bests.first_best_at end first_best_at
  from participants
  left join attempt_stats stats
    on stats.event_id = participants.event_id
    and stats.player_id is not distinct from participants.player_id
    and stats.guest_id is not distinct from participants.guest_id
  left join first_bests
    on first_bests.event_id = participants.event_id
    and first_bests.player_id is not distinct from participants.player_id
    and first_bests.guest_id is not distinct from participants.guest_id
), ranked_valid as (
  select eligible.*,
    rank() over (
      partition by eligible.event_id
      order by eligible.best_time_hundredths
    )::integer rank
  from eligible
  where eligible.best_time_hundredths is not null
)
select eligible.event_id, eligible.player_id, eligible.guest_id,
  eligible.display_name, eligible.avatar_url, eligible.avatar_path,
  eligible.is_guest, eligible.is_ak, eligible.attempt_count,
  eligible.valid_attempts, eligible.dnf_count,
  eligible.best_time_hundredths, eligible.average_hundredths,
  eligible.first_best_at, ranked_valid.rank
from eligible
left join ranked_valid
  on ranked_valid.event_id = eligible.event_id
  and ranked_valid.player_id is not distinct from eligible.player_id
  and ranked_valid.guest_id is not distinct from eligible.guest_id;

grant select on public.event_final_standings to anon, authenticated;

create or replace view public.event_podium
with (security_invoker = true)
as
select standings.event_id, standings.player_id, standings.guest_id,
  standings.display_name, standings.avatar_url, standings.is_guest,
  standings.best_time_hundredths, standings.rank
from public.event_final_standings standings
where standings.rank between 1 and 3;

create or replace function public.sync_close_event(
  p_event_id uuid,
  p_reason text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_player uuid;
  selected_guest uuid;
begin
  with participant_bests as (
    select a.player_id, a.guest_id, min(a.time_hundredths) best_time
    from public.attempts a
    left join public.players p on p.id = a.player_id
    where a.event_id = p_event_id
      and a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
    group by a.player_id, a.guest_id
  ), winners as (
    select participant_bests.*
    from participant_bests
    where best_time = (select min(best_time) from participant_bests)
  )
  select case when count(*) = 1 then (array_agg(player_id))[1] end,
    case when count(*) = 1 then (array_agg(guest_id))[1] end
  into selected_player, selected_guest
  from winners;

  update public.events
  set status = 'closed',
      closed_at = coalesce(closed_at, now()),
      end_reason = coalesce(end_reason, case
        when p_reason in ('manual', 'automatic') then p_reason else 'manual' end),
      winner_player_id = selected_player,
      winner_guest_id = selected_guest
  where id = p_event_id;
  if not found then raise exception 'Event nicht gefunden.'; end if;
  return p_event_id;
end;
$$;

create or replace view public.public_hall_of_fame
with (security_invoker = true)
as
with valid_attempts as (
  select p.id player_id, p.display_name, p.avatar_url,
    a.time_hundredths, a.submitted_at::date achieved_date
  from public.players p
  join public.attempts a on a.player_id = p.id
  left join public.events e on e.id = a.event_id
  where not p.is_ak and not p.is_archived and not a.is_ak
    and a.status = 'approved' and not a.is_dnf
    and a.time_hundredths is not null and a.deleted_at is null
    and (a.event_id is null or e.deleted_at is null)
  union all
  select p.id, p.display_name, p.avatar_url,
    h.time_hundredths, h.attempt_date
  from public.players p join public.historical_attempts h on h.player_id = p.id
  where not p.is_ak and not p.is_archived and not h.is_guest
    and not h.out_of_competition and h.deleted_at is null
), personal_bests as (
  select player_id, display_name, avatar_url,
    min(time_hundredths) personal_best_hundredths
  from valid_attempts group by player_id, display_name, avatar_url
), ranked_players as (
  select *, rank() over (order by personal_best_hundredths)::integer rank
  from personal_bests
)
select ranked.player_id, ranked.display_name, ranked.avatar_url,
  ranked.personal_best_hundredths, min(attempts.achieved_date) record_date,
  ranked.rank
from ranked_players ranked
join valid_attempts attempts on attempts.player_id = ranked.player_id
  and attempts.time_hundredths = ranked.personal_best_hundredths
group by ranked.player_id, ranked.display_name, ranked.avatar_url,
  ranked.personal_best_hundredths, ranked.rank;

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
  select *, rank() over (
    partition by season_year order by personal_best_hundredths
  )::integer rank
  from bests
)
select ranked.season_year, ranked.player_id, ranked.display_name,
  ranked.avatar_url, ranked.avatar_path, ranked.personal_best_hundredths,
  min(attempts.record_date) record_date, ranked.rank
from ranked
join valid_attempts attempts
  on attempts.season_year = ranked.season_year
  and attempts.player_id = ranked.player_id
  and attempts.time_hundredths = ranked.personal_best_hundredths
group by ranked.season_year, ranked.player_id, ranked.display_name,
  ranked.avatar_url, ranked.avatar_path, ranked.personal_best_hundredths,
  ranked.rank;

create or replace function public.get_player_season_profile(
  p_player_id uuid,
  p_season_year integer
)
returns table (
  player_id uuid, personal_best_hundredths integer, season_rank integer,
  average_hundredths integer, event_participations integer,
  event_wins integer, second_places integer, third_places integer,
  valid_attempts integer, dnf_count integer
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
    join public.players player on player.id = a.player_id
    where a.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and a.status = 'approved' and a.deleted_at is null and not a.is_ak
      and not player.is_ak and not player.is_archived
  ), target_pb as (
    select min(time_hundredths) personal_best_hundredths
    from (
      select a.time_hundredths
      from public.attempts a
      join public.events e on e.id = a.event_id and e.deleted_at is null
      join public.players player on player.id = a.player_id
      where a.player_id = p_player_id
        and extract(year from e.start_date)::integer = p_season_year
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
        and not player.is_ak and not player.is_archived
      union all
      select historical.time_hundredths
      from public.historical_attempts historical
      join public.players player on player.id = historical.player_id
      where historical.player_id = p_player_id
        and extract(year from historical.attempt_date)::integer = p_season_year
        and historical.deleted_at is null and not historical.is_guest
        and not historical.out_of_competition
        and not player.is_ak and not player.is_archived
    ) qualified_times
  ), target_participation as (
    select count(distinct participants.event_id)::integer event_participations
    from public.event_participants participants
    join public.events e on e.id = participants.event_id and e.deleted_at is null
    join public.players player on player.id = participants.player_id
    where participants.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and not player.is_ak and not player.is_archived
  ), target_wins as (
    select count(distinct winners.event_id)::integer event_wins
    from public.event_winners winners
    join public.events e on e.id = winners.event_id and e.deleted_at is null
    where winners.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
  ), target_podium as (
    select count(distinct podium.event_id) filter (where podium.rank = 2)::integer second_places,
      count(distinct podium.event_id) filter (where podium.rank = 3)::integer third_places
    from public.qualified_event_podium podium
    join public.events e on e.id = podium.event_id and e.deleted_at is null
    where podium.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
  ), season_bests as (
    select player_id, min(time_hundredths) personal_best_hundredths
    from (
      select a.player_id, a.time_hundredths
      from public.attempts a
      join public.events e on e.id = a.event_id and e.deleted_at is null
      join public.players player on player.id = a.player_id
      where extract(year from e.start_date)::integer = p_season_year
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
        and not player.is_ak and not player.is_archived
      union all
      select historical.player_id, historical.time_hundredths
      from public.historical_attempts historical
      join public.players player on player.id = historical.player_id
      where extract(year from historical.attempt_date)::integer = p_season_year
        and historical.deleted_at is null and not historical.is_guest
        and not historical.out_of_competition
        and not player.is_ak and not player.is_archived
    ) qualified_times
    group by player_id
  ), ranked_bests as (
    select player_id,
      rank() over (order by personal_best_hundredths)::integer rank
    from season_bests
  )
  select player.id, pb.personal_best_hundredths, ranks.rank,
    attempts.average_hundredths,
    coalesce(participation.event_participations, 0),
    coalesce(wins.event_wins, 0), coalesce(podium.second_places, 0),
    coalesce(podium.third_places, 0), coalesce(attempts.valid_attempts, 0),
    coalesce(attempts.dnf_count, 0)
  from public.players player
  cross join target_attempt_stats attempts
  cross join target_pb pb
  cross join target_participation participation
  cross join target_wins wins
  cross join target_podium podium
  left join ranked_bests ranks on ranks.player_id = player.id
  where player.id = p_player_id and not player.is_archived
    and p_season_year >= 2026;
$$;

-- Re-evaluate existing placement awards through the canonical ledger after
-- final-only rankings replace the former live podium projection.
select public.sync_all_player_badge_award_ledgers();
