-- PR 6A: additive shared-data foundation on top of the PR-5 schema.

alter table public.players
  add column if not exists legacy_source_id text;

create unique index if not exists players_legacy_source_unique
  on public.players (legacy_source_id)
  where legacy_source_id is not null;

alter table public.events
  add column if not exists end_reason text,
  add column if not exists winner_player_id uuid references public.players(id) on delete set null,
  add column if not exists legacy_source_id text;

alter table public.events
  drop constraint if exists events_end_reason_valid;
alter table public.events
  add constraint events_end_reason_valid check (
    end_reason is null or end_reason in ('manual', 'automatic')
  );

create unique index if not exists events_legacy_source_unique
  on public.events (legacy_source_id)
  where legacy_source_id is not null;

alter table public.attempts
  alter column event_id drop not null,
  add column if not exists event_name text,
  add column if not exists is_ak boolean not null default false,
  add column if not exists legacy_source_id text;

create unique index if not exists attempts_legacy_source_unique
  on public.attempts (legacy_source_id)
  where legacy_source_id is not null;

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on update cascade on delete cascade,
  player_id uuid not null references public.players(id) on update cascade on delete restrict,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint event_participants_unique unique (event_id, player_id)
);

insert into public.event_participants (event_id, player_id, joined_at)
select a.event_id, a.player_id, min(a.submitted_at)
from public.attempts a
where a.event_id is not null
group by a.event_id, a.player_id
on conflict (event_id, player_id) do nothing;

create index if not exists event_participants_event_idx
  on public.event_participants (event_id, joined_at);
create index if not exists event_participants_player_idx
  on public.event_participants (player_id);

alter table public.event_participants enable row level security;

drop policy if exists event_participants_public_read on public.event_participants;
create policy event_participants_public_read on public.event_participants
for select to anon, authenticated using (true);

grant select on public.event_participants to anon, authenticated;
