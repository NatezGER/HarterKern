-- Active-event attempt writes are the availability-critical path. Their badge
-- ledger refresh is deferred to the existing event-close trigger, which
-- synchronizes every participant after the event becomes final.
create or replace function public.refresh_badge_ledger_after_attempt_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_id uuid;
begin
  for requested_player_id in
    with refresh_sources as materialized (
      select inserted.id, inserted.event_id
      from new_attempts inserted
      left join public.events events on events.id = inserted.event_id
      where inserted.player_id is not null
        and (
          inserted.event_id is null
          or events.status <> 'active'
          or events.deleted_at is not null
        )
    )
    select distinct attempts.player_id
    from public.attempts attempts
    where attempts.player_id is not null
      and (
        attempts.id in (select sources.id from refresh_sources sources)
        or attempts.event_id in (
          select sources.event_id
          from refresh_sources sources
          where sources.event_id is not null
        )
      )
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.refresh_badge_ledger_after_attempt_insert()
  from public, anon, authenticated;
