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
  selected_winner uuid;
begin
  select a.player_id into selected_winner
  from public.attempts a
  join public.players p on p.id = a.player_id
  where a.event_id = p_event_id
    and a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and not p.is_ak and not p.is_archived
  order by a.time_hundredths, a.submitted_at, a.id
  limit 1;

  update public.events
  set status = 'closed',
      closed_at = coalesce(closed_at, now()),
      end_reason = coalesce(end_reason, case
        when p_reason in ('manual', 'automatic') then p_reason else 'manual' end),
      winner_player_id = coalesce(winner_player_id, selected_winner)
  where id = p_event_id;
  if not found then raise exception 'Event nicht gefunden.'; end if;
  return p_event_id;
end;
$$;

create or replace function public.sync_close_expired_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row record;
  closed_count integer := 0;
begin
  for event_row in
    select id from public.events where status = 'active' and ends_at <= now()
  loop
    perform public.sync_close_event(event_row.id, 'automatic');
    closed_count := closed_count + 1;
  end loop;
  return closed_count;
end;
$$;

revoke all on function public.sync_upsert_player(text, boolean, text) from public;
revoke all on function public.sync_start_event(text, date, uuid[], timestamptz, timestamptz, text) from public;
revoke all on function public.sync_import_closed_event(text, date, timestamptz, timestamptz, timestamptz, text, uuid[], text) from public;
revoke all on function public.sync_create_attempt(uuid, uuid, uuid, integer, boolean, boolean, timestamptz, text, text) from public;
revoke all on function public.sync_update_attempt(uuid, uuid, integer, boolean, boolean, timestamptz, text) from public;
revoke all on function public.sync_delete_attempt(uuid) from public;
revoke all on function public.sync_update_player(uuid, text, boolean, text) from public;
revoke all on function public.sync_update_event(uuid, text, date) from public;
revoke all on function public.sync_close_event(uuid, text) from public;
revoke all on function public.sync_close_expired_events() from public;

grant execute on function public.sync_upsert_player(text, boolean, text) to anon, authenticated;
grant execute on function public.sync_start_event(text, date, uuid[], timestamptz, timestamptz, text) to anon, authenticated;
grant execute on function public.sync_import_closed_event(text, date, timestamptz, timestamptz, timestamptz, text, uuid[], text) to anon, authenticated;
grant execute on function public.sync_create_attempt(uuid, uuid, uuid, integer, boolean, boolean, timestamptz, text, text) to anon, authenticated;
grant execute on function public.sync_update_attempt(uuid, uuid, integer, boolean, boolean, timestamptz, text) to anon, authenticated;
grant execute on function public.sync_delete_attempt(uuid) to anon, authenticated;
grant execute on function public.sync_update_player(uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.sync_update_event(uuid, text, date) to anon, authenticated;
grant execute on function public.sync_close_event(uuid, text) to anon, authenticated;
grant execute on function public.sync_close_expired_events() to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.players;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.attempts;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.event_participants;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$$;

create or replace view public.public_hall_of_fame
with (security_invoker = true)
as
with valid_attempts as (
  select p.id player_id, p.display_name, p.avatar_url,
    a.time_hundredths, a.submitted_at
  from public.players p
  join public.attempts a on a.player_id = p.id
  where not p.is_ak and not p.is_archived and not a.is_ak
    and a.status = 'approved' and not a.is_dnf
    and a.time_hundredths is not null and a.deleted_at is null
),
personal_bests as (
  select player_id, display_name, avatar_url,
    min(time_hundredths) personal_best_hundredths
  from valid_attempts group by player_id, display_name, avatar_url
),
ranked_players as (
  select *, dense_rank() over (order by personal_best_hundredths)::integer rank
  from personal_bests
)
select rp.player_id, rp.display_name, rp.avatar_url,
  rp.personal_best_hundredths, min(va.submitted_at::date) record_date, rp.rank
from ranked_players rp
join valid_attempts va on va.player_id = rp.player_id
  and va.time_hundredths = rp.personal_best_hundredths
group by rp.player_id, rp.display_name, rp.avatar_url,
  rp.personal_best_hundredths, rp.rank;

create or replace view public.player_statistics
with (security_invoker = true)
as
select p.id player_id,
  min(a.time_hundredths) filter (where not a.is_dnf) personal_best_hundredths,
  count(a.id) approved_attempts,
  count(a.id) filter (where not a.is_dnf) valid_attempts,
  count(a.id) filter (where a.is_dnf) dnf_count,
  round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths,
  (select count(distinct ew.event_id) from public.event_winners ew
    where ew.player_id = p.id) event_wins
from public.players p
left join public.attempts a on a.player_id = p.id
  and a.status = 'approved' and a.deleted_at is null and not a.is_ak
where not p.is_archived
group by p.id;

create or replace view public.world_record_progression
with (security_invoker = true)
as
with ordered_attempts as (
  select a.id attempt_id, a.player_id, p.display_name,
    a.time_hundredths, a.submitted_at achieved_at, a.event_id,
    min(a.time_hundredths) over (
      order by a.submitted_at, a.id
      rows between unbounded preceding and 1 preceding
    ) previous_record
  from public.attempts a
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and not a.is_dnf
    and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
)
select attempt_id, player_id, display_name, time_hundredths, achieved_at, event_id
from ordered_attempts
where previous_record is null or time_hundredths < previous_record;

grant select on public.public_hall_of_fame, public.player_statistics,
  public.world_record_progression to anon, authenticated;
