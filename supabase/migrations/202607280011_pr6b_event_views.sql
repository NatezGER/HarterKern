-- PR 6B: guests count fully inside their event, but never in long-term views.

create or replace function public.sync_close_event(
  p_event_id uuid,
  p_reason text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare selected_player uuid; selected_guest uuid;
begin
  select ranked.player_id, ranked.guest_id
  into selected_player, selected_guest
  from (
    select a.player_id, a.guest_id, a.time_hundredths, a.submitted_at, a.id
    from public.attempts a
    left join public.players p on p.id = a.player_id
    where a.event_id = p_event_id
      and a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ) ranked
  order by ranked.time_hundredths, ranked.submitted_at, ranked.id
  limit 1;

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

create or replace view public.event_winners
with (security_invoker = true)
as
with event_bests as (
  select a.event_id, a.player_id, a.guest_id,
    coalesce(p.display_name, g.display_name) display_name,
    (a.guest_id is not null) is_guest,
    min(a.time_hundredths) player_best
  from public.attempts a
  left join public.players p on p.id = a.player_id
  left join public.event_guests g on g.id = a.guest_id
  where a.event_id is not null
    and a.status = 'approved' and not a.is_dnf
    and a.deleted_at is null and not a.is_ak
    and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  group by a.event_id, a.player_id, a.guest_id,
    coalesce(p.display_name, g.display_name), (a.guest_id is not null)
),
winning_times as (
  select event_id, min(player_best) winning_time
  from event_bests group by event_id
)
-- Keep the complete PR 6A column prefix unchanged. PostgreSQL only permits
-- CREATE OR REPLACE VIEW to append columns after the existing definition.
select eb.event_id, eb.player_id, eb.display_name,
  eb.player_best winning_time_hundredths, eb.guest_id, eb.is_guest
from event_bests eb
join winning_times wt on wt.event_id = eb.event_id
  and wt.winning_time = eb.player_best;

create or replace view public.event_statistics
with (security_invoker = true)
as
select e.id event_id,
  (
    (select count(*) from public.event_participants ep where ep.event_id = e.id)
    + (select count(*) from public.event_guests eg where eg.event_id = e.id)
  ) participant_count,
  count(a.id) filter (
    where not a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ) valid_attempts,
  count(a.id) filter (
    where a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ) dnf_count,
  min(a.time_hundredths) filter (
    where not a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ) fastest_hundredths,
  round(avg(a.time_hundredths) filter (
    where not a.is_dnf and not a.is_ak
      and (a.guest_id is not null or (not p.is_ak and not p.is_archived))
  ))::integer average_hundredths
from public.events e
left join public.attempts a on a.event_id = e.id
  and a.status = 'approved' and a.deleted_at is null
left join public.players p on p.id = a.player_id
group by e.id;

grant select on public.event_winners, public.event_statistics
  to anon, authenticated;
