create or replace view public.event_winners
with (security_invoker = true)
as
with event_bests as (
  select a.event_id, a.player_id, p.display_name,
    min(a.time_hundredths) player_best
  from public.attempts a
  join public.players p on p.id = a.player_id
  where a.event_id is not null
    and a.status = 'approved' and not a.is_dnf
    and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
  group by a.event_id, a.player_id, p.display_name
),
winning_times as (
  select event_id, min(player_best) winning_time
  from event_bests group by event_id
)
select eb.event_id, eb.player_id, eb.display_name,
  eb.player_best winning_time_hundredths
from event_bests eb
join winning_times wt on wt.event_id = eb.event_id
  and wt.winning_time = eb.player_best;

create or replace view public.event_statistics
with (security_invoker = true)
as
select e.id event_id,
  count(distinct ep.player_id) participant_count,
  count(distinct a.id) filter (
    where not a.is_dnf and not a.is_ak and not p.is_ak
  ) valid_attempts,
  count(distinct a.id) filter (
    where a.is_dnf and not a.is_ak and not p.is_ak
  ) dnf_count,
  min(a.time_hundredths) filter (
    where not a.is_dnf and not a.is_ak and not p.is_ak
  ) fastest_hundredths,
  round(avg(a.time_hundredths) filter (
    where not a.is_dnf and not a.is_ak and not p.is_ak
  ))::integer average_hundredths
from public.events e
left join public.event_participants ep on ep.event_id = e.id
left join public.attempts a on a.event_id = e.id
  and a.status = 'approved' and a.deleted_at is null
left join public.players p on p.id = a.player_id and not p.is_archived
group by e.id;

create or replace view public.global_statistics
with (security_invoker = true)
as
select
  (select count(*) from public.players
    where not is_ak and not is_archived) regular_players,
  (select count(*) from public.events) event_count,
  count(a.id) approved_attempts,
  count(a.id) filter (where not a.is_dnf) valid_attempts,
  count(a.id) filter (where a.is_dnf) dnf_count,
  min(a.time_hundredths) filter (where not a.is_dnf) world_record_hundredths,
  round(avg(a.time_hundredths) filter (
    where not a.is_dnf
  ))::integer average_hundredths
from public.attempts a
join public.players p on p.id = a.player_id
where a.status = 'approved' and a.deleted_at is null
  and not a.is_ak and not p.is_ak and not p.is_archived;

grant select on public.event_winners, public.event_statistics,
  public.global_statistics to anon, authenticated;
