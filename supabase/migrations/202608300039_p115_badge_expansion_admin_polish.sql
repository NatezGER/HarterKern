-- P11.5 badge expansion: event-scoped valid attempts, rolling rapid fire and
-- final-event teamwork. Public profile and rarity reads remain ledger-only.

alter table public.badge_definitions
  drop constraint badge_definitions_category_check;

alter table public.badge_definitions
  add constraint badge_definitions_category_check check (category in (
    'attempts', 'wins', 'streak', 'win_streak', 'sub3_streak', 'flawless',
    'favorite_time', 'activity', 'community', 'events', 'podiums',
    'precision', 'most_wanted', 'bingo', 'performance', 'record',
    'first_attempt', 'dnf', 'glitch', 'consolation', 'podium',
    'event_attempts', 'rapid_fire', 'teamwork'
  ));

insert into public.badge_definitions (
  badge_key, category, tier, name, description, threshold, sort_order,
  family_key, requirement, is_secret, badge_kind, design_variant,
  scope_type, is_active
) values
  ('event-attempts-bronze', 'event_attempts', 'bronze',
    'Event-Versuche Bronze',
    'Fünf gültige Versuche innerhalb eines einzelnen Events.', 5, 150,
    'event-attempts', '5 gültige Versuche in einem Event', false,
    'tiered', 'standard', 'event', true),
  ('event-attempts-silver', 'event_attempts', 'silver',
    'Event-Versuche Silber',
    'Zehn gültige Versuche innerhalb eines einzelnen Events.', 10, 151,
    'event-attempts', '10 gültige Versuche in einem Event', false,
    'tiered', 'standard', 'event', true),
  ('event-attempts-gold', 'event_attempts', 'gold',
    'Event-Versuche Gold',
    'Zwanzig gültige Versuche innerhalb eines einzelnen Events.', 20, 152,
    'event-attempts', '20 gültige Versuche in einem Event', false,
    'tiered', 'standard', 'event', true),
  ('event-attempts-diamond', 'event_attempts', 'diamond',
    'Event-Versuche Diamond',
    'Dreißig gültige Versuche innerhalb eines einzelnen Events.', 30, 153,
    'event-attempts', '30 gültige Versuche in einem Event', false,
    'tiered', 'standard', 'event', true),
  ('rapid-fire-bronze', 'rapid_fire', 'bronze', 'Sperrfeuer Bronze',
    'Zwei gültige Versuche innerhalb eines gleitenden 60-Minuten-Fensters.',
    2, 154, 'rapid-fire', '2 gültige Versuche innerhalb von 60 Minuten',
    false, 'tiered', 'standard', 'all_time', true),
  ('rapid-fire-silver', 'rapid_fire', 'silver', 'Sperrfeuer Silber',
    'Vier gültige Versuche innerhalb eines gleitenden 60-Minuten-Fensters.',
    4, 155, 'rapid-fire', '4 gültige Versuche innerhalb von 60 Minuten',
    false, 'tiered', 'standard', 'all_time', true),
  ('rapid-fire-gold', 'rapid_fire', 'gold', 'Sperrfeuer Gold',
    'Sechs gültige Versuche innerhalb eines gleitenden 60-Minuten-Fensters.',
    6, 156, 'rapid-fire', '6 gültige Versuche innerhalb von 60 Minuten',
    false, 'tiered', 'standard', 'all_time', true),
  ('rapid-fire-diamond', 'rapid_fire', 'diamond', 'Sperrfeuer Diamond',
    'Zehn gültige Versuche innerhalb eines gleitenden 60-Minuten-Fensters.',
    10, 157, 'rapid-fire', '10 gültige Versuche innerhalb von 60 Minuten',
    false, 'tiered', 'standard', 'all_time', true),
  ('teamwork-bronze', 'teamwork', 'bronze', 'Teamwork Bronze',
    'In einem abgeschlossenen Event die finale persönliche Bestzeit teilen.',
    1, 158, 'teamwork', 'In 1 Event die finale persönliche Bestzeit teilen',
    false, 'tiered', 'standard', 'all_time', true),
  ('teamwork-silver', 'teamwork', 'silver', 'Teamwork Silber',
    'In drei abgeschlossenen Events die finale persönliche Bestzeit teilen.',
    3, 159, 'teamwork', 'In 3 Events die finale persönliche Bestzeit teilen',
    false, 'tiered', 'standard', 'all_time', true),
  ('teamwork-gold', 'teamwork', 'gold', 'Teamwork Gold',
    'In fünf abgeschlossenen Events die finale persönliche Bestzeit teilen.',
    5, 160, 'teamwork', 'In 5 Events die finale persönliche Bestzeit teilen',
    false, 'tiered', 'standard', 'all_time', true),
  ('teamwork-diamond', 'teamwork', 'diamond', 'Teamwork Diamond',
    'In zehn abgeschlossenen Events die finale persönliche Bestzeit teilen.',
    10, 161, 'teamwork', 'In 10 Events die finale persönliche Bestzeit teilen',
    false, 'tiered', 'standard', 'all_time', true)
on conflict (badge_key) do update set
  category = excluded.category, tier = excluded.tier, name = excluded.name,
  description = excluded.description, threshold = excluded.threshold,
  sort_order = excluded.sort_order, family_key = excluded.family_key,
  requirement = excluded.requirement, is_secret = excluded.is_secret,
  badge_kind = excluded.badge_kind,
  design_variant = excluded.design_variant,
  scope_type = excluded.scope_type, is_active = excluded.is_active;

-- This view is a private canonical eligibility source. It deliberately uses
-- current attempts only: historical rows have no trustworthy time of day and
-- are neither event-scoped attempts nor valid rapid-fire evidence.
create view public.p115_badge_expansion_awards
with (security_invoker = true)
as
with valid_attempts as not materialized (
  select a.id source_id, a.player_id, a.event_id,
    a.submitted_at occurred_at, a.time_hundredths
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and not p.is_ak and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
), event_attempt_progress as (
  select valid_attempts.*,
    row_number() over (
      partition by player_id, event_id
      order by occurred_at, source_id
    )::integer event_valid_attempts
  from valid_attempts
  where event_id is not null
), rapid_fire_progress as (
  select current_attempt.*,
    (select count(*)::integer
      from valid_attempts window_attempt
      where window_attempt.player_id = current_attempt.player_id
        and window_attempt.occurred_at >=
          current_attempt.occurred_at - interval '60 minutes'
        and (window_attempt.occurred_at, window_attempt.source_id) <=
          (current_attempt.occurred_at, current_attempt.source_id)
    ) window_valid_attempts
  from valid_attempts current_attempt
), teamwork_events as (
  select standings.player_id, standings.event_id,
    coalesce(events.closed_at, events.ends_at) occurred_at
  from public.event_final_standings standings
  join public.events events on events.id = standings.event_id
  join public.players players on players.id = standings.player_id
    and not players.is_ak and not players.is_archived
  where standings.player_id is not null
    and standings.best_time_hundredths is not null
    and not standings.is_ak
    and exists (
      select 1
      from public.event_final_standings teammate
      where teammate.event_id = standings.event_id
        and teammate.best_time_hundredths = standings.best_time_hundredths
        and not teammate.is_ak
        and (teammate.player_id is distinct from standings.player_id
          or teammate.guest_id is distinct from standings.guest_id)
    )
), teamwork_progress as (
  select teamwork_events.*,
    row_number() over (
      partition by player_id order by occurred_at, event_id
    )::integer teamwork_events
  from teamwork_events
), all_awards as (
  select concat(progress.player_id, ':', definitions.badge_key) award_key,
    progress.player_id, definitions.badge_key, 'attempt'::text source_type,
    progress.source_id source_attempt_id,
    null::uuid source_historical_attempt_id,
    progress.event_id source_event_id, progress.occurred_at awarded_at,
    jsonb_build_object('progress', progress.event_valid_attempts,
      'scope', 'event') metadata
  from event_attempt_progress progress
  join public.badge_definitions definitions
    on definitions.category = 'event_attempts' and definitions.is_active
    and definitions.threshold = progress.event_valid_attempts
  union all
  select concat(progress.player_id, ':', definitions.badge_key),
    progress.player_id, definitions.badge_key, 'attempt'::text,
    progress.source_id, null::uuid, progress.event_id,
    progress.occurred_at,
    jsonb_build_object('progress', progress.window_valid_attempts,
      'windowMinutes', 60)
  from rapid_fire_progress progress
  join public.badge_definitions definitions
    on definitions.category = 'rapid_fire' and definitions.is_active
    and definitions.threshold = progress.window_valid_attempts
  union all
  select concat(progress.player_id, ':', definitions.badge_key),
    progress.player_id, definitions.badge_key, 'event'::text,
    null::uuid, null::uuid, progress.event_id, progress.occurred_at,
    jsonb_build_object('progress', progress.teamwork_events)
  from teamwork_progress progress
  join public.badge_definitions definitions
    on definitions.category = 'teamwork' and definitions.is_active
    and definitions.threshold = progress.teamwork_events
)
select award_key, player_id, badge_key, source_type, source_attempt_id,
  source_historical_attempt_id, source_event_id, awarded_at, metadata
from all_awards;

revoke all on public.p115_badge_expansion_awards
  from public, anon, authenticated;

create or replace view public.player_badge_award_sync_source
with (security_invoker = true)
as
select * from public.player_badge_awards
union all select * from public.pre_p11_badge_awards
union all select * from public.event_lead_time_badge_awards
union all select * from public.bingo_line_diamond_badge_awards
union all select * from public.p115_badge_expansion_awards;

revoke all on public.player_badge_award_sync_source
  from public, anon, authenticated;

-- An approved insert can change Teamwork for every regular participant of a
-- corrected closed event. Keep the existing statement trigger and expand its
-- targeted player set rather than adding a family-specific trigger.
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
    select attempts.player_id from new_attempts attempts
    where attempts.player_id is not null and attempts.status = 'approved'
      and attempts.deleted_at is null
    union
    select participants.player_id
    from public.event_participants participants
    where participants.event_id in (
      select attempts.event_id from new_attempts attempts
      where attempts.event_id is not null and attempts.status = 'approved'
        and attempts.deleted_at is null
    )
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
    select attempts.player_id from new_attempts attempts
    where attempts.player_id is not null and attempts.status = 'approved'
      and attempts.deleted_at is null
    union
    select participants.player_id
    from public.event_participants participants
    where participants.event_id in (
      select attempts.event_id from new_attempts attempts
      where attempts.event_id is not null and attempts.status = 'approved'
        and attempts.deleted_at is null
    )
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
  end loop;
  return null;
end;
$$;

-- Participant corrections can change the matching PB of every participant in
-- either affected event, so the existing central participant trigger refreshes
-- that bounded event player set.
create or replace function public.refresh_badge_ledger_after_participant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_id uuid;
  old_event_id uuid;
  new_event_id uuid;
  old_player_id uuid;
  new_player_id uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_event_id := old.event_id;
    old_player_id := old.player_id;
  end if;
  if tg_op in ('UPDATE', 'INSERT') then
    new_event_id := new.event_id;
    new_player_id := new.player_id;
  end if;
  for requested_player_id in
    with affected_events as (
      select old_event_id event_id where old_event_id is not null
      union select new_event_id where new_event_id is not null
    )
    select participants.player_id
    from public.event_participants participants
    where participants.event_id in (select event_id from affected_events)
    union
    select attempts.player_id
    from public.attempts attempts
    where attempts.event_id in (select event_id from affected_events)
      and attempts.player_id is not null
    union
    select old_player_id where old_player_id is not null
    union select new_player_id where new_player_id is not null
  loop
    perform public.sync_player_badge_award_ledger(requested_player_id);
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.refresh_badge_ledger_after_attempt_insert(),
  public.refresh_badge_ledger_after_attempt_update(),
  public.refresh_badge_ledger_after_participant_change()
  from public, anon, authenticated;

-- Definitions and the new source now share the same canonical sync path.
select public.sync_all_player_badge_award_ledgers();
