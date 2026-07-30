-- PR 7A: centrally derived, idempotent badge foundation.
-- Awards are a view over qualified source data. Corrections, soft-deletes and
-- restores therefore remove or recreate awards without duplicate rows.

do $$
begin
  create type public.badge_tier as enum ('bronze', 'silver', 'gold', 'diamond', 'special');
exception when duplicate_object then null;
end;
$$;

create table if not exists public.badge_definitions (
  badge_key text primary key check (badge_key ~ '^[a-z0-9-]+$'),
  category text not null check (
    category in ('attempts', 'wins', 'streak', 'performance', 'record', 'podium')
  ),
  tier public.badge_tier not null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 300),
  threshold integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.badge_definitions enable row level security;

drop policy if exists badge_definitions_public_read on public.badge_definitions;
create policy badge_definitions_public_read on public.badge_definitions
for select to anon, authenticated using (true);

drop policy if exists badge_definitions_admin_insert on public.badge_definitions;
create policy badge_definitions_admin_insert on public.badge_definitions
for insert to authenticated with check (public.is_admin());
drop policy if exists badge_definitions_admin_update on public.badge_definitions;
create policy badge_definitions_admin_update on public.badge_definitions
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists badge_definitions_admin_delete on public.badge_definitions;
create policy badge_definitions_admin_delete on public.badge_definitions
for delete to authenticated using (public.is_admin());

grant select on public.badge_definitions to anon, authenticated;
grant insert, update, delete on public.badge_definitions to authenticated;

insert into public.badge_definitions (
  badge_key, category, tier, name, description, threshold, sort_order
) values
  ('valid-attempts-bronze', 'attempts', 'bronze', 'Eingeschenkt',
    '10 gültige Eventversuche', 10, 10),
  ('valid-attempts-silver', 'attempts', 'silver', 'Stammkraft',
    '50 gültige Eventversuche', 50, 11),
  ('valid-attempts-gold', 'attempts', 'gold', 'Harter Kern',
    '100 gültige Eventversuche', 100, 12),
  ('event-wins-bronze', 'wins', 'bronze', 'Siegertyp',
    '3 gewonnene Events', 3, 20),
  ('event-wins-silver', 'wins', 'silver', 'Seriensieger',
    '5 gewonnene Events', 5, 21),
  ('event-wins-gold', 'wins', 'gold', 'Unangefochten',
    '10 gewonnene Events', 10, 22),
  ('sub3-streak-bronze', 'streak', 'bronze', 'Im Tunnel',
    '3 Eventversuche in Folge unter 3 Sekunden', 3, 30),
  ('sub3-streak-silver', 'streak', 'silver', 'Unaufhaltsam',
    '5 Eventversuche in Folge unter 3 Sekunden', 5, 31),
  ('sub3-streak-gold', 'streak', 'gold', 'Maschine',
    '10 Eventversuche in Folge unter 3 Sekunden', 10, 32),
  ('first-sub5', 'performance', 'bronze', 'Unter fünf',
    'Erstmals unter 5 Sekunden', 500, 40),
  ('first-sub4', 'performance', 'silver', 'Unter vier',
    'Erstmals unter 4 Sekunden', 400, 41),
  ('first-sub3', 'performance', 'gold', 'Unter drei',
    'Erstmals unter 3 Sekunden', 300, 42),
  ('first-sub2', 'performance', 'diamond', 'Unter zwei',
    'Erstmals unter 2 Sekunden', 200, 43),
  ('official-world-record', 'record', 'special', 'Weltrekord',
    'Mindestens einen offiziellen Weltrekord aufgestellt', null, 50),
  ('important-event-gold', 'podium', 'gold', 'Goldenes Podium',
    'Platz 1 bei einem wichtigen Event', 1, 60),
  ('important-event-silver', 'podium', 'silver', 'Silbernes Podium',
    'Platz 2 bei einem wichtigen Event', 2, 61),
  ('important-event-bronze', 'podium', 'bronze', 'Bronzenes Podium',
    'Platz 3 bei einem wichtigen Event', 3, 62)
on conflict (badge_key) do update set
  category = excluded.category,
  tier = excluded.tier,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  sort_order = excluded.sort_order;

create or replace view public.player_badge_awards
with (security_invoker = true)
as
with recursive
qualified_event_attempts as (
  select
    a.id attempt_id,
    a.player_id,
    a.event_id,
    a.time_hundredths,
    a.is_dnf,
    a.submitted_at,
    row_number() over (
      partition by a.player_id order by a.submitted_at, a.id
    ) attempt_sequence
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_ak
    and not p.is_ak
    and not p.is_archived
),
valid_event_attempts as (
  select *,
    row_number() over (
      partition by player_id order by submitted_at, attempt_id
    ) valid_sequence
  from qualified_event_attempts
  where not is_dnf and time_hundredths is not null
),
attempt_milestones as (
  select
    concat(vea.player_id, ':', bd.badge_key) award_key,
    vea.player_id,
    bd.badge_key,
    'attempt'::text source_type,
    vea.attempt_id source_attempt_id,
    null::uuid source_historical_attempt_id,
    vea.event_id source_event_id,
    vea.submitted_at awarded_at,
    jsonb_build_object('count', bd.threshold) metadata
  from valid_event_attempts vea
  join public.badge_definitions bd
    on bd.category = 'attempts' and bd.threshold = vea.valid_sequence
),
ranked_wins as (
  select
    ew.player_id,
    ew.event_id,
    e.closed_at,
    row_number() over (
      partition by ew.player_id
      order by coalesce(e.closed_at, e.ends_at), e.id
    ) win_sequence
  from public.event_winners ew
  join public.events e on e.id = ew.event_id
  where ew.player_id is not null
    and not ew.is_guest
    and e.status = 'closed'
    and e.deleted_at is null
),
win_milestones as (
  select
    concat(rw.player_id, ':', bd.badge_key) award_key,
    rw.player_id,
    bd.badge_key,
    'event'::text source_type,
    null::uuid source_attempt_id,
    null::uuid source_historical_attempt_id,
    rw.event_id source_event_id,
    coalesce(rw.closed_at, e.ends_at) awarded_at,
    jsonb_build_object('wins', bd.threshold) metadata
  from ranked_wins rw
  join public.badge_definitions bd
    on bd.category = 'wins' and bd.threshold = rw.win_sequence
  join public.events e on e.id = rw.event_id
),
streak_groups as (
  select qea.*,
    sum(
      case when qea.is_dnf or qea.time_hundredths is null
        or qea.time_hundredths >= 300 then 1 else 0 end
    ) over (
      partition by qea.player_id
      order by qea.submitted_at, qea.attempt_id
      rows between unbounded preceding and current row
    ) streak_group
  from qualified_event_attempts qea
),
streak_attempts as (
  select sg.*,
    row_number() over (
      partition by sg.player_id, sg.streak_group
      order by sg.submitted_at, sg.attempt_id
    ) streak_length
  from streak_groups sg
  where not sg.is_dnf
    and sg.time_hundredths is not null
    and sg.time_hundredths < 300
),
first_streak_milestones as (
  select *,
    row_number() over (
      partition by player_id, badge_key
      order by submitted_at, attempt_id
    ) milestone_occurrence
  from (
    select
      concat(sa.player_id, ':', bd.badge_key) award_key,
      sa.player_id,
      bd.badge_key,
      sa.attempt_id source_attempt_id,
      sa.event_id source_event_id,
      sa.submitted_at,
      bd.threshold
    from streak_attempts sa
    join public.badge_definitions bd
      on bd.category = 'streak' and bd.threshold = sa.streak_length
  ) reached_streaks
),
streak_milestones as (
  select
    award_key,
    player_id,
    badge_key,
    'attempt'::text source_type,
    source_attempt_id,
    null::uuid source_historical_attempt_id,
    source_event_id,
    submitted_at awarded_at,
    jsonb_build_object('streak', threshold, 'scope', 'all-events') metadata
  from first_streak_milestones
  where milestone_occurrence = 1
),
performance_sources as (
  select
    a.player_id,
    a.id source_attempt_id,
    null::uuid source_historical_attempt_id,
    a.event_id source_event_id,
    a.time_hundredths,
    a.submitted_at achieved_at,
    0 source_priority
  from public.attempts a
  left join public.events e on e.id = a.event_id
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_dnf
    and not a.is_ak
    and not p.is_ak
    and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
  union all
  select
    h.player_id,
    null::uuid,
    h.id,
    null::uuid,
    h.time_hundredths,
    (h.attempt_date::timestamp + make_interval(secs => h.sort_order))
      at time zone 'Europe/Berlin',
    1
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null
    and not h.is_guest
    and not h.out_of_competition
    and not p.is_ak
    and not p.is_archived
),
first_performance_milestones as (
  select *,
    row_number() over (
      partition by player_id, badge_key
      order by achieved_at, source_priority,
        coalesce(source_attempt_id, source_historical_attempt_id)
    ) milestone_occurrence
  from (
    select
      concat(ps.player_id, ':', bd.badge_key) award_key,
      ps.player_id,
      bd.badge_key,
      ps.source_attempt_id,
      ps.source_historical_attempt_id,
      ps.source_event_id,
      ps.achieved_at,
      ps.time_hundredths
    from performance_sources ps
    join public.badge_definitions bd
      on bd.category = 'performance'
      and ps.time_hundredths < bd.threshold
  ) reached_performance
),
performance_milestones as (
  select
    award_key,
    player_id,
    badge_key,
    case when source_attempt_id is null
      then 'historical_attempt' else 'attempt' end source_type,
    source_attempt_id,
    source_historical_attempt_id,
    source_event_id,
    achieved_at awarded_at,
    jsonb_build_object('timeHundredths', time_hundredths) metadata
  from first_performance_milestones
  where milestone_occurrence = 1
),
first_world_records as (
  select *,
    row_number() over (
      partition by player_id order by achieved_at, attempt_id
    ) record_sequence
  from public.world_record_progression
),
world_record_badges as (
  select
    concat(fwr.player_id, ':official-world-record') award_key,
    fwr.player_id,
    'official-world-record'::text badge_key,
    fwr.source_type,
    case when fwr.source_type = 'attempt' then fwr.attempt_id
      else null::uuid end source_attempt_id,
    case when fwr.source_type = 'historical_attempt' then fwr.attempt_id
      else null::uuid end source_historical_attempt_id,
    fwr.event_id source_event_id,
    fwr.achieved_at awarded_at,
    jsonb_build_object('timeHundredths', fwr.time_hundredths) metadata
  from first_world_records fwr
  where fwr.record_sequence = 1
),
important_podium_badges as (
  select
    concat(ep.player_id, ':important-event:', ep.event_id, ':', ep.rank) award_key,
    ep.player_id,
    case ep.rank
      when 1 then 'important-event-gold'
      when 2 then 'important-event-silver'
      when 3 then 'important-event-bronze'
    end badge_key,
    'event'::text source_type,
    null::uuid source_attempt_id,
    null::uuid source_historical_attempt_id,
    ep.event_id source_event_id,
    coalesce(e.closed_at, e.ends_at) awarded_at,
    jsonb_build_object(
      'eventName', coalesce(e.name, e.start_date::text),
      'eventDate', e.start_date,
      'rank', ep.rank
    ) metadata
  from public.event_podium ep
  join public.events e on e.id = ep.event_id
  where ep.player_id is not null
    and not ep.is_guest
    and ep.rank between 1 and 3
    and e.is_important
    and e.status = 'closed'
    and e.deleted_at is null
),
all_awards as (
  select * from attempt_milestones
  union all select * from win_milestones
  union all select * from streak_milestones
  union all select * from performance_milestones
  union all select * from world_record_badges
  union all select * from important_podium_badges
)
select
  award_key,
  player_id,
  badge_key,
  source_type,
  source_attempt_id,
  source_historical_attempt_id,
  source_event_id,
  awarded_at,
  metadata
from all_awards;

create or replace view public.public_player_badges
with (security_invoker = true)
as
select
  pba.award_key,
  pba.player_id,
  p.display_name,
  p.avatar_url,
  pba.badge_key,
  bd.category,
  bd.tier,
  bd.name,
  bd.description,
  pba.source_type,
  pba.source_attempt_id,
  pba.source_historical_attempt_id,
  pba.source_event_id,
  pba.awarded_at,
  pba.metadata
from public.player_badge_awards pba
join public.badge_definitions bd on bd.badge_key = pba.badge_key
join public.players p on p.id = pba.player_id
where not p.is_ak and not p.is_archived;

grant select on public.player_badge_awards, public.public_player_badges
  to anon, authenticated;
