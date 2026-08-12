-- PR 9C.1: normal-event medals require three qualified regular players.

create view public.qualified_event_players
with (security_invoker = true)
as
select a.event_id, a.player_id
from public.attempts a
join public.events e on e.id = a.event_id and e.deleted_at is null
join public.players p on p.id = a.player_id
where a.status = 'approved' and a.deleted_at is null
  and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
  and not p.is_ak and not p.is_archived
group by a.event_id, a.player_id;

create view public.qualified_events
with (security_invoker = true)
as
select qep.event_id
from public.qualified_event_players qep
join public.events e on e.id = qep.event_id
where not e.awards_trophies
group by qep.event_id
having count(*) >= 3;

create view public.qualified_event_podium
with (security_invoker = true)
as
select ep.*
from public.event_podium ep
join public.qualified_events qe on qe.event_id = ep.event_id;

create or replace view public.event_winners
with (security_invoker = true)
as
select
  ep.event_id,
  ep.player_id,
  ep.display_name,
  ep.best_time_hundredths winning_time_hundredths,
  ep.guest_id,
  ep.is_guest
from public.event_podium ep
where ep.rank = 1;

create or replace view public.player_statistics
with (security_invoker = true)
as
with event_stats as (
  select a.player_id,
    count(a.id) approved_attempts,
    count(a.id) filter (where not a.is_dnf) valid_attempts,
    count(a.id) filter (where a.is_dnf) dnf_count,
    round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
  group by a.player_id
), official_bests as (
  select a.player_id, a.time_hundredths
  from public.attempts a
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_ak and not a.is_dnf and a.player_id is not null
    and (a.event_id is null or e.deleted_at is null)
  union all
  select h.player_id, h.time_hundredths
  from public.historical_attempts h
  where h.deleted_at is null and not h.is_guest
    and not h.out_of_competition and h.player_id is not null
), bests as (
  select player_id, min(time_hundredths) personal_best_hundredths
  from official_bests group by player_id
)
select p.id player_id, b.personal_best_hundredths,
  coalesce(es.approved_attempts, 0) approved_attempts,
  coalesce(es.valid_attempts, 0) valid_attempts,
  coalesce(es.dnf_count, 0) dnf_count,
  es.average_hundredths,
  (select count(distinct ew.event_id) from public.event_winners ew
    where ew.player_id = p.id) event_wins,
  (select count(*) from public.event_participants ep
    where ep.player_id = p.id) event_participations,
  (select count(*) from public.qualified_event_podium ep
    where ep.player_id = p.id and ep.rank = 2) second_places,
  (select count(*) from public.qualified_event_podium ep
    where ep.player_id = p.id and ep.rank = 3) third_places
from public.players p
left join event_stats es on es.player_id = p.id
left join bests b on b.player_id = p.id
where not p.is_archived;

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
  from public.qualified_event_podium ep
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
    join public.players qp on qp.id = a.player_id
    where a.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and a.status = 'approved' and a.deleted_at is null and not a.is_ak
      and not qp.is_ak and not qp.is_archived
  ), target_pb as (
    select min(time_hundredths) personal_best_hundredths
    from (
      select a.time_hundredths
      from public.attempts a
      join public.events e on e.id = a.event_id and e.deleted_at is null
      join public.players qp on qp.id = a.player_id
      where a.player_id = p_player_id
        and extract(year from e.start_date)::integer = p_season_year
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
        and not qp.is_ak and not qp.is_archived
      union all
      select h.time_hundredths
      from public.historical_attempts h
      join public.players qp on qp.id = h.player_id
      where h.player_id = p_player_id
        and extract(year from h.attempt_date)::integer = p_season_year
        and h.deleted_at is null and not h.is_guest and not h.out_of_competition
        and not qp.is_ak and not qp.is_archived
    ) qualified_times
  ), target_participation as (
    select count(distinct ep.event_id)::integer event_participations
    from public.event_participants ep
    join public.events e on e.id = ep.event_id and e.deleted_at is null
    join public.players qp on qp.id = ep.player_id
    where ep.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and not qp.is_ak and not qp.is_archived
  ), target_podium as (
    select count(distinct ep.event_id) filter (where ep.rank = 1)::integer event_wins,
      count(distinct ep.event_id) filter (where ep.rank = 2)::integer second_places,
      count(distinct ep.event_id) filter (where ep.rank = 3)::integer third_places
    from public.qualified_event_podium ep
    join public.events e on e.id = ep.event_id and e.deleted_at is null
    where ep.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
  ), season_bests as (
    select player_id, min(time_hundredths) personal_best_hundredths
    from (
      select a.player_id, a.time_hundredths
      from public.attempts a
      join public.events e on e.id = a.event_id and e.deleted_at is null
      join public.players qp on qp.id = a.player_id
      where extract(year from e.start_date)::integer = p_season_year
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
        and not qp.is_ak and not qp.is_archived
      union all
      select h.player_id, h.time_hundredths
      from public.historical_attempts h
      join public.players qp on qp.id = h.player_id
      where extract(year from h.attempt_date)::integer = p_season_year
        and h.deleted_at is null and not h.is_guest and not h.out_of_competition
        and not qp.is_ak and not qp.is_archived
    ) qualified_times
    group by player_id
  ), ranked_bests as (
    select player_id, dense_rank() over (order by personal_best_hundredths)::integer rank
    from season_bests
  )
  select p.id, pb.personal_best_hundredths, ranks.rank,
    attempts.average_hundredths,
    coalesce(participation.event_participations, 0),
    coalesce(podium.event_wins, 0), coalesce(podium.second_places, 0),
    coalesce(podium.third_places, 0), coalesce(attempts.valid_attempts, 0),
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

-- Only normal podium badge milestones use the medal-qualified foundation.
create or replace view public.player_badge_awards
with (security_invoker = true)
as
with recursive
valid_player_times as (
  select * from public.qualified_official_times
  where player_id is not null and not is_guest
), numbered_valid as (
  select v.*,
    row_number() over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    )::integer valid_sequence
  from valid_player_times v
), qualified_player_attempts as (
  select
    a.id source_id,
    a.player_id,
    a.event_id,
    a.time_hundredths,
    a.is_dnf,
    a.submitted_at occurred_at,
    row_number() over (
      partition by a.player_id
      order by a.submitted_at, a.id
    )::integer player_sequence
  from public.attempts a
  left join public.events e on e.id = a.event_id
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_ak
    and not p.is_ak
    and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
), qualified_event_attempts as (
  select q.*,
    row_number() over (
      partition by q.player_id, q.event_id
      order by q.occurred_at, q.source_id
    )::integer event_sequence
  from qualified_player_attempts q
  where q.event_id is not null
), participated_events as (
  select
    ep.player_id,
    ep.event_id,
    e.start_date,
    coalesce(e.closed_at, e.ends_at) occurred_at,
    exists (
      select 1 from public.event_winners ew
      where ew.event_id = ep.event_id and ew.player_id = ep.player_id
    ) did_win
  from public.event_participants ep
  join public.events e on e.id = ep.event_id
  join public.players p on p.id = ep.player_id
  where e.status = 'closed' and e.deleted_at is null
    and not p.is_ak and not p.is_archived
), ranked_participations as (
  select pe.*,
    row_number() over (
      partition by player_id order by occurred_at, event_id
    )::integer participation_sequence
  from participated_events pe
), ranked_wins as (
  select pe.*,
    row_number() over (
      partition by player_id order by occurred_at, event_id
    )::integer win_sequence
  from participated_events pe where did_win
), win_streak_grouped as (
  select pe.*,
    sum(case when did_win then 0 else 1 end) over (
      partition by player_id order by occurred_at, event_id
      rows between unbounded preceding and current row
    ) streak_group
  from participated_events pe
), win_streaks as (
  select w.*,
    row_number() over (
      partition by player_id, streak_group order by occurred_at, event_id
    )::integer streak_length
  from win_streak_grouped w where did_win
), sub3_groups as (
  select q.*,
    sum(case when is_dnf or time_hundredths is null or time_hundredths >= 300
      then 1 else 0 end) over (
      partition by player_id, event_id order by occurred_at, source_id
      rows between unbounded preceding and current row
    ) streak_group
  from qualified_player_attempts q
), sub3_streaks as (
  select s.*,
    row_number() over (
      partition by player_id, event_id, streak_group order by occurred_at, source_id
    )::integer streak_length
  from sub3_groups s
  where not is_dnf and time_hundredths is not null and time_hundredths < 300
), flawless_groups as (
  select q.*,
    sum(case when is_dnf then 1 else 0 end) over (
      partition by player_id order by occurred_at, source_id
      rows between unbounded preceding and current row
    ) streak_group
  from qualified_event_attempts q
), flawless_streaks as (
  select f.*,
    row_number() over (
      partition by player_id, streak_group order by occurred_at, source_id
    )::integer streak_length
  from flawless_groups f where not is_dnf
), favorite_occurrences as (
  select v.*,
    row_number() over (
      partition by player_id, time_hundredths
      order by occurred_at, source_priority, source_order, source_id
    )::integer occurrence_sequence,
    count(*) over (
      partition by player_id, time_hundredths
    )::integer total_occurrences
  from valid_player_times v
), favorite_candidates as (
  select
    f.*,
    bd.badge_key,
    bd.threshold,
    row_number() over (
      partition by f.player_id, bd.badge_key
      order by f.total_occurrences desc, f.occurred_at,
        f.source_priority, f.source_order, f.source_id, f.time_hundredths
    ) favorite_position
  from favorite_occurrences f
  join public.badge_definitions bd
    on bd.category = 'favorite_time'
    and bd.is_active
    and f.occurrence_sequence = bd.threshold
    and f.total_occurrences >= bd.threshold
), active_year_first as (
  select distinct on (player_id, extract(year from start_date))
    player_id,
    extract(year from start_date)::integer active_year,
    event_id,
    occurred_at
  from participated_events
  order by player_id, extract(year from start_date), occurred_at, event_id
), active_years as (
  select a.*,
    row_number() over (
      partition by player_id order by active_year, occurred_at, event_id
    )::integer active_year_count
  from active_year_first a
), event_people as (
  select ep.event_id, concat('player:', ep.player_id) person_key,
    ep.player_id, null::uuid guest_id
  from public.event_participants ep
  join public.events e on e.id = ep.event_id
  join public.players p on p.id = ep.player_id
  where e.status = 'closed' and e.deleted_at is null
    and not p.is_ak and not p.is_archived
  union all
  select eg.event_id, concat('guest:', eg.normalized_name), null::uuid, eg.id
  from public.event_guests eg
  join public.events e on e.id = eg.event_id
  where e.status = 'closed' and e.deleted_at is null
), first_encounters as (
  select distinct on (owner.player_id, other.person_key)
    owner.player_id,
    other.person_key,
    owner.event_id,
    pe.occurred_at
  from event_people owner
  join event_people other on other.event_id = owner.event_id
    and other.person_key <> owner.person_key
  join participated_events pe
    on pe.event_id = owner.event_id and pe.player_id = owner.player_id
  where owner.player_id is not null
  order by owner.player_id, other.person_key, pe.occurred_at, owner.event_id
), community_progress as (
  select f.*,
    row_number() over (
      partition by player_id order by occurred_at, event_id, person_key
    )::integer person_count
  from first_encounters f
), podium_entries as (
  select
    ep.player_id,
    ep.event_id,
    ep.rank,
    coalesce(e.closed_at, e.ends_at) occurred_at,
    row_number() over (
      partition by ep.player_id
      order by coalesce(e.closed_at, e.ends_at), ep.event_id, ep.rank
    )::integer podium_count
  from public.qualified_event_podium ep
  join public.events e on e.id = ep.event_id
  join public.players p on p.id = ep.player_id
  where ep.player_id is not null and ep.rank between 1 and 3
    and e.status = 'closed' and e.deleted_at is null
    and not p.is_ak and not p.is_archived
), precision_ranked as (
  select pe.*,
    row_number() over (
      partition by player_id order by qualified_at, event_id
    )::integer precision_count
  from public.precision_events pe where qualifies
), sequence_sources as (
  select
    q.source_id,
    q.player_id,
    q.event_id,
    q.time_hundredths,
    q.is_dnf,
    q.occurred_at,
    2::integer source_priority,
    q.player_sequence source_order,
    'attempt'::text source_type
  from qualified_player_attempts q
  union all
  select
    h.id,
    h.player_id,
    null::uuid,
    h.time_hundredths,
    false,
    h.attempt_date::timestamp at time zone 'Europe/Berlin',
    1::integer,
    h.sort_order,
    'historical_attempt'::text
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
), sequenced_history as (
  select s.*,
    lag(time_hundredths) over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) previous_time_hundredths,
    lag(is_dnf) over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) previous_is_dnf
  from sequence_sources s
), attempt_awards as (
  select
    concat(n.player_id, ':', bd.badge_key) award_key,
    n.player_id,
    bd.badge_key,
    n.source_type,
    case when n.source_type = 'attempt' then n.source_id else null::uuid end source_attempt_id,
    case when n.source_type = 'historical_attempt' then n.source_id else null::uuid end source_historical_attempt_id,
    n.event_id source_event_id,
    n.occurred_at awarded_at,
    jsonb_build_object('progress', n.valid_sequence) metadata
  from numbered_valid n
  join public.badge_definitions bd
    on bd.category = 'attempts' and bd.is_active and bd.threshold = n.valid_sequence
), performance_candidates as (
  select n.*, bd.badge_key,
    row_number() over (
      partition by n.player_id, bd.badge_key
      order by n.occurred_at, n.source_priority, n.source_order, n.source_id
    ) match_sequence
  from numbered_valid n
  join public.badge_definitions bd
    on bd.category = 'performance' and bd.badge_kind = 'tiered'
    and bd.is_active and n.time_hundredths < bd.threshold
), performance_awards as (
  select
    concat(player_id, ':', badge_key), player_id, badge_key, source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at,
    jsonb_build_object('timeHundredths', time_hundredths,
      'progress', time_hundredths)
  from performance_candidates where match_sequence = 1
), win_awards as (
  select
    concat(r.player_id, ':', bd.badge_key), r.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, r.event_id, r.occurred_at,
    jsonb_build_object('progress', r.win_sequence)
  from ranked_wins r
  join public.badge_definitions bd
    on bd.category = 'wins' and bd.badge_kind = 'tiered'
    and bd.is_active and bd.threshold = r.win_sequence
), win_streak_awards as (
  select
    concat(w.player_id, ':', bd.badge_key), w.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, w.event_id, w.occurred_at,
    jsonb_build_object('progress', w.streak_length)
  from win_streaks w
  join public.badge_definitions bd
    on bd.category = 'win_streak' and bd.is_active
    and bd.threshold = w.streak_length
), sub3_awards as (
  select
    concat(s.player_id, ':', bd.badge_key), s.player_id, bd.badge_key,
    'attempt'::text, s.source_id, null::uuid, s.event_id, s.occurred_at,
    jsonb_build_object('progress', s.streak_length, 'scope', 'event')
  from sub3_streaks s
  join public.badge_definitions bd
    on bd.category = 'sub3_streak' and bd.is_active
    and bd.threshold = s.streak_length
), flawless_awards as (
  select
    concat(f.player_id, ':', bd.badge_key), f.player_id, bd.badge_key,
    'attempt'::text, f.source_id, null::uuid, f.event_id, f.occurred_at,
    jsonb_build_object('progress', f.streak_length)
  from flawless_streaks f
  join public.badge_definitions bd
    on bd.category = 'flawless' and bd.is_active
    and bd.threshold = f.streak_length
), favorite_awards as (
  select
    concat(f.player_id, ':', f.badge_key), f.player_id, f.badge_key,
    f.source_type,
    case when f.source_type = 'attempt' then f.source_id else null::uuid end,
    case when f.source_type = 'historical_attempt' then f.source_id else null::uuid end,
    f.event_id, f.occurred_at,
    jsonb_build_object('timeHundredths', f.time_hundredths,
      'progress', f.total_occurrences)
  from favorite_candidates f where favorite_position = 1
), activity_awards as (
  select
    concat(a.player_id, ':', bd.badge_key), a.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, a.event_id, a.occurred_at,
    jsonb_build_object('progress', a.active_year_count, 'year', a.active_year)
  from active_years a
  join public.badge_definitions bd
    on bd.category = 'activity' and bd.is_active
    and bd.threshold = a.active_year_count
), community_awards as (
  select
    concat(c.player_id, ':', bd.badge_key), c.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, c.event_id, c.occurred_at,
    jsonb_build_object('progress', c.person_count)
  from community_progress c
  join public.badge_definitions bd
    on bd.category = 'community' and bd.is_active
    and bd.threshold = c.person_count
), participation_awards as (
  select
    concat(r.player_id, ':', bd.badge_key), r.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, r.event_id, r.occurred_at,
    jsonb_build_object('progress', r.participation_sequence)
  from ranked_participations r
  join public.badge_definitions bd
    on bd.category = 'events' and bd.is_active
    and bd.threshold = r.participation_sequence
), podium_awards as (
  select
    concat(p.player_id, ':', bd.badge_key), p.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, p.event_id, p.occurred_at,
    jsonb_build_object('progress', p.podium_count, 'rank', p.rank)
  from podium_entries p
  join public.badge_definitions bd
    on bd.category = 'podiums' and bd.is_active
    and bd.threshold = p.podium_count
), precision_awards as (
  select
    concat(p.player_id, ':', bd.badge_key), p.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, p.event_id, p.qualified_at,
    jsonb_build_object('progress', p.precision_count,
      'standardDeviationHundredths', p.standard_deviation_hundredths,
      'validAttempts', p.valid_attempts)
  from precision_ranked p
  join public.badge_definitions bd
    on bd.category = 'precision' and bd.is_active
    and bd.threshold = p.precision_count
), bingo_awards as (
  select
    concat(b.player_id, ':', bd.badge_key), b.player_id, bd.badge_key,
    'bingo'::text, null::uuid, null::uuid, null::uuid,
    case bd.tier
      when 'gold' then b.gold_badge_achieved_at
      when 'silver' then b.silver_badge_achieved_at
      else b.bronze_badge_achieved_at
    end,
    jsonb_build_object(
      'progress', case bd.tier
        when 'gold' then b.gold_lines
        when 'silver' then b.silver_lines
        else b.bronze_lines end,
      'bronzeLines', b.bronze_lines,
      'silverLines', b.silver_lines,
      'goldLines', b.gold_lines,
      'lineCountsAreCumulative', true
    )
  from public.player_bingo_statistics b
  join public.badge_definitions bd
    on bd.category = 'bingo' and bd.is_active
    and ((bd.tier = 'bronze' and b.bronze_lines > 0)
      or (bd.tier = 'silver' and b.silver_lines > 0)
      or (bd.tier = 'gold' and b.gold_lines > 0))
), first_valid_awards as (
  select
    concat(n.player_id, ':first-official-attempt'), n.player_id,
    'first-official-attempt'::text, n.source_type,
    case when n.source_type = 'attempt' then n.source_id else null::uuid end,
    case when n.source_type = 'historical_attempt' then n.source_id else null::uuid end,
    n.event_id, n.occurred_at,
    jsonb_build_object('progress', 1, 'timeHundredths', n.time_hundredths)
  from numbered_valid n where n.valid_sequence = 1
), time_stopper_ranked as (
  select v.*,
    row_number() over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) match_sequence
  from valid_player_times v where mod(time_hundredths, 100) = 0
), time_stopper_awards as (
  select
    concat(player_id, ':time-stopper'), player_id, 'time-stopper'::text,
    source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at, jsonb_build_object('timeHundredths', time_hundredths)
  from time_stopper_ranked where match_sequence = 1
), false_starter_ranked as (
  select q.*,
    row_number() over (
      partition by player_id order by occurred_at, source_id
    ) dnf_sequence
  from qualified_player_attempts q where is_dnf
), false_starter_awards as (
  select
    concat(player_id, ':false-starter'), player_id, 'false-starter'::text,
    'attempt'::text, source_id, null::uuid, event_id, occurred_at,
    jsonb_build_object('progress', dnf_sequence)
  from false_starter_ranked where dnf_sequence = 10
), first_win_awards as (
  select
    concat(player_id, ':first-win'), player_id, 'first-win'::text,
    'event'::text, null::uuid, null::uuid, event_id, occurred_at,
    jsonb_build_object('progress', 1)
  from ranked_wins where win_sequence = 1
), glitch_ranked as (
  select s.*,
    row_number() over (
      partition by player_id order by occurred_at, source_priority, source_order, source_id
    ) glitch_sequence
  from sequenced_history s
  where not is_dnf and time_hundredths is not null
    and not coalesce(previous_is_dnf, false)
    and previous_time_hundredths = time_hundredths
), glitch_awards as (
  select
    concat(player_id, ':matrix-glitch'), player_id, 'matrix-glitch'::text,
    source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at, jsonb_build_object('timeHundredths', time_hundredths)
  from glitch_ranked where glitch_sequence = 1
), almost_ranked as (
  select v.*,
    row_number() over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) match_sequence
  from valid_player_times v where mod(time_hundredths, 100) = 1
), almost_awards as (
  select
    concat(player_id, ':almost'), player_id, 'almost'::text, source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at, jsonb_build_object('timeHundredths', time_hundredths)
  from almost_ranked where match_sequence = 1
), first_world_records as (
  select wr.*,
    row_number() over (
      partition by player_id
      order by achieved_at, source_priority, source_order, attempt_id
    ) record_sequence
  from public.world_record_progression wr
), world_record_awards as (
  select
    concat(player_id, ':official-world-record'), player_id,
    'official-world-record'::text, source_type,
    case when source_type = 'attempt' then attempt_id else null::uuid end,
    case when source_type = 'historical_attempt' then attempt_id else null::uuid end,
    event_id, achieved_at, jsonb_build_object('timeHundredths', time_hundredths)
  from first_world_records where record_sequence = 1
), all_awards as (
  select * from attempt_awards
  union all select * from performance_awards
  union all select * from win_awards
  union all select * from win_streak_awards
  union all select * from sub3_awards
  union all select * from flawless_awards
  union all select * from favorite_awards
  union all select * from activity_awards
  union all select * from community_awards
  union all select * from participation_awards
  union all select * from podium_awards
  union all select * from precision_awards
  union all select * from bingo_awards
  union all select * from first_valid_awards
  union all select * from time_stopper_awards
  union all select * from false_starter_awards
  union all select * from first_win_awards
  union all select * from glitch_awards
  union all select * from almost_awards
  union all select * from world_record_awards
)
select
  award_key,
  player_id,
  badge_key,
  source_type,
  source_attempt_id,
  source_historical_attempt_id,
  source_event_id,
  awarded_at,
  metadata
from all_awards;

grant select on public.qualified_event_players, public.qualified_events,
  public.qualified_event_podium to anon, authenticated;
