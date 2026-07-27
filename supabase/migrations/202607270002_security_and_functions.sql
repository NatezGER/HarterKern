create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.players enable row level security;
alter table public.events enable row level security;
alter table public.attempts enable row level security;
alter table public.admin_roles enable row level security;
alter table public.rate_limit_entries enable row level security;
alter table public.merge_history enable row level security;

create policy players_public_read on public.players
for select to anon, authenticated
using (not is_archived or public.is_admin());

create policy players_admin_insert on public.players
for insert to authenticated with check (public.is_admin());
create policy players_admin_update on public.players
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy players_admin_delete on public.players
for delete to authenticated using (public.is_admin());

create policy events_public_read on public.events
for select to anon, authenticated using (true);
create policy events_admin_insert on public.events
for insert to authenticated with check (public.is_admin());
create policy events_admin_update on public.events
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy events_admin_delete on public.events
for delete to authenticated using (public.is_admin());

create policy attempts_public_read on public.attempts
for select to anon, authenticated
using (
  (status = 'approved' and deleted_at is null)
  or public.is_admin()
);
create policy attempts_admin_insert on public.attempts
for insert to authenticated with check (public.is_admin());
create policy attempts_admin_update on public.attempts
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy attempts_admin_delete on public.attempts
for delete to authenticated using (public.is_admin());

create policy admin_roles_self_read on public.admin_roles
for select to authenticated using (user_id = auth.uid());
create policy rate_limit_admin_read on public.rate_limit_entries
for select to authenticated using (public.is_admin());
create policy merge_history_admin_read on public.merge_history
for select to authenticated using (public.is_admin());

create or replace function public.close_expired_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set status = 'closed', closed_at = coalesce(closed_at, ends_at)
  where status = 'active' and ends_at <= now();
end;
$$;

create or replace function public.ensure_active_event()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event uuid;
  event_start timestamptz := now();
begin
  perform pg_advisory_xact_lock(20260727);
  perform public.close_expired_events();

  select id into selected_event
  from public.events
  where status = 'active' and ends_at > now()
  limit 1;

  if selected_event is null then
    insert into public.events (start_date, started_at, ends_at)
    values (
      (event_start at time zone 'Europe/Berlin')::date,
      event_start,
      event_start + interval '30 hours'
    )
    returning id into selected_event;
  end if;

  return selected_event;
end;
$$;

create or replace function public.submit_public_attempt(
  p_client_identifier text,
  p_is_dnf boolean,
  p_player_id uuid default null,
  p_player_name text default null,
  p_time_hundredths integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_player uuid;
  selected_event uuid;
  created_attempt uuid;
  client_digest text;
  submission_count integer;
begin
  if char_length(p_client_identifier) < 16 or char_length(p_client_identifier) > 200 then
    raise exception 'Ungültige Client-Kennung.';
  end if;
  if (p_is_dnf and p_time_hundredths is not null)
    or (not p_is_dnf and (p_time_hundredths is null or p_time_hundredths not between 1 and 30000)) then
    raise exception 'Ungültige Zeit- oder DNF-Angabe.';
  end if;

  client_digest := encode(digest(p_client_identifier, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtext(client_digest));

  delete from public.rate_limit_entries where created_at < now() - interval '48 hours';
  select count(*) into submission_count
  from public.rate_limit_entries
  where client_hash = client_digest and created_at >= now() - interval '24 hours';
  if submission_count >= 50 then
    raise exception 'Maximal 50 Einreichungen innerhalb von 24 Stunden.';
  end if;

  if p_player_id is not null then
    select id into selected_player
    from public.players
    where id = p_player_id and not is_archived;
    if selected_player is null then raise exception 'Spieler nicht gefunden.'; end if;
  elsif nullif(trim(p_player_name), '') is not null then
    insert into public.players (display_name)
    values (trim(p_player_name))
    on conflict (normalized_name) do update
      set display_name = public.players.display_name
    returning id into selected_player;
  else
    raise exception 'Bitte einen Spieler auswählen oder anlegen.';
  end if;

  selected_event := public.ensure_active_event();

  insert into public.attempts (
    player_id, event_id, status, time_hundredths, is_dnf, source
  )
  values (
    selected_player, selected_event, 'pending', p_time_hundredths, p_is_dnf, 'public'
  )
  returning id into created_attempt;

  insert into public.rate_limit_entries (client_hash) values (client_digest);

  return jsonb_build_object(
    'attempt_id', created_attempt,
    'event_id', selected_event,
    'status', 'pending'
  );
end;
$$;

create or replace function public.admin_start_event(
  p_name text default null,
  p_started_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_start timestamptz := coalesce(p_started_at, now());
  created_event uuid;
begin
  if not public.is_admin() then raise exception 'Nicht autorisiert.'; end if;
  perform pg_advisory_xact_lock(20260727);
  perform public.close_expired_events();
  if exists (select 1 from public.events where status = 'active') then
    raise exception 'Es existiert bereits ein aktives Event.';
  end if;
  insert into public.events (name, start_date, started_at, ends_at)
  values (
    nullif(trim(p_name), ''),
    (event_start at time zone 'Europe/Berlin')::date,
    event_start,
    event_start + interval '30 hours'
  )
  returning id into created_event;
  return created_event;
end;
$$;

create or replace function public.admin_close_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Nicht autorisiert.'; end if;
  update public.events
  set status = 'closed', closed_at = now()
  where id = p_event_id;
  if not found then raise exception 'Event nicht gefunden.'; end if;
end;
$$;

create or replace function public.admin_merge_players(
  p_source_player_id uuid,
  p_target_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Nicht autorisiert.'; end if;
  if p_source_player_id = p_target_player_id then
    raise exception 'Quell- und Zielspieler müssen verschieden sein.';
  end if;
  if not exists (select 1 from public.players where id = p_target_player_id and not is_archived) then
    raise exception 'Zielspieler nicht gefunden.';
  end if;
  update public.attempts set player_id = p_target_player_id where player_id = p_source_player_id;
  update public.players set is_archived = true where id = p_source_player_id;
  if not found then raise exception 'Quellspieler nicht gefunden.'; end if;
  insert into public.merge_history (source_player_id, target_player_id, merged_by)
  values (p_source_player_id, p_target_player_id, auth.uid());
end;
$$;

revoke all on function public.close_expired_events() from public;
revoke all on function public.ensure_active_event() from public;
grant execute on function public.submit_public_attempt(text, boolean, uuid, text, integer)
  to anon, authenticated;
grant execute on function public.admin_start_event(text, timestamptz) to authenticated;
grant execute on function public.admin_close_event(uuid) to authenticated;
grant execute on function public.admin_merge_players(uuid, uuid) to authenticated;

grant insert, update, delete on public.players, public.events, public.attempts
  to authenticated;
