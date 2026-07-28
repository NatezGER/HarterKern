-- PR 6B: transactional event setup and participant management.

create or replace function public.sync_start_event_v2(
  p_name text,
  p_start_date date,
  p_participants jsonb,
  p_started_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_legacy_source_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event uuid;
  participant jsonb;
  participant_id uuid;
  participant_kind text;
  participant_name text;
  client_id text;
  mapping jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_participants) <> 'array' or jsonb_array_length(p_participants) = 0 then
    raise exception 'Wähle mindestens einen Teilnehmer.';
  end if;

  perform pg_advisory_xact_lock(20260727);
  perform public.close_expired_events();
  if p_legacy_source_id is not null then
    select id into selected_event
    from public.events where legacy_source_id = p_legacy_source_id;
  end if;
  if selected_event is not null then
    for participant in select value from jsonb_array_elements(p_participants)
    loop
      participant_id := null;
      participant_kind := participant->>'kind';
      participant_name := trim(participant->>'name');
      client_id := participant->>'clientId';
      if participant_kind = 'guest' then
        select id into participant_id from public.event_guests
        where event_id = selected_event
          and normalized_name = public.normalize_player_name(participant_name);
      else
        select ep.player_id into participant_id
        from public.event_participants ep
        join public.players p on p.id = ep.player_id
        where ep.event_id = selected_event
          and p.normalized_name = public.normalize_player_name(participant_name);
      end if;
      if participant_id is null then
        raise exception 'Teilnehmer % konnte beim erneuten Import nicht zugeordnet werden.',
          participant_name;
      end if;
      mapping := mapping || jsonb_build_array(jsonb_build_object(
        'clientId', client_id,
        'participantId', participant_id,
        'kind', participant_kind
      ));
    end loop;
    return jsonb_build_object('eventId', selected_event, 'participants', mapping);
  end if;
  if exists (select 1 from public.events where status = 'active') then
    raise exception 'Es läuft bereits ein Event.';
  end if;

  insert into public.events (name, start_date, started_at, ends_at, legacy_source_id)
  values (
    nullif(trim(p_name), ''),
    p_start_date,
    coalesce(p_started_at, now()),
    coalesce(p_ends_at, coalesce(p_started_at, now()) + interval '24 hours'),
    p_legacy_source_id
  )
  returning id into selected_event;

  for participant in select value from jsonb_array_elements(p_participants)
  loop
    participant_kind := participant->>'kind';
    participant_name := trim(participant->>'name');
    client_id := participant->>'clientId';
    participant_id := null;

    if char_length(participant_name) not between 1 and 80 then
      raise exception 'Teilnehmername muss zwischen 1 und 80 Zeichen lang sein.';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(p_participants) other
      where other->>'clientId' <> client_id
        and public.normalize_player_name(other->>'name') =
          public.normalize_player_name(participant_name)
    ) then
      raise exception 'Der Name % wurde mehrfach ausgewählt.', participant_name;
    end if;

    if participant_kind = 'permanent' then
      if nullif(participant->>'id', '') is not null then
        participant_id := (participant->>'id')::uuid;
        if not exists (
          select 1 from public.players
          where id = participant_id and not is_archived and not is_ak
        ) then raise exception 'Spieler % wurde nicht gefunden.', participant_name; end if;
      else
        if exists (
          select 1 from public.players
          where normalized_name = public.normalize_player_name(participant_name)
        ) then raise exception 'Für % existiert bereits ein Spielerprofil.', participant_name; end if;
        insert into public.players (display_name)
        values (participant_name) returning id into participant_id;
      end if;
      insert into public.event_participants (event_id, player_id)
      values (selected_event, participant_id);
    elsif participant_kind = 'guest' then
      if exists (
        select 1 from public.players
        where normalized_name = public.normalize_player_name(participant_name)
          and not is_archived
      ) then raise exception '% besitzt bereits ein permanentes Spielerprofil.', participant_name; end if;
      insert into public.event_guests (event_id, display_name)
      values (selected_event, participant_name) returning id into participant_id;
    else
      raise exception 'Unbekannter Spielertyp.';
    end if;

    mapping := mapping || jsonb_build_array(jsonb_build_object(
      'clientId', client_id,
      'participantId', participant_id,
      'kind', participant_kind
    ));
  end loop;

  return jsonb_build_object('eventId', selected_event, 'participants', mapping);
end;
$$;

create or replace function public.sync_import_closed_event_v2(
  p_name text,
  p_start_date date,
  p_started_at timestamptz,
  p_ends_at timestamptz,
  p_ended_at timestamptz,
  p_end_reason text,
  p_participant_ids uuid[],
  p_guests jsonb,
  p_legacy_source_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event uuid;
  guest jsonb;
  selected_guest uuid;
  mapping jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_guests) <> 'array' then
    raise exception 'Ungültige Gästeliste.';
  end if;
  selected_event := public.sync_import_closed_event(
    p_name, p_start_date, p_started_at, p_ends_at, p_ended_at,
    p_end_reason, p_participant_ids, p_legacy_source_id
  );
  for guest in select value from jsonb_array_elements(p_guests)
  loop
    insert into public.event_guests (event_id, display_name)
    values (selected_event, trim(guest->>'name'))
    on conflict (event_id, normalized_name) do update
      set display_name = excluded.display_name
    returning id into selected_guest;
    mapping := mapping || jsonb_build_array(jsonb_build_object(
      'clientId', guest->>'clientId',
      'participantId', selected_guest,
      'kind', 'guest'
    ));
  end loop;
  return jsonb_build_object('eventId', selected_event, 'participants', mapping);
end;
$$;

create or replace function public.sync_add_existing_event_player(
  p_event_id uuid,
  p_player_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare player_name text;
begin
  perform pg_advisory_xact_lock(20260727);
  if not exists (
    select 1 from public.events where id = p_event_id and status = 'active' and ends_at > now()
  ) then raise exception 'Das Event ist nicht aktiv.'; end if;
  select display_name into player_name from public.players
  where id = p_player_id and not is_archived and not is_ak;
  if player_name is null then raise exception 'Spieler wurde nicht gefunden.'; end if;
  if exists (
    select 1 from public.event_participants
    where event_id = p_event_id and player_id = p_player_id
  ) then raise exception '% nimmt bereits teil.', player_name; end if;
  if exists (
    select 1 from public.event_guests
    where event_id = p_event_id
      and normalized_name = public.normalize_player_name(player_name)
  ) then raise exception 'Der Name % ist bereits als Gast im Event vorhanden.', player_name; end if;
  insert into public.event_participants (event_id, player_id)
  values (p_event_id, p_player_id);
  return p_player_id;
end;
$$;

create or replace function public.sync_create_event_player(
  p_event_id uuid,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare clean_name text := trim(p_display_name); selected_player uuid;
begin
  perform pg_advisory_xact_lock(20260727);
  if not exists (
    select 1 from public.events where id = p_event_id and status = 'active' and ends_at > now()
  ) then raise exception 'Das Event ist nicht aktiv.'; end if;
  if char_length(clean_name) not between 1 and 80 then
    raise exception 'Spielername muss zwischen 1 und 80 Zeichen lang sein.';
  end if;
  if exists (
    select 1 from public.players
    where normalized_name = public.normalize_player_name(clean_name)
  ) then raise exception 'Für % existiert bereits ein Spielerprofil.', clean_name; end if;
  if exists (
    select 1 from public.event_guests
    where event_id = p_event_id
      and normalized_name = public.normalize_player_name(clean_name)
  ) then raise exception 'Der Name % ist bereits als Gast im Event vorhanden.', clean_name; end if;
  insert into public.players (display_name)
  values (clean_name) returning id into selected_player;
  insert into public.event_participants (event_id, player_id)
  values (p_event_id, selected_player);
  return selected_player;
end;
$$;

create or replace function public.sync_add_event_guest(
  p_event_id uuid,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare clean_name text := trim(p_display_name); selected_guest uuid;
begin
  perform pg_advisory_xact_lock(20260727);
  if not exists (
    select 1 from public.events where id = p_event_id and status = 'active' and ends_at > now()
  ) then raise exception 'Das Event ist nicht aktiv.'; end if;
  if char_length(clean_name) not between 1 and 80 then
    raise exception 'Gastname muss zwischen 1 und 80 Zeichen lang sein.';
  end if;
  if exists (
    select 1 from public.players
    where normalized_name = public.normalize_player_name(clean_name)
      and not is_archived
  ) then raise exception '% besitzt bereits ein permanentes Spielerprofil.', clean_name; end if;
  if exists (
    select 1 from public.event_guests
    where event_id = p_event_id
      and normalized_name = public.normalize_player_name(clean_name)
  ) then raise exception 'Gast % nimmt bereits teil.', clean_name; end if;
  insert into public.event_guests (event_id, display_name)
  values (p_event_id, clean_name) returning id into selected_guest;
  return selected_guest;
end;
$$;

create or replace function public.sync_create_event_attempt(
  p_id uuid,
  p_event_id uuid,
  p_participant_id uuid,
  p_participant_kind text,
  p_time_hundredths integer,
  p_is_dnf boolean,
  p_submitted_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if (p_is_dnf and p_time_hundredths is not null)
    or (not p_is_dnf and (p_time_hundredths is null or p_time_hundredths not between 1 and 30000)) then
    raise exception 'Ungültige Zeit- oder DNS-Angabe.';
  end if;
  if not exists (
    select 1 from public.events where id = p_event_id and status = 'active' and ends_at > now()
  ) then raise exception 'Das Event ist nicht aktiv.'; end if;

  if p_participant_kind = 'guest' then
    if not exists (
      select 1 from public.event_guests
      where id = p_participant_id and event_id = p_event_id
    ) then raise exception 'Gast nimmt nicht an diesem Event teil.'; end if;
    insert into public.attempts (
      id, guest_id, event_id, status, time_hundredths, is_dnf,
      submitted_at, approved_at, source
    ) values (
      p_id, p_participant_id, p_event_id, 'approved', p_time_hundredths,
      p_is_dnf, coalesce(p_submitted_at, now()), now(), 'admin'
    );
  else
    if not exists (
      select 1 from public.event_participants
      where player_id = p_participant_id and event_id = p_event_id
    ) then raise exception 'Spieler nimmt nicht an diesem Event teil.'; end if;
    insert into public.attempts (
      id, player_id, event_id, status, time_hundredths, is_dnf,
      submitted_at, approved_at, source
    ) values (
      p_id, p_participant_id, p_event_id, 'approved', p_time_hundredths,
      p_is_dnf, coalesce(p_submitted_at, now()), now(), 'admin'
    );
  end if;
  return p_id;
end;
$$;

create or replace function public.sync_update_event_attempt(
  p_attempt_id uuid,
  p_participant_id uuid,
  p_participant_kind text,
  p_time_hundredths integer,
  p_is_dnf boolean,
  p_submitted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare selected_event uuid;
begin
  select event_id into selected_event from public.attempts
  where id = p_attempt_id and deleted_at is null;
  if selected_event is null then raise exception 'Eventversuch wurde nicht gefunden.'; end if;
  if (p_is_dnf and p_time_hundredths is not null)
    or (not p_is_dnf and (p_time_hundredths is null or p_time_hundredths not between 1 and 30000)) then
    raise exception 'Ungültige Zeit- oder DNS-Angabe.';
  end if;
  if p_participant_kind = 'guest' then
    if not exists (
      select 1 from public.event_guests
      where id = p_participant_id and event_id = selected_event
    ) then raise exception 'Gast nimmt nicht an diesem Event teil.'; end if;
    update public.attempts set player_id = null, guest_id = p_participant_id,
      time_hundredths = p_time_hundredths, is_dnf = p_is_dnf,
      submitted_at = p_submitted_at, edited_at = now()
    where id = p_attempt_id;
  else
    if not exists (
      select 1 from public.event_participants
      where player_id = p_participant_id and event_id = selected_event
    ) then raise exception 'Spieler nimmt nicht an diesem Event teil.'; end if;
    update public.attempts set player_id = p_participant_id, guest_id = null,
      time_hundredths = p_time_hundredths, is_dnf = p_is_dnf,
      submitted_at = p_submitted_at, edited_at = now()
    where id = p_attempt_id;
  end if;
end;
$$;

revoke all on function public.sync_start_event_v2(text, date, jsonb, timestamptz, timestamptz, text) from public;
revoke all on function public.sync_import_closed_event_v2(text, date, timestamptz, timestamptz, timestamptz, text, uuid[], jsonb, text) from public;
revoke all on function public.sync_add_existing_event_player(uuid, uuid) from public;
revoke all on function public.sync_create_event_player(uuid, text) from public;
revoke all on function public.sync_add_event_guest(uuid, text) from public;
revoke all on function public.sync_create_event_attempt(uuid, uuid, uuid, text, integer, boolean, timestamptz) from public;
revoke all on function public.sync_update_event_attempt(uuid, uuid, text, integer, boolean, timestamptz) from public;

grant execute on function public.sync_start_event_v2(text, date, jsonb, timestamptz, timestamptz, text) to anon, authenticated;
grant execute on function public.sync_import_closed_event_v2(text, date, timestamptz, timestamptz, timestamptz, text, uuid[], jsonb, text) to anon, authenticated;
grant execute on function public.sync_add_existing_event_player(uuid, uuid) to anon, authenticated;
grant execute on function public.sync_create_event_player(uuid, text) to anon, authenticated;
grant execute on function public.sync_add_event_guest(uuid, text) to anon, authenticated;
grant execute on function public.sync_create_event_attempt(uuid, uuid, uuid, text, integer, boolean, timestamptz) to anon, authenticated;
grant execute on function public.sync_update_event_attempt(uuid, uuid, text, integer, boolean, timestamptz) to anon, authenticated;
