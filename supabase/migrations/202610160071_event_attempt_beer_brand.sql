-- Optional event default and immutable-unless-explicitly-edited attempt snapshot.
-- Existing rows remain NULL. No historical backfill; no new triggers.
alter table public.events add column beer_brand text;
alter table public.attempts add column beer_brand text;
alter table public.events add constraint events_beer_brand_length check (char_length(beer_brand) <= 80);
alter table public.attempts add constraint attempts_beer_brand_length check (char_length(beer_brand) <= 80);

create or replace function public.sync_start_event_v5(
  p_name text,
  p_start_date date,
  p_participants jsonb,
  p_started_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_legacy_source_id text default null,
  p_awards_trophies boolean default false,
  p_trophy_competition_key text default null,
  p_trophy_competition_year integer default null,
  p_beer_brand text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare result jsonb;
begin
  -- Reuse the complete participant/guest/trophy/timing and concurrency contract.
  result := public.sync_start_event_v4(
    p_name, p_start_date, p_participants, p_started_at, p_ends_at,
    p_legacy_source_id, p_awards_trophies, p_trophy_competition_key,
    p_trophy_competition_year
  );
  update public.events set beer_brand = nullif(btrim(p_beer_brand), '')
  where id = (result->>'eventId')::uuid;
  return result;
end;
$$;

create or replace function public.sync_update_event_v3(
  p_event_id uuid,
  p_name text,
  p_start_date date,
  p_awards_trophies boolean,
  p_beer_brand text default null,
  p_update_beer_brand boolean default false
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.sync_update_event_v2(p_event_id, p_name, p_start_date, p_awards_trophies);
  -- Deliberately do not touch attempts. Omitted field preserves the default.
  if p_update_beer_brand then
    update public.events set beer_brand = nullif(btrim(p_beer_brand), '')
    where id = p_event_id and deleted_at is null;
  end if;
end;
$$;

-- Same signature and validations as before. Snapshot once in either INSERT.
-- Read the current default once; later event edits never rewrite this snapshot.
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
declare event_beer text;
begin
  if (p_is_dnf and p_time_hundredths is not null)
    or (not p_is_dnf and (p_time_hundredths is null or p_time_hundredths not between 1 and 30000)) then
    raise exception 'Ungültige Zeit- oder DNS-Angabe.';
  end if;
  select beer_brand into event_beer from public.events
  where id = p_event_id and status = 'active' and ends_at > now();
  if not found then raise exception 'Das Event ist nicht aktiv.'; end if;

  if p_participant_kind = 'guest' then
    if not exists (
      select 1 from public.event_guests
      where id = p_participant_id and event_id = p_event_id
    ) then raise exception 'Gast nimmt nicht an diesem Event teil.'; end if;
    insert into public.attempts (
      id, guest_id, event_id, status, time_hundredths, is_dnf,
      submitted_at, approved_at, source, beer_brand
    ) values (
      p_id, p_participant_id, p_event_id, 'approved', p_time_hundredths,
      p_is_dnf, coalesce(p_submitted_at, now()), now(), 'admin', event_beer
    );
  else
    if not exists (
      select 1 from public.event_participants
      where player_id = p_participant_id and event_id = p_event_id
    ) then raise exception 'Spieler nimmt nicht an diesem Event teil.'; end if;
    insert into public.attempts (
      id, player_id, event_id, status, time_hundredths, is_dnf,
      submitted_at, approved_at, source, beer_brand
    ) values (
      p_id, p_participant_id, p_event_id, 'approved', p_time_hundredths,
      p_is_dnf, coalesce(p_submitted_at, now()), now(), 'admin', event_beer
    );
  end if;
  return p_id;
end;
$$;

-- Versioned edit: unchanged participant/time validation, one UPDATE per attempt.
-- Explicit update flag distinguishes clearing NULL from an omitted beer field.
create or replace function public.sync_update_event_attempt_v2(
  p_attempt_id uuid,
  p_participant_id uuid,
  p_participant_kind text,
  p_time_hundredths integer,
  p_is_dnf boolean,
  p_submitted_at timestamptz,
  p_beer_brand text default null,
  p_update_beer_brand boolean default false
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
      submitted_at = p_submitted_at, edited_at = now(),
      beer_brand = case when p_update_beer_brand then nullif(btrim(p_beer_brand), '') else beer_brand end
    where id = p_attempt_id;
  else
    if not exists (
      select 1 from public.event_participants
      where player_id = p_participant_id and event_id = selected_event
    ) then raise exception 'Spieler nimmt nicht an diesem Event teil.'; end if;
    update public.attempts set player_id = p_participant_id, guest_id = null,
      time_hundredths = p_time_hundredths, is_dnf = p_is_dnf,
      submitted_at = p_submitted_at, edited_at = now(),
      beer_brand = case when p_update_beer_brand then nullif(btrim(p_beer_brand), '') else beer_brand end
    where id = p_attempt_id;
  end if;
end;
$$;

revoke all on function public.sync_start_event_v5(text,date,jsonb,timestamptz,timestamptz,text,boolean,text,integer,text) from public;
revoke all on function public.sync_update_event_v3(uuid,text,date,boolean,text,boolean) from public;
revoke all on function public.sync_update_event_attempt_v2(uuid,uuid,text,integer,boolean,timestamptz,text,boolean) from public;
grant execute on function public.sync_start_event_v5(text,date,jsonb,timestamptz,timestamptz,text,boolean,text,integer,text) to anon, authenticated;
grant execute on function public.sync_update_event_v3(uuid,text,date,boolean,text,boolean) to anon, authenticated;
grant execute on function public.sync_update_event_attempt_v2(uuid,uuid,text,integer,boolean,timestamptz,text,boolean) to anon, authenticated;
-- CREATE OR REPLACE above preserves the existing sync_create_event_attempt grants.
