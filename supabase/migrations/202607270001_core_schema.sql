create extension if not exists pgcrypto;

create type public.event_status as enum ('active', 'closed');
create type public.attempt_status as enum ('pending', 'approved', 'rejected');
create type public.attempt_source as enum ('public', 'admin');

create or replace function public.normalize_player_name(value text)
returns text
language sql
immutable
strict
as $$
  select lower(regexp_replace(trim(value), '\s+', ' ', 'g'));
$$;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  normalized_name text generated always as (public.normalize_player_name(display_name)) stored,
  avatar_url text,
  is_ak boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_normalized_name_unique unique (normalized_name)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(trim(name)) between 1 and 120),
  start_date date not null,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  status public.event_status not null default 'active',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (
    ends_at > started_at and ends_at <= started_at + interval '30 hours'
  ),
  constraint events_closed_state check (
    (status = 'active' and closed_at is null)
    or (status = 'closed' and closed_at is not null)
  )
);

create unique index events_one_active_idx
  on public.events ((status))
  where status = 'active';
create index events_start_date_idx on public.events (start_date desc);
create index events_started_at_idx on public.events (started_at desc);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on update cascade on delete restrict,
  event_id uuid not null references public.events(id) on update cascade on delete restrict,
  status public.attempt_status not null default 'pending',
  time_hundredths integer,
  is_dnf boolean not null default false,
  submitted_at timestamptz not null default now(),
  edited_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  deleted_at timestamptz,
  source public.attempt_source not null default 'public',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempts_result_exclusive check (
    (is_dnf and time_hundredths is null)
    or (not is_dnf and time_hundredths between 1 and 30000)
  ),
  constraint attempts_status_timestamps check (
    (status = 'pending' and approved_at is null and rejected_at is null)
    or (status = 'approved' and approved_at is not null and rejected_at is null)
    or (status = 'rejected' and rejected_at is not null and approved_at is null)
  ),
  constraint admin_attempts_are_approved check (
    source <> 'admin' or status = 'approved'
  )
);

create index attempts_player_idx on public.attempts (player_id, submitted_at desc);
create index attempts_event_idx on public.attempts (event_id, submitted_at desc);
create index attempts_pending_idx on public.attempts (submitted_at)
  where status = 'pending' and deleted_at is null;
create index attempts_ranking_idx
  on public.attempts (time_hundredths, submitted_at)
  where status = 'approved' and not is_dnf and deleted_at is null;

create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.rate_limit_entries (
  id uuid primary key default gen_random_uuid(),
  client_hash text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_lookup_idx
  on public.rate_limit_entries (client_hash, created_at desc);

create table public.merge_history (
  id uuid primary key default gen_random_uuid(),
  source_player_id uuid not null,
  target_player_id uuid not null,
  merged_by uuid not null references auth.users(id),
  merged_at timestamptz not null default now(),
  check (source_player_id <> target_player_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger players_set_updated_at before update on public.players
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger attempts_set_updated_at before update on public.attempts
for each row execute function public.set_updated_at();

create or replace function public.sync_attempt_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' then
    new.approved_at = coalesce(new.approved_at, now());
    new.rejected_at = null;
  elsif new.status = 'rejected' then
    new.rejected_at = coalesce(new.rejected_at, now());
    new.approved_at = null;
  else
    new.approved_at = null;
    new.rejected_at = null;
  end if;

  if tg_op = 'UPDATE' and (
    new.player_id is distinct from old.player_id
    or new.event_id is distinct from old.event_id
    or new.time_hundredths is distinct from old.time_hundredths
    or new.is_dnf is distinct from old.is_dnf
    or new.status is distinct from old.status
  ) then
    new.edited_at = now();
  end if;

  return new;
end;
$$;

create trigger attempts_sync_status
before insert or update on public.attempts
for each row execute function public.sync_attempt_status_timestamps();
