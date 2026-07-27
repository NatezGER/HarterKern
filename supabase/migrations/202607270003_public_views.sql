create or replace view public.public_hall_of_fame
with (security_invoker = true)
as
with personal_bests as (
  select
    p.id as player_id,
    p.display_name,
    p.avatar_url,
    min(a.time_hundredths) as personal_best_hundredths,
    min(a.submitted_at::date) filter (
      where a.time_hundredths = (
        select min(a2.time_hundredths)
        from public.attempts a2
        where a2.player_id = p.id
          and a2.status = 'approved'
          and not a2.is_dnf
          and a2.deleted_at is null
      )
    ) as record_date
  from public.players p
  join public.attempts a on a.player_id = p.id
  where not p.is_ak
    and not p.is_archived
    and a.status = 'approved'
    and not a.is_dnf
    and a.deleted_at is null
  group by p.id
)
select
  *,
  dense_rank() over (order by personal_best_hundredths)::integer as rank
from personal_bests;

create or replace view public.event_winners
with (security_invoker = true)
as
with event_bests as (
  select
    a.event_id,
    a.player_id,
    p.display_name,
    min(a.time_hundredths) as player_best
  from public.attempts a
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and not a.is_dnf
    and a.deleted_at is null
    and not p.is_ak
    and not p.is_archived
  group by a.event_id, a.player_id, p.display_name
),
winning_times as (
  select event_id, min(player_best) as winning_time
  from event_bests
  group by event_id
)
select
  eb.event_id,
  eb.player_id,
  eb.display_name,
  eb.player_best as winning_time_hundredths
from event_bests eb
join winning_times wt
  on wt.event_id = eb.event_id and wt.winning_time = eb.player_best;

create or replace view public.player_statistics
with (security_invoker = true)
as
select
  p.id as player_id,
  min(a.time_hundredths) filter (where not a.is_dnf) as personal_best_hundredths,
  count(a.id) as approved_attempts,
  count(a.id) filter (where not a.is_dnf) as valid_attempts,
  count(a.id) filter (where a.is_dnf) as dnf_count,
  round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer as average_hundredths,
  (
    select count(distinct ew.event_id)
    from public.event_winners ew
    where ew.player_id = p.id
  ) as event_wins
from public.players p
left join public.attempts a
  on a.player_id = p.id
  and a.status = 'approved'
  and a.deleted_at is null
where not p.is_archived
group by p.id;

create or replace view public.world_record_progression
with (security_invoker = true)
as
with ordered_attempts as (
  select
    a.id as attempt_id,
    a.player_id,
    p.display_name,
    a.time_hundredths,
    a.submitted_at as achieved_at,
    a.event_id,
    min(a.time_hundredths) over (
      order by a.submitted_at, a.id
      rows between unbounded preceding and 1 preceding
    ) as previous_record
  from public.attempts a
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and not a.is_dnf
    and a.deleted_at is null
    and not p.is_ak
    and not p.is_archived
)
select attempt_id, player_id, display_name, time_hundredths, achieved_at, event_id
from ordered_attempts
where previous_record is null or time_hundredths < previous_record;

create or replace view public.event_statistics
with (security_invoker = true)
as
select
  e.id as event_id,
  count(distinct a.player_id) as participant_count,
  count(a.id) filter (where not a.is_dnf and not p.is_ak) as valid_attempts,
  count(a.id) filter (where a.is_dnf and not p.is_ak) as dnf_count,
  min(a.time_hundredths) filter (where not a.is_dnf and not p.is_ak) as fastest_hundredths,
  round(avg(a.time_hundredths) filter (
    where not a.is_dnf and not p.is_ak
  ))::integer as average_hundredths
from public.events e
left join public.attempts a
  on a.event_id = e.id
  and a.status = 'approved'
  and a.deleted_at is null
left join public.players p on p.id = a.player_id and not p.is_archived
group by e.id;

create or replace view public.global_statistics
with (security_invoker = true)
as
select
  (select count(*) from public.players where not is_ak and not is_archived) as regular_players,
  (select count(*) from public.events) as event_count,
  count(a.id) as approved_attempts,
  count(a.id) filter (where not a.is_dnf) as valid_attempts,
  count(a.id) filter (where a.is_dnf) as dnf_count,
  min(a.time_hundredths) filter (where not a.is_dnf) as world_record_hundredths,
  round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer as average_hundredths
from public.attempts a
join public.players p on p.id = a.player_id
where a.status = 'approved'
  and a.deleted_at is null
  and not p.is_ak
  and not p.is_archived;

grant select on public.players, public.events, public.attempts to anon, authenticated;
grant select on public.public_hall_of_fame, public.player_statistics,
  public.event_statistics, public.event_winners,
  public.world_record_progression, public.global_statistics
  to anon, authenticated;
