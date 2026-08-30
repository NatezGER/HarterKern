-- P11.5 B: persist canonical badge awards so public profile and rarity reads
-- never expand the live eligibility engine.

create table public.player_badge_award_ledger (
  award_key text primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  badge_key text not null references public.badge_definitions(badge_key) on delete cascade,
  source_type text not null,
  source_attempt_id uuid,
  source_historical_attempt_id uuid,
  source_event_id uuid,
  source_awarded_at timestamptz not null,
  awarded_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  source_event_name text,
  source_event_date date,
  source_attempt_number integer,
  source_time_hundredths integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index player_badge_award_ledger_player_idx
  on public.player_badge_award_ledger (player_id);
create index player_badge_award_ledger_badge_player_idx
  on public.player_badge_award_ledger (badge_key, player_id);

alter table public.player_badge_award_ledger enable row level security;
create policy player_badge_award_ledger_public_read
  on public.player_badge_award_ledger for select using (true);

grant select on public.player_badge_award_ledger to anon, authenticated;
revoke insert, update, delete on public.player_badge_award_ledger
  from anon, authenticated;

-- This is the sole live-eligibility union. It is intentionally private and is
-- consumed only by transactional ledger synchronization and migration tests.
create view public.player_badge_award_sync_source
with (security_invoker = true)
as
select * from public.player_badge_awards
union all select * from public.pre_p11_badge_awards
union all select * from public.event_lead_time_badge_awards
union all select * from public.bingo_line_diamond_badge_awards;

revoke all on public.player_badge_award_sync_source
  from public, anon, authenticated;

create or replace function public.sync_player_badge_award_ledger(p_player_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  with canonical as materialized (
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
    left join public.historical_attempts historical
      on historical.id = source.source_historical_attempt_id
      and historical.deleted_at is null
    left join public.events event
      on event.id = source.source_event_id and event.deleted_at is null
    left join public.event_attempt_details details
      on details.attempt_id = source.source_attempt_id
    where source.player_id = p_player_id
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
  where ledger.player_id = p_player_id
    and not exists (
      select 1 from canonical where canonical.award_key = ledger.award_key
    );
$$;

create or replace function public.sync_all_player_badge_award_ledgers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_id uuid;
begin
  for requested_player_id in
    select players.id from public.players
    union
    select ledger.player_id from public.player_badge_award_ledger ledger
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
  end loop;
end;
$$;

revoke all on function public.sync_player_badge_award_ledger(uuid),
  public.sync_all_player_badge_award_ledgers() from public, anon, authenticated;

-- Idempotent initial backfill. Both functions remain available to triggers and
-- guarded admin wrappers after deployment.
select public.sync_all_player_badge_award_ledgers();

create or replace function public.admin_refresh_player_badge_awards(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;
  perform public.sync_player_badge_award_ledger(p_player_id);
end;
$$;

create or replace function public.admin_refresh_all_player_badge_awards()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;
  perform public.sync_all_player_badge_award_ledgers();
end;
$$;

revoke all on function public.admin_refresh_player_badge_awards(uuid),
  public.admin_refresh_all_player_badge_awards() from public, anon;
grant execute on function public.admin_refresh_player_badge_awards(uuid),
  public.admin_refresh_all_player_badge_awards() to authenticated;

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
    select distinct attempts.player_id from new_attempts attempts
    where attempts.player_id is not null and attempts.status = 'approved'
      and attempts.deleted_at is null
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
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
  requested_player_id uuid;
begin
  if exists (
    select 1 from old_attempts old
    join new_attempts new using (id)
    where not (
      old.status <> 'approved' and new.status = 'approved'
      and old.player_id is not distinct from new.player_id
      and old.event_id is not distinct from new.event_id
      and old.time_hundredths is not distinct from new.time_hundredths
      and old.is_dnf is not distinct from new.is_dnf
      and old.is_ak is not distinct from new.is_ak
      and old.submitted_at is not distinct from new.submitted_at
      and old.deleted_at is not distinct from new.deleted_at
    )
  ) then
    perform public.sync_all_player_badge_award_ledgers();
    return null;
  end if;

  for requested_player_id in
    select distinct attempts.player_id from new_attempts attempts
    where attempts.player_id is not null and attempts.status = 'approved'
      and attempts.deleted_at is null
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
  end loop;
  return null;
end;
$$;

create or replace function public.refresh_badge_ledger_after_global_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_all_player_badge_award_ledgers();
  return null;
end;
$$;

create or replace function public.refresh_badge_ledger_after_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_id uuid;
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

  for requested_player_id in
    select participants.player_id
    from public.event_participants participants
    where participants.event_id = requested_event_id
      and participants.player_id is not null
    union
    select attempts.player_id
    from public.attempts attempts
    where attempts.event_id = requested_event_id
      and attempts.player_id is not null
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
  end loop;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.refresh_badge_ledger_after_participant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.player_id is not null then
      perform public.sync_player_badge_award_ledger(old.player_id);
    end if;
    return old;
  elsif tg_op = 'INSERT' then
    if new.player_id is not null then
      perform public.sync_player_badge_award_ledger(new.player_id);
    end if;
    return new;
  end if;

  if old.player_id is not null then
    perform public.sync_player_badge_award_ledger(old.player_id);
  end if;
  if new.player_id is not null
    and new.player_id is distinct from old.player_id then
    perform public.sync_player_badge_award_ledger(new.player_id);
  end if;
  return new;
end;
$$;

create or replace function public.refresh_badge_ledger_after_player_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.is_ak, old.is_archived) is distinct from
    (new.is_ak, new.is_archived) then
    perform public.sync_all_player_badge_award_ledgers();
  end if;
  return new;
end;
$$;

revoke all on function public.refresh_badge_ledger_after_attempt_insert(),
  public.refresh_badge_ledger_after_attempt_update(),
  public.refresh_badge_ledger_after_global_change(),
  public.refresh_badge_ledger_after_event_change(),
  public.refresh_badge_ledger_after_participant_change(),
  public.refresh_badge_ledger_after_player_change()
  from public, anon, authenticated;

create trigger attempts_insert_refresh_badge_ledger
after insert on public.attempts
referencing new table as new_attempts
for each statement execute function public.refresh_badge_ledger_after_attempt_insert();

create trigger attempts_update_refresh_badge_ledger
after update on public.attempts
referencing old table as old_attempts new table as new_attempts
for each statement execute function public.refresh_badge_ledger_after_attempt_update();

create trigger attempts_delete_refresh_badge_ledger
after delete on public.attempts
for each statement execute function public.refresh_badge_ledger_after_global_change();

create trigger historical_attempts_refresh_badge_ledger
after insert or update or delete on public.historical_attempts
for each statement execute function public.refresh_badge_ledger_after_global_change();

create trigger events_refresh_badge_ledger
after update or delete on public.events
for each row execute function public.refresh_badge_ledger_after_event_change();

create trigger event_participants_refresh_badge_ledger
after insert or update or delete on public.event_participants
for each row execute function public.refresh_badge_ledger_after_participant_change();

create trigger players_refresh_badge_ledger
after update on public.players
for each row execute function public.refresh_badge_ledger_after_player_change();

create trigger badge_definitions_refresh_badge_ledger
after insert or update or delete on public.badge_definitions
for each statement execute function public.refresh_badge_ledger_after_global_change();

create or replace function public.get_player_visible_badges(p_player_id uuid)
returns table (
  award_key text, player_id uuid, display_name text, avatar_url text,
  avatar_path text, badge_key text, category text, tier public.badge_tier,
  name text, description text, family_key text, requirement text,
  threshold integer, source_type text, source_attempt_id uuid,
  source_historical_attempt_id uuid, source_event_id uuid,
  source_event_name text, awarded_at timestamptz, metadata jsonb,
  source_attempt_number integer, source_time_hundredths integer,
  is_special_event_badge boolean, badge_kind text, design_variant text,
  scope_type text
)
language sql
stable
security invoker
set search_path = public
as $$
  with ranked as materialized (
    select ledger.*, players.display_name, players.avatar_url,
      players.avatar_path, definitions.category, definitions.tier,
      definitions.name, definitions.description, definitions.family_key,
      definitions.requirement, definitions.threshold,
      definitions.sort_order, definitions.badge_kind,
      definitions.design_variant, definitions.scope_type,
      case definitions.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end tier_rank,
      row_number() over (
        partition by ledger.player_id,
          coalesce(definitions.family_key, ledger.award_key)
        order by case definitions.tier when 'special' then 6
          when 'diamond' then 5 when 'gold' then 4 when 'silver' then 3
          when 'bronze' then 2 end desc,
          definitions.threshold desc nulls last,
          ledger.source_awarded_at, ledger.award_key
      ) family_position
    from public.player_badge_award_ledger ledger
    join public.players on players.id = ledger.player_id
      and not players.is_ak and not players.is_archived
    join public.badge_definitions definitions
      on definitions.badge_key = ledger.badge_key and definitions.is_active
    where ledger.player_id = p_player_id
  )
  select award_key, player_id, display_name, avatar_url, avatar_path,
    badge_key, category, tier, name, description, family_key, requirement,
    threshold, source_type, source_attempt_id, source_historical_attempt_id,
    source_event_id, source_event_name, awarded_at, metadata,
    source_attempt_number, source_time_hundredths, false,
    badge_kind, design_variant, scope_type
  from ranked
  where family_position = 1
  order by tier_rank desc, sort_order, award_key;
$$;

create or replace function public.get_badge_rarity()
returns table (
  badge_key text, name text, tier public.badge_tier, tier_rank integer,
  sort_order integer, design_variant text, recipient_count integer,
  regular_player_count integer, rarity_percent integer, recipients jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with awards as materialized (
    select distinct ledger.badge_key, ledger.player_id,
      players.display_name, players.avatar_url,
      definitions.name, definitions.tier, definitions.design_variant,
      definitions.sort_order
    from public.player_badge_award_ledger ledger
    join public.players on players.id = ledger.player_id
      and not players.is_ak and not players.is_archived
    join public.badge_definitions definitions
      on definitions.badge_key = ledger.badge_key and definitions.is_active
  ), population as (
    select count(*)::integer regular_player_count
    from public.players where not is_ak and not is_archived
  )
  select awards.badge_key, max(awards.name), awards.tier,
    case awards.tier when 'special' then 6 when 'diamond' then 5
      when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end,
    awards.sort_order, max(awards.design_variant), count(*)::integer,
    population.regular_player_count,
    case when population.regular_player_count = 0 then null
      else round(count(*) * 100.0 / population.regular_player_count)::integer end,
    jsonb_agg(jsonb_build_object('playerId', awards.player_id,
      'playerName', awards.display_name, 'avatarUrl', awards.avatar_url)
      order by awards.display_name, awards.player_id)
  from awards cross join population
  group by awards.badge_key, awards.tier, awards.sort_order,
    population.regular_player_count
  order by 4 desc, 7, awards.sort_order;
$$;

create or replace view public.player_badge_award_achievements
with (security_invoker = true)
as
select ledger.award_key, ledger.badge_key, ledger.player_id,
  players.display_name, ledger.awarded_at, ledger.metadata,
  ledger.source_attempt_id, definitions.name, definitions.tier,
  definitions.description, definitions.category
from public.player_badge_award_ledger ledger
join public.players on players.id = ledger.player_id
join public.badge_definitions definitions
  on definitions.badge_key = ledger.badge_key and definitions.is_active
where not players.is_ak and not players.is_archived;

grant select on public.player_badge_award_achievements to anon, authenticated;

revoke all on function public.get_player_visible_badges(uuid),
  public.get_badge_rarity() from public;
grant execute on function public.get_player_visible_badges(uuid),
  public.get_badge_rarity() to anon, authenticated;
