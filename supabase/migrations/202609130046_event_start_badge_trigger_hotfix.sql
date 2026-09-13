-- Active event participants cannot have earned event-derived badge changes yet.
-- Defer their ledger refresh to attempt writes or the existing event-close refresh
-- instead of repeatedly expanding the award source while an event is being built.
create or replace function public.refresh_badge_ledger_after_participant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_id uuid;
  requested_event_id uuid;
begin
  if tg_op = 'INSERT' and exists (
    select 1
    from public.events events
    where events.id = new.event_id
      and events.status = 'active'
      and events.deleted_at is null
  ) then
    return new;
  end if;

  requested_event_id := case
    when tg_op = 'DELETE' then old.event_id
    else new.event_id
  end;

  for requested_player_id in
    select participants.player_id
    from public.event_participants participants
    where participants.event_id = requested_event_id
    union
    select attempts.player_id
    from public.attempts attempts
    where attempts.event_id = requested_event_id
      and attempts.player_id is not null
    union
    select old.player_id
    where tg_op in ('DELETE', 'UPDATE')
      and old.player_id is not null
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
  end loop;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.refresh_badge_ledger_after_participant_change()
  from public, anon, authenticated;
