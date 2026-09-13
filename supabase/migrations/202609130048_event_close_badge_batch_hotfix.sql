-- Closing an event changes event-scoped eligibility for every participant at
-- once. Evaluate the canonical award source once for that player set instead
-- of once per participant inside the close transaction.
create or replace function public.sync_player_badge_award_ledgers(
  p_player_ids uuid[]
)
returns void
language sql
security definer
set search_path = public
as $$
  with requested_players as materialized (
    select distinct requested.player_id
    from unnest(coalesce(p_player_ids, '{}'::uuid[]))
      as requested(player_id)
    where requested.player_id is not null
  ), enriched as materialized (
    select source.award_key, source.player_id, source.badge_key,
      source.source_type, source.source_attempt_id,
      source.source_historical_attempt_id, source.source_event_id,
      source.awarded_at source_awarded_at,
      case when source.source_historical_attempt_id is not null
        then historical.attempt_date::timestamp at time zone 'Europe/Berlin'
        else source.awarded_at end awarded_at,
      source.metadata,
      event.name source_event_name, event.start_date source_event_date,
      details.attempt_number source_attempt_number,
      coalesce(details.time_hundredths,
        (source.metadata->>'timeHundredths')::integer) source_time_hundredths
    from public.player_badge_award_sync_source source
    join requested_players requested on requested.player_id = source.player_id
    left join public.historical_attempts historical
      on historical.id = source.source_historical_attempt_id
      and historical.deleted_at is null
    left join public.events event
      on event.id = source.source_event_id and event.deleted_at is null
    left join public.event_attempt_details details
      on details.attempt_id = source.source_attempt_id
  ), ranked as materialized (
    select enriched.*, row_number() over (
      partition by enriched.award_key
      order by enriched.awarded_at,
        enriched.source_awarded_at,
        enriched.source_attempt_id nulls last,
        enriched.source_historical_attempt_id nulls last,
        enriched.source_event_id nulls last,
        enriched.source_type,
        enriched.player_id,
        enriched.badge_key,
        enriched.metadata::text
    ) canonical_position
    from enriched
  ), canonical as materialized (
    select ranked.award_key, ranked.player_id, ranked.badge_key,
      ranked.source_type, ranked.source_attempt_id,
      ranked.source_historical_attempt_id, ranked.source_event_id,
      ranked.source_awarded_at, ranked.awarded_at, ranked.metadata,
      ranked.source_event_name, ranked.source_event_date,
      ranked.source_attempt_number, ranked.source_time_hundredths
    from ranked
    where ranked.canonical_position = 1
  ), upserted as (
    insert into public.player_badge_award_ledger (
      award_key, player_id, badge_key, source_type, source_attempt_id,
      source_historical_attempt_id, source_event_id, source_awarded_at,
      awarded_at, metadata, source_event_name, source_event_date,
      source_attempt_number, source_time_hundredths
    )
    select canonical.award_key, canonical.player_id, canonical.badge_key,
      canonical.source_type, canonical.source_attempt_id,
      canonical.source_historical_attempt_id, canonical.source_event_id,
      canonical.source_awarded_at, canonical.awarded_at, canonical.metadata,
      canonical.source_event_name, canonical.source_event_date,
      canonical.source_attempt_number, canonical.source_time_hundredths
    from canonical
    on conflict (award_key) do update set
      player_id = excluded.player_id,
      badge_key = excluded.badge_key,
      source_type = excluded.source_type,
      source_attempt_id = excluded.source_attempt_id,
      source_historical_attempt_id = excluded.source_historical_attempt_id,
      source_event_id = excluded.source_event_id,
      source_awarded_at = excluded.source_awarded_at,
      awarded_at = excluded.awarded_at,
      metadata = excluded.metadata,
      source_event_name = excluded.source_event_name,
      source_event_date = excluded.source_event_date,
      source_attempt_number = excluded.source_attempt_number,
      source_time_hundredths = excluded.source_time_hundredths,
      updated_at = now()
    where (player_badge_award_ledger.player_id,
      player_badge_award_ledger.badge_key,
      player_badge_award_ledger.source_type,
      player_badge_award_ledger.source_attempt_id,
      player_badge_award_ledger.source_historical_attempt_id,
      player_badge_award_ledger.source_event_id,
      player_badge_award_ledger.source_awarded_at,
      player_badge_award_ledger.awarded_at,
      player_badge_award_ledger.metadata,
      player_badge_award_ledger.source_event_name,
      player_badge_award_ledger.source_event_date,
      player_badge_award_ledger.source_attempt_number,
      player_badge_award_ledger.source_time_hundredths)
      is distinct from
      (excluded.player_id, excluded.badge_key, excluded.source_type,
      excluded.source_attempt_id, excluded.source_historical_attempt_id,
      excluded.source_event_id, excluded.source_awarded_at,
      excluded.awarded_at, excluded.metadata, excluded.source_event_name,
      excluded.source_event_date, excluded.source_attempt_number,
      excluded.source_time_hundredths)
    returning award_key
  )
  delete from public.player_badge_award_ledger ledger
  using requested_players requested
  where ledger.player_id = requested.player_id
    and not exists (
      select 1 from canonical where canonical.award_key = ledger.award_key
    );
$$;

-- Preserve the established single-player API for every other trigger and
-- guarded admin RPC.
create or replace function public.sync_player_badge_award_ledger(
  p_player_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  select public.sync_player_badge_award_ledgers(array[p_player_id]);
$$;

create or replace function public.refresh_badge_ledger_after_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_ids uuid[];
  requested_event_id uuid;
begin
  if tg_op = 'DELETE' then
    requested_event_id := old.id;
  else
    requested_event_id := new.id;
  end if;

  if tg_op = 'UPDATE' and
    (old.name, old.start_date, old.started_at, old.ends_at, old.status,
      old.closed_at, old.deleted_at, old.winner_player_id)
    is not distinct from
    (new.name, new.start_date, new.started_at, new.ends_at, new.status,
      new.closed_at, new.deleted_at, new.winner_player_id) then
    return new;
  end if;

  select array_agg(affected.player_id order by affected.player_id)
  into requested_player_ids
  from (
    select participants.player_id
    from public.event_participants participants
    where participants.event_id = requested_event_id
      and participants.player_id is not null
    union
    select attempts.player_id
    from public.attempts attempts
    where attempts.event_id = requested_event_id
      and attempts.player_id is not null
  ) affected;

  if coalesce(cardinality(requested_player_ids), 0) > 0 then
    perform public.sync_player_badge_award_ledgers(requested_player_ids);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_player_badge_award_ledgers(uuid[]),
  public.sync_player_badge_award_ledger(uuid),
  public.refresh_badge_ledger_after_event_change()
  from public, anon, authenticated;
