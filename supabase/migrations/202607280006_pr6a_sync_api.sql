create or replace function public.sync_upsert_player(
  p_display_name text,
  p_is_ak boolean default false,
  p_legacy_source_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := trim(p_display_name);
  selected_player uuid;
begin
  if char_length(clean_name) not between 1 and 80 then
    raise exception 'Spielername muss zwischen 1 und 80 Zeichen lang sein.';
  end if;

  if p_legacy_source_id is not null then
    select id into selected_player
    from public.players where legacy_source_id = p_legacy_source_id;
  end if;
  if selected_player is null then
    select id into selected_player
    from public.players
    where normalized_name = public.normalize_player_name(clean_name);
  end if;

  if selected_player is null then
    insert into public.players (display_name, is_ak, legacy_source_id)
    values (clean_name, p_is_ak, p_legacy_source_id)
    returning id into selected_player;
  elsif p_legacy_source_id is not null then
    update public.players
    set legacy_source_id = coalesce(legacy_source_id, p_legacy_source_id)
    where id = selected_player;
  end if;
  return selected_player;
end;
$$;

create or replace function public.sync_start_event(
  p_name text,
  p_start_date date,
  p_participant_ids uuid[],
  p_started_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_legacy_source_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_start timestamptz := coalesce(p_started_at, now());
  selected_event uuid;
begin
  perform pg_advisory_xact_lock(20260727);
  perform public.close_expired_events();

  if p_legacy_source_id is not null then
    select id into selected_event
    from public.events where legacy_source_id = p_legacy_source_id;
  end if;
  if selected_event is null then
    select id into selected_event
    from public.events where status = 'active' limit 1;
  end if;
  if selected_event is null then
    insert into public.events (
      name, start_date, started_at, ends_at, legacy_source_id
    )
    values (
      nullif(trim(p_name), ''),
      coalesce(p_start_date, (event_start at time zone 'Europe/Berlin')::date),
      event_start,
      coalesce(p_ends_at, event_start + interval '24 hours'),
      p_legacy_source_id
    )
    returning id into selected_event;
  end if;

  insert into public.event_participants (event_id, player_id)
  select selected_event, p.id
  from public.players p
  where p.id = any(coalesce(p_participant_ids, '{}')) and not p.is_archived
  on conflict (event_id, player_id) do nothing;
  return selected_event;
end;
$$;

create or replace function public.sync_import_closed_event(
  p_name text,
  p_start_date date,
  p_started_at timestamptz,
  p_ends_at timestamptz,
  p_ended_at timestamptz,
  p_end_reason text,
  p_participant_ids uuid[],
  p_legacy_source_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event uuid;
begin
  select id into selected_event
  from public.events where legacy_source_id = p_legacy_source_id;
  if selected_event is null then
    insert into public.events (
      name, start_date, started_at, ends_at, status, closed_at,
      end_reason, legacy_source_id
    )
    values (
      nullif(trim(p_name), ''), p_start_date, p_started_at, p_ends_at,
      'closed', coalesce(p_ended_at, p_ends_at),
      case when p_end_reason in ('manual', 'automatic') then p_end_reason else null end,
      p_legacy_source_id
    )
    returning id into selected_event;
  end if;
  insert into public.event_participants (event_id, player_id)
  select selected_event, p.id from public.players p
  where p.id = any(coalesce(p_participant_ids, '{}')) and not p.is_archived
  on conflict do nothing;
  return selected_event;
end;
$$;

create or replace function public.sync_create_attempt(
  p_id uuid,
  p_player_id uuid,
  p_event_id uuid,
  p_time_hundredths integer,
  p_is_dnf boolean,
  p_is_ak boolean,
  p_submitted_at timestamptz,
  p_event_name text default null,
  p_legacy_source_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_attempt uuid;
begin
  if (p_is_dnf and p_time_hundredths is not null)
    or (not p_is_dnf and (p_time_hundredths is null or p_time_hundredths not between 1 and 30000)) then
    raise exception 'Ungültige Zeit- oder DNS-Angabe.';
  end if;
  if not exists (
    select 1 from public.players where id = p_player_id and not is_archived
  ) then raise exception 'Spieler nicht gefunden.'; end if;
  if p_event_id is not null then
    insert into public.event_participants (event_id, player_id)
    values (p_event_id, p_player_id) on conflict do nothing;
  end if;

  if p_legacy_source_id is not null then
    select id into selected_attempt
    from public.attempts where legacy_source_id = p_legacy_source_id;
  end if;
  if selected_attempt is null then
    select id into selected_attempt from public.attempts where id = p_id;
  end if;
  if selected_attempt is null then
    insert into public.attempts (
      id, player_id, event_id, event_name, status, time_hundredths,
      is_dnf, is_ak, submitted_at, approved_at, source, legacy_source_id
    )
    values (
      p_id, p_player_id, p_event_id, nullif(trim(p_event_name), ''),
      'approved', p_time_hundredths, p_is_dnf, p_is_ak,
      coalesce(p_submitted_at, now()), now(), 'admin', p_legacy_source_id
    )
    returning id into selected_attempt;
  end if;
  return selected_attempt;
end;
$$;

create or replace function public.sync_update_attempt(
  p_attempt_id uuid,
  p_player_id uuid,
  p_time_hundredths integer,
  p_is_dnf boolean,
  p_is_ak boolean,
  p_submitted_at timestamptz,
  p_event_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (p_is_dnf and p_time_hundredths is not null)
    or (not p_is_dnf and (p_time_hundredths is null or p_time_hundredths not between 1 and 30000)) then
    raise exception 'Ungültige Zeit- oder DNS-Angabe.';
  end if;
  update public.attempts
  set player_id = p_player_id,
      time_hundredths = p_time_hundredths,
      is_dnf = p_is_dnf,
      is_ak = p_is_ak,
      submitted_at = p_submitted_at,
      event_name = nullif(trim(p_event_name), '')
  where id = p_attempt_id and deleted_at is null;
  if not found then raise exception 'Versuch nicht gefunden.'; end if;
  insert into public.event_participants (event_id, player_id)
  select event_id, p_player_id
  from public.attempts
  where id = p_attempt_id and event_id is not null
  on conflict (event_id, player_id) do nothing;
end;
$$;

create or replace function public.sync_delete_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attempts set deleted_at = now()
  where id = p_attempt_id and deleted_at is null;
end;
$$;

create or replace function public.sync_update_player(
  p_player_id uuid,
  p_display_name text,
  p_is_ak boolean,
  p_avatar_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players
  set display_name = trim(p_display_name),
      is_ak = p_is_ak,
      avatar_url = p_avatar_url
  where id = p_player_id and not is_archived;
  if not found then raise exception 'Spieler nicht gefunden.'; end if;
end;
$$;

create or replace function public.sync_update_event(
  p_event_id uuid,
  p_name text,
  p_start_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set name = nullif(trim(p_name), ''), start_date = p_start_date
  where id = p_event_id;
  if not found then raise exception 'Event nicht gefunden.'; end if;
end;
$$;
