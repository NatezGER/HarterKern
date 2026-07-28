-- PR 6B: event-bound guests replace the former AK participant model.

create table if not exists public.event_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on update cascade on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  normalized_name text generated always as (public.normalize_player_name(display_name)) stored,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint event_guests_id_event_unique unique (id, event_id),
  constraint event_guests_name_unique unique (event_id, normalized_name)
);

create index if not exists event_guests_event_idx
  on public.event_guests (event_id, joined_at);

alter table public.attempts
  alter column player_id drop not null,
  add column if not exists guest_id uuid
    references public.event_guests(id) on update cascade on delete restrict;

create index if not exists attempts_guest_idx
  on public.attempts (guest_id, submitted_at desc);

alter table public.events
  add column if not exists winner_guest_id uuid
    references public.event_guests(id) on delete set null;

-- Convert every historical AK participant into an event-local guest before
-- enforcing the new exclusive participant relation.
insert into public.event_guests (event_id, display_name, joined_at)
select participant_events.event_id, p.display_name, participant_events.joined_at
from (
  select ep.event_id, ep.player_id, ep.joined_at
  from public.event_participants ep
  union
  select a.event_id, a.player_id, min(a.submitted_at)
  from public.attempts a
  where a.event_id is not null and a.player_id is not null
  group by a.event_id, a.player_id
) participant_events
join public.players p on p.id = participant_events.player_id
where p.is_ak
on conflict (event_id, normalized_name) do nothing;

update public.attempts a
set guest_id = eg.id,
    player_id = null,
    is_ak = false
from public.players p, public.event_guests eg
where a.player_id = p.id
  and p.is_ak
  and a.event_id is not null
  and eg.event_id = a.event_id
  and eg.normalized_name = p.normalized_name;

update public.events e
set winner_guest_id = eg.id,
    winner_player_id = null
from public.players p, public.event_guests eg
where e.winner_player_id = p.id
  and p.is_ak
  and eg.event_id = e.id
  and eg.normalized_name = p.normalized_name;

delete from public.event_participants ep
using public.players p
where ep.player_id = p.id and p.is_ak;

update public.players
set is_archived = true
where is_ak;

alter table public.attempts
  drop constraint if exists attempts_exactly_one_participant;
alter table public.attempts
  add constraint attempts_guest_event_matches
    foreign key (guest_id, event_id)
    references public.event_guests(id, event_id)
    on update cascade on delete restrict;
alter table public.attempts
  add constraint attempts_exactly_one_participant check (
    (player_id is not null and guest_id is null)
    or (player_id is null and guest_id is not null)
  );

alter table public.events
  drop constraint if exists events_exactly_one_winner;
alter table public.events
  add constraint events_exactly_one_winner check (
    winner_player_id is null or winner_guest_id is null
  );

alter table public.event_guests enable row level security;

drop policy if exists event_guests_public_read on public.event_guests;
create policy event_guests_public_read on public.event_guests
for select to anon, authenticated using (true);

grant select on public.event_guests to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.event_guests;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$$;
