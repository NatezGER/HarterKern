-- PR 7C: additive prestige, progression, activity and group analytics read models.
-- All facts remain derived from qualified attempts and PR 7A foundations.

-- Historical records only carry a calendar date. Keep that date untouched and
-- use existing metadata solely as a hidden deterministic ordering fallback.
create or replace view public.player_pb_progression
with (security_invoker = true)
as
with official_attempts as (
  select
    a.id source_id, a.player_id, p.display_name, a.time_hundredths,
    a.submitted_at achieved_at, a.event_id, 'attempt'::text source_type,
    2 source_priority, 0 source_order
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
    and not a.is_ak and not p.is_ak and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
  union all
  select
    h.id, h.player_id, p.display_name, h.time_hundredths,
    h.attempt_date::timestamp at time zone 'Europe/Berlin', null::uuid,
    'historical_attempt'::text, 1, h.sort_order
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
), ordered_attempts as (
  select *, min(time_hundredths) over (
    partition by player_id
    order by achieved_at, source_priority, source_order, source_id
    rows between unbounded preceding and 1 preceding
  ) previous_best
  from official_attempts
)
select source_id, player_id, display_name, time_hundredths, achieved_at,
  event_id, source_type, source_priority, source_order
from ordered_attempts
where previous_best is null or time_hundredths < previous_best;

create or replace view public.world_record_progression
with (security_invoker = true)
as
with official_attempts as (
  select
    a.id attempt_id, a.player_id, p.display_name, a.time_hundredths,
    a.submitted_at achieved_at, a.event_id, null::text historical_label,
    'attempt'::text source_type, 2 source_priority, 0 source_order
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
    and not a.is_ak and not p.is_ak and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
  union all
  select
    h.id, h.player_id, p.display_name, h.time_hundredths,
    h.attempt_date::timestamp at time zone 'Europe/Berlin', null::uuid,
    h.historical_label, 'historical_attempt'::text, 1, h.sort_order
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
), ordered_attempts as (
  select *, min(time_hundredths) over (
    order by achieved_at, source_priority, source_order, attempt_id
    rows between unbounded preceding and 1 preceding
  ) previous_record
  from official_attempts
)
select attempt_id, player_id, display_name, time_hundredths, achieved_at,
  event_id, historical_label, source_type, source_priority, source_order
from ordered_attempts
where previous_record is null or time_hundredths < previous_record;

alter table public.badge_definitions
  add column if not exists family_key text,
  add column if not exists requirement text,
  add column if not exists is_secret boolean not null default false;

update public.badge_definitions
set family_key = case
    when category = 'attempts' then 'valid-attempts'
    when category = 'wins' then 'event-wins'
    when category = 'streak' then 'sub3-streak'
    when category = 'performance' then 'performance-speed'
    else null
  end,
  requirement = description
where family_key is null or requirement is null;

create table if not exists public.group_milestone_definitions (
  milestone_key text primary key check (milestone_key ~ '^[a-z0-9-]+$'),
  threshold integer not null unique check (threshold > 0),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.group_milestone_definitions enable row level security;
drop policy if exists group_milestones_public_read on public.group_milestone_definitions;
create policy group_milestones_public_read on public.group_milestone_definitions
for select to anon, authenticated using (true);
grant select on public.group_milestone_definitions to anon, authenticated;

insert into public.group_milestone_definitions (
  milestone_key, threshold, name, description, sort_order
) values
  ('official-attempts-100', 100, '100 offizielle Zeiten',
    'Gemeinsam 100 gültige reguläre Eventversuche erreicht.', 10),
  ('official-attempts-500', 500, '500 offizielle Zeiten',
    'Gemeinsam 500 gültige reguläre Eventversuche erreicht.', 20),
  ('official-attempts-1000', 1000, '1.000 offizielle Zeiten',
    'Gemeinsam 1.000 gültige reguläre Eventversuche erreicht.', 30)
on conflict (milestone_key) do update set
  threshold = excluded.threshold,
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

create or replace view public.world_record_history
with (security_invoker = true)
as
with enriched as (
  select
    wr.attempt_id record_id,
    wr.player_id,
    wr.display_name,
    p.avatar_url,
    p.avatar_path,
    wr.time_hundredths,
    wr.achieved_at,
    (wr.achieved_at at time zone 'Europe/Berlin')::date achieved_date,
    wr.event_id,
    coalesce(nullif(trim(e.name), ''), wr.historical_label,
      'Historischer Einzelversuch') source_label,
    wr.source_type,
    row_number() over (
      order by wr.achieved_at, wr.source_priority, wr.source_order, wr.attempt_id
    ) sequence_number
  from public.world_record_progression wr
  join public.players p on p.id = wr.player_id
  left join public.events e on e.id = wr.event_id and e.deleted_at is null
), compared as (
  select *,
    lag(time_hundredths) over (order by sequence_number) previous_record_hundredths,
    lead(achieved_date) over (order by sequence_number) period_end_date,
    max(sequence_number) over () final_sequence
  from enriched
)
select
  record_id,
  player_id,
  display_name,
  avatar_url,
  avatar_path,
  time_hundredths,
  achieved_at,
  achieved_date,
  event_id,
  source_label,
  source_type,
  sequence_number::integer,
  previous_record_hundredths,
  case when previous_record_hundredths is null then null
    else previous_record_hundredths - time_hundredths end improvement_hundredths,
  period_end_date,
  greatest(0, coalesce(period_end_date, current_date) - achieved_date)::integer
    duration_days,
  sequence_number = final_sequence is_current
from compared;

create or replace view public.player_pb_history
with (security_invoker = true)
as
with enriched as (
  select
    pb.source_id,
    pb.player_id,
    pb.display_name,
    pb.time_hundredths,
    pb.achieved_at,
    (pb.achieved_at at time zone 'Europe/Berlin')::date achieved_date,
    pb.event_id,
    coalesce(nullif(trim(e.name), ''), 'Historischer Einzelversuch') source_label,
    pb.source_type,
    row_number() over (
      partition by pb.player_id
      order by pb.achieved_at, pb.source_priority, pb.source_order, pb.source_id
    ) sequence_number
  from public.player_pb_progression pb
  left join public.events e on e.id = pb.event_id and e.deleted_at is null
), compared as (
  select *,
    lag(time_hundredths) over (
      partition by player_id order by sequence_number
    ) previous_best_hundredths,
    lead(achieved_date) over (
      partition by player_id order by sequence_number
    ) period_end_date,
    max(sequence_number) over (partition by player_id) final_sequence
  from enriched
)
select
  source_id,
  player_id,
  display_name,
  time_hundredths,
  achieved_at,
  achieved_date,
  event_id,
  source_label,
  source_type,
  sequence_number::integer,
  previous_best_hundredths,
  case when previous_best_hundredths is null then null
    else previous_best_hundredths - time_hundredths end improvement_hundredths,
  period_end_date,
  greatest(0, coalesce(period_end_date, current_date) - achieved_date)::integer
    duration_days,
  sequence_number = final_sequence is_current
from compared;

create or replace view public.event_attempt_number_statistics
with (security_invoker = true)
as
select
  event_id,
  attempt_number,
  count(*)::integer sample_count,
  round(avg(time_hundredths))::integer average_hundredths,
  min(time_hundredths) best_hundredths,
  max(time_hundredths) slowest_hundredths
from public.event_attempt_details
where not is_dnf
  and not is_ak
  and time_hundredths is not null
group by event_id, attempt_number;

create or replace view public.visible_player_badges
with (security_invoker = true)
as
with enriched as (
  select
    ppb.*,
    p.avatar_path,
    bd.family_key,
    bd.requirement,
    bd.threshold,
    bd.sort_order,
    bd.is_secret,
    e.name source_event_name,
    e.start_date source_event_date,
    ead.attempt_number source_attempt_number,
    ead.time_hundredths source_time_hundredths,
    case when ppb.source_historical_attempt_id is not null
      then h.attempt_date::timestamp at time zone 'Europe/Berlin'
      else ppb.awarded_at end canonical_awarded_at,
    case ppb.tier
      when 'special' then 6
      when 'diamond' then 5
      when 'gold' then 4
      when 'silver' then 3
      when 'bronze' then 2
    end tier_rank
  from public.public_player_badges ppb
  join public.badge_definitions bd on bd.badge_key = ppb.badge_key
  join public.players p on p.id = ppb.player_id
  left join public.events e on e.id = ppb.source_event_id and e.deleted_at is null
  left join public.historical_attempts h
    on h.id = ppb.source_historical_attempt_id and h.deleted_at is null
  left join public.event_attempt_details ead on ead.attempt_id = ppb.source_attempt_id
), ranked as (
  select *,
    row_number() over (
      partition by player_id, coalesce(family_key, award_key)
      order by tier_rank desc, threshold desc nulls last, awarded_at, award_key
    ) family_position
  from enriched
), rarity as (
  select badge_key, count(distinct player_id)::integer recipient_count
  from public.public_player_badges
  group by badge_key
), population as (
  select count(*)::integer regular_player_count
  from public.players where not is_ak and not is_archived
)
select
  r.award_key,
  r.player_id,
  r.display_name,
  r.avatar_url,
  r.avatar_path,
  r.badge_key,
  r.category,
  r.tier,
  r.name,
  r.description,
  r.family_key,
  r.requirement,
  r.threshold,
  r.sort_order,
  r.is_secret,
  r.source_type,
  r.source_attempt_id,
  r.source_historical_attempt_id,
  r.source_event_id,
  r.source_event_name,
  r.source_event_date,
  r.canonical_awarded_at awarded_at,
  r.metadata,
  r.tier_rank,
  rarity.recipient_count,
  population.regular_player_count,
  case when population.regular_player_count = 0 then null
    else round(rarity.recipient_count * 100.0 / population.regular_player_count)::integer
    end rarity_percent,
  r.source_attempt_number,
  r.source_time_hundredths,
  next_badge.badge_key next_badge_key,
  next_badge.name next_badge_name,
  next_badge.requirement next_requirement,
  next_badge.tier next_tier,
  next_badge.threshold next_threshold,
  case r.category
    when 'attempts' then ps.valid_attempts
    when 'wins' then ps.event_wins
    when 'performance' then ps.personal_best_hundredths
    when 'streak' then r.threshold
    else null
  end current_progress,
  r.category = 'podium' and r.source_event_id is not null is_special_event_badge
from ranked r
join rarity on rarity.badge_key = r.badge_key
cross join population
left join public.player_statistics ps on ps.player_id = r.player_id
left join lateral (
  select
    bd.badge_key, bd.name, bd.requirement, bd.tier, bd.threshold,
    case bd.tier when 'special' then 6 when 'diamond' then 5
      when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end next_rank
  from public.badge_definitions bd
  where bd.family_key = r.family_key
    and case bd.tier when 'special' then 6 when 'diamond' then 5
      when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end > r.tier_rank
  order by next_rank, bd.threshold nulls last, bd.sort_order
  limit 1
) next_badge on true
where r.family_position = 1;

create or replace view public.badge_rarity_statistics
with (security_invoker = true)
as
with population as (
  select count(*)::integer regular_player_count
  from public.players where not is_ak and not is_archived
)
select
  ppb.badge_key,
  ppb.name,
  ppb.tier,
  case ppb.tier when 'special' then 6 when 'diamond' then 5
    when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end tier_rank,
  bd.sort_order,
  count(distinct ppb.player_id)::integer recipient_count,
  population.regular_player_count,
  case when population.regular_player_count = 0 then null
    else round(count(distinct ppb.player_id) * 100.0 /
      population.regular_player_count)::integer end rarity_percent
from public.public_player_badges ppb
join public.badge_definitions bd on bd.badge_key = ppb.badge_key
cross join population
group by ppb.badge_key, ppb.name, ppb.tier, bd.sort_order,
  population.regular_player_count;

create or replace view public.event_badge_unlocks
with (security_invoker = true)
as
select
  ppb.award_key,
  ppb.player_id,
  ppb.display_name,
  ppb.avatar_url,
  p.avatar_path,
  ppb.badge_key,
  ppb.category,
  ppb.tier,
  ppb.name,
  ppb.description,
  bd.family_key,
  bd.requirement,
  bd.threshold,
  bd.sort_order,
  bd.is_secret,
  ppb.source_type,
  ppb.source_attempt_id,
  ppb.source_historical_attempt_id,
  ppb.source_event_id,
  e.name source_event_name,
  e.start_date source_event_date,
  ppb.awarded_at,
  ppb.metadata,
  brs.tier_rank,
  brs.recipient_count,
  brs.regular_player_count,
  brs.rarity_percent,
  ead.attempt_number source_attempt_number,
  ead.time_hundredths source_time_hundredths,
  null::text next_badge_key,
  null::text next_badge_name,
  null::text next_requirement,
  null::public.badge_tier next_tier,
  null::integer next_threshold,
  null::integer current_progress,
  ppb.category = 'podium' is_special_event_badge
from public.public_player_badges ppb
join public.players p on p.id = ppb.player_id
join public.badge_definitions bd on bd.badge_key = ppb.badge_key
join public.badge_rarity_statistics brs on brs.badge_key = ppb.badge_key
join public.events e on e.id = ppb.source_event_id and e.deleted_at is null
left join public.event_attempt_details ead on ead.attempt_id = ppb.source_attempt_id;

create or replace view public.group_milestone_progress
with (security_invoker = true)
as
with qualified as (
  select
    a.id attempt_id,
    a.player_id,
    a.event_id,
    a.submitted_at,
    row_number() over (order by a.submitted_at, a.id) attempt_sequence
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_dnf
    and a.time_hundredths is not null
    and not a.is_ak
    and not p.is_ak
    and not p.is_archived
), total as (
  select count(*)::integer current_count from qualified
)
select
  d.milestone_key,
  d.threshold,
  d.name,
  d.description,
  d.sort_order,
  total.current_count,
  total.current_count >= d.threshold achieved,
  q.attempt_id source_attempt_id,
  q.player_id source_player_id,
  p.display_name source_player_name,
  q.event_id source_event_id,
  e.name source_event_name,
  q.submitted_at achieved_at
from public.group_milestone_definitions d
cross join total
left join qualified q on q.attempt_sequence = d.threshold
left join public.players p on p.id = q.player_id
left join public.events e on e.id = q.event_id and e.deleted_at is null;

create or replace view public.player_prestige_statistics
with (security_invoker = true)
as
with pb as (
  select
    player_id,
    count(*)::integer pb_count,
    max(improvement_hundredths)::integer largest_pb_improvement_hundredths,
    round(avg(improvement_hundredths) filter (
      where improvement_hundredths is not null
    ))::integer average_pb_improvement_hundredths
  from public.player_pb_history
  group by player_id
), wr as (
  select
    player_id,
    count(*)::integer world_record_count,
    sum(duration_days)::integer world_record_days,
    max(duration_days)::integer longest_world_record_days
  from public.world_record_history
  group by player_id
), badges as (
  select player_id, count(*)::integer visible_badge_count
  from public.visible_player_badges group by player_id
)
select
  p.id player_id,
  coalesce(pb.pb_count, 0) pb_count,
  pb.largest_pb_improvement_hundredths,
  pb.average_pb_improvement_hundredths,
  coalesce(wr.world_record_count, 0) world_record_count,
  coalesce(wr.world_record_days, 0) world_record_days,
  coalesce(wr.longest_world_record_days, 0) longest_world_record_days,
  coalesce(badges.visible_badge_count, 0) visible_badge_count
from public.players p
left join pb on pb.player_id = p.id
left join wr on wr.player_id = p.id
left join badges on badges.player_id = p.id
where not p.is_ak and not p.is_archived;

create or replace view public.prestige_activity_feed
with (security_invoker = true)
as
with wr_activities as (
  select
    concat('wr:', wr.record_id) activity_id,
    'world_record'::text activity_type,
    wr.achieved_at occurred_at,
    wr.player_id,
    wr.display_name,
    wr.avatar_url,
    wr.avatar_path,
    wr.event_id,
    wr.source_label event_name,
    'Neuer Weltrekord'::text title,
    concat(wr.display_name, ' stellte mit ',
      to_char(wr.time_hundredths / 100.0, 'FM990D00'), ' s einen Weltrekord auf.') description,
    wr.time_hundredths,
    null::text badge_key,
    null::public.badge_tier tier,
    100 priority
  from public.world_record_history wr
), pb_activities as (
  select
    concat('pb:', pb.source_id) activity_id,
    'personal_best'::text activity_type,
    pb.achieved_at occurred_at,
    pb.player_id,
    pb.display_name,
    p.avatar_url,
    p.avatar_path,
    pb.event_id,
    pb.source_label event_name,
    'Neue persönliche Bestzeit'::text title,
    concat(pb.display_name, ' verbesserte sich auf ',
      to_char(pb.time_hundredths / 100.0, 'FM990D00'), ' s.') description,
    pb.time_hundredths,
    null::text badge_key,
    null::public.badge_tier tier,
    70 priority
  from public.player_pb_history pb
  join public.players p on p.id = pb.player_id
  where not exists (
    select 1 from public.world_record_history wr where wr.record_id = pb.source_id
  )
), badge_activities as (
  select
    concat('badge:', ppb.award_key) activity_id,
    'badge'::text activity_type,
    ppb.awarded_at occurred_at,
    ppb.player_id,
    ppb.display_name,
    ppb.avatar_url,
    p.avatar_path,
    ppb.source_event_id event_id,
    coalesce(e.name, 'Historischer Einzelversuch') event_name,
    concat('Badge: ', ppb.name) title,
    concat(ppb.display_name, ' erhielt „', ppb.name, '“.') description,
    null::integer time_hundredths,
    ppb.badge_key,
    ppb.tier,
    case ppb.tier when 'special' then 95 when 'diamond' then 90
      when 'gold' then 80 when 'silver' then 60 else 50 end priority
  from public.visible_player_badges ppb
  join public.players p on p.id = ppb.player_id
  left join public.events e on e.id = ppb.source_event_id and e.deleted_at is null
), milestone_activities as (
  select
    concat('milestone:', gm.milestone_key) activity_id,
    'group_milestone'::text activity_type,
    gm.achieved_at occurred_at,
    gm.source_player_id player_id,
    gm.source_player_name display_name,
    p.avatar_url,
    p.avatar_path,
    gm.source_event_id event_id,
    gm.source_event_name event_name,
    gm.name title,
    gm.description,
    null::integer time_hundredths,
    null::text badge_key,
    null::public.badge_tier tier,
    75 priority
  from public.group_milestone_progress gm
  left join public.players p on p.id = gm.source_player_id
  where gm.achieved
)
select * from wr_activities
union all select * from pb_activities
union all select * from badge_activities
union all select * from milestone_activities;

grant select on public.world_record_history, public.player_pb_history,
  public.event_attempt_number_statistics, public.visible_player_badges,
  public.event_badge_unlocks, public.badge_rarity_statistics, public.group_milestone_progress,
  public.player_prestige_statistics, public.prestige_activity_feed
  to anon, authenticated;
