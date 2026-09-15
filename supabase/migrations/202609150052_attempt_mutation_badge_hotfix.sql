-- Attempt UPDATE/DELETE hotfix.
--
-- PL/pgSQL exposes OLD and NEW records to trigger functions. The previous
-- statement-level ledger refresh also used `old` and `new` as SQL aliases for
-- transition tables, making those qualified column references ambiguous.
-- Use conflict-free aliases throughout and keep all mutation refreshes scoped
-- to the event sequences touched by the statement.

create or replace function public.refresh_matrix_glitch_after_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_event_id uuid;
begin
  for requested_event_id in
    select previous_rows.event_id
    from old_attempts as previous_rows
    where previous_rows.event_id is not null
    union
    select current_rows.event_id
    from new_attempts as current_rows
    where current_rows.event_id is not null
  loop
    perform public.refresh_matrix_glitch_event_evidence(requested_event_id);
  end loop;
  return null;
end;
$$;

create or replace function public.refresh_matrix_glitch_after_attempt_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_event_id uuid;
begin
  for requested_event_id in
    select distinct deleted_rows.event_id
    from old_attempts as deleted_rows
    where deleted_rows.event_id is not null
  loop
    perform public.refresh_matrix_glitch_event_evidence(requested_event_id);
  end loop;
  return null;
end;
$$;

create or replace function public.refresh_badge_ledger_after_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_ids uuid[];
begin
  select array_agg(affected.player_id order by affected.player_id)
  into requested_player_ids
  from (
    select attempt_rows.player_id
    from public.attempts as attempt_rows
    where attempt_rows.player_id is not null
      and attempt_rows.event_id in (
        select previous_rows.event_id
        from old_attempts as previous_rows
        where previous_rows.event_id is not null
        union
        select current_rows.event_id
        from new_attempts as current_rows
        where current_rows.event_id is not null
      )
    union
    select previous_rows.player_id
    from old_attempts as previous_rows
    where previous_rows.player_id is not null
    union
    select current_rows.player_id
    from new_attempts as current_rows
    where current_rows.player_id is not null
  ) as affected;

  if coalesce(cardinality(requested_player_ids), 0) > 0 then
    perform public.sync_player_badge_award_ledgers(requested_player_ids);
  end if;
  return null;
end;
$$;

create or replace function public.refresh_badge_ledger_after_attempt_delete_scoped()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_ids uuid[];
begin
  select array_agg(affected.player_id order by affected.player_id)
  into requested_player_ids
  from (
    select attempt_rows.player_id
    from public.attempts as attempt_rows
    where attempt_rows.player_id is not null
      and attempt_rows.event_id in (
        select deleted_rows.event_id
        from old_attempts as deleted_rows
        where deleted_rows.event_id is not null
      )
    union
    select deleted_rows.player_id
    from old_attempts as deleted_rows
    where deleted_rows.player_id is not null
  ) as affected;

  if coalesce(cardinality(requested_player_ids), 0) > 0 then
    perform public.sync_player_badge_award_ledgers(requested_player_ids);
  end if;
  return null;
end;
$$;

revoke all on function public.refresh_matrix_glitch_after_attempt_update(),
  public.refresh_matrix_glitch_after_attempt_delete(),
  public.refresh_badge_ledger_after_attempt_update(),
  public.refresh_badge_ledger_after_attempt_delete_scoped()
  from public, anon, authenticated;

drop trigger if exists attempts_delete_refresh_badge_ledger
  on public.attempts;

create trigger attempts_delete_refresh_badge_ledger
after delete on public.attempts
referencing old table as old_attempts
for each statement
execute function public.refresh_badge_ledger_after_attempt_delete_scoped();
