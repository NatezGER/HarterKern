-- Final Pre-P11 polish: event-best breaks, player-scoped lead values,
-- lead-time badges and historical trophy asset slots.

create view public.event_best_breaks
with (security_invoker = true)
as
with eligible_attempts as (
  select a.id source_attempt_id, a.event_id, a.player_id,
    a.time_hundredths, a.submitted_at,
    min(a.time_hundredths) over (
      partition by a.event_id order by a.submitted_at, a.id
      rows between unbounded preceding and 1 preceding
    ) prior_event_best
  from public.attempts a
  join public.qualified_event_players eligible
    on eligible.event_id = a.event_id and eligible.player_id = a.player_id
  join public.events e on e.id = a.event_id
    and e.deleted_at is null and e.status = 'closed'
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
)
select attempts.source_attempt_id, attempts.event_id, attempts.player_id,
  attempts.time_hundredths, attempts.prior_event_best,
  attempts.submitted_at broke_at,
  extract(year from e.start_date)::integer season_year
from eligible_attempts attempts
join public.events e on e.id = attempts.event_id
where attempts.prior_event_best is not null
  and attempts.time_hundredths < attempts.prior_event_best;

create view public.event_lead_player_statistics_v2
with (security_invoker = true)
as
with lead_stats as (
  select player_id, season_year,
    sum(total_lead_seconds)::bigint total_lead_seconds,
    sum(lead_takeovers)::integer lead_takeovers,
    sum(lead_losses)::integer lead_losses,
    sum(events_led)::integer events_led,
    max(longest_lead_seconds)::bigint longest_lead_seconds,
    sum(lead_segment_count)::integer lead_segment_count,
    sum(qualified_event_duration_seconds)::bigint qualified_event_duration_seconds
  from public.event_lead_player_statistics
  group by player_id, season_year
), break_stats as (
  select player_id, season_year, count(*)::integer event_best_breaks
  from public.event_best_breaks
  group by player_id, season_year
), player_seasons as (
  select player_id, season_year from lead_stats
  union
  select player_id, season_year from break_stats
)
select keys.player_id, p.display_name, p.avatar_url, p.avatar_path,
  keys.season_year,
  coalesce(leads.total_lead_seconds, 0)::bigint total_lead_seconds,
  coalesce(leads.lead_takeovers, 0)::integer lead_takeovers,
  coalesce(leads.lead_losses, 0)::integer lead_losses,
  coalesce(leads.events_led, 0)::integer events_led,
  coalesce(leads.longest_lead_seconds, 0)::bigint longest_lead_seconds,
  coalesce(leads.lead_segment_count, 0)::integer lead_segment_count,
  coalesce(leads.qualified_event_duration_seconds, 0)::bigint
    qualified_event_duration_seconds,
  case when coalesce(leads.qualified_event_duration_seconds, 0) = 0 then 0
    else round(leads.total_lead_seconds::numeric
      / leads.qualified_event_duration_seconds * 100, 1) end lead_share_percent,
  case when coalesce(leads.lead_segment_count, 0) = 0 then 0
    else round(leads.total_lead_seconds::numeric
      / leads.lead_segment_count)::bigint end average_lead_seconds,
  coalesce(breaks.event_best_breaks, 0)::integer event_best_breaks
from player_seasons keys
join public.players p on p.id = keys.player_id
left join lead_stats leads using (player_id, season_year)
left join break_stats breaks using (player_id, season_year)
where not p.is_ak and not p.is_archived;

create view public.event_lead_participant_statistics
with (security_invoker = true)
as
with leads as (
  select event_id, player_id, sum(duration_seconds)::bigint lead_seconds
  from public.event_lead_segments
  group by event_id, player_id
), breaks as (
  select event_id, player_id, count(*)::integer event_best_breaks
  from public.event_best_breaks
  group by event_id, player_id
), keys as (
  select event_id, player_id from leads
  union
  select event_id, player_id from breaks
)
select keys.event_id, keys.player_id,
  coalesce(leads.lead_seconds, 0)::bigint lead_seconds,
  coalesce(breaks.event_best_breaks, 0)::integer event_best_breaks
from keys
left join leads using (event_id, player_id)
left join breaks using (event_id, player_id);

create function public.get_player_event_lead_statistics(
  p_player_id uuid,
  p_season_year integer default null
)
returns table (total_lead_seconds bigint, event_best_breaks integer)
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(stats.total_lead_seconds), 0)::bigint,
    coalesce(sum(stats.event_best_breaks), 0)::integer
  from public.event_lead_player_statistics_v2 stats
  where stats.player_id = p_player_id
    and (p_season_year is null or stats.season_year = p_season_year);
$$;

insert into public.badge_definitions (
  badge_key, category, tier, name, description, threshold, sort_order,
  family_key, requirement, is_secret, badge_kind, design_variant,
  scope_type, is_active
) values
  ('event-lead-time-bronze', 'event_lead', 'bronze', 'Führungszeit Bronze',
    'Positive offizielle Event-Führungszeit erreicht.', 1, 220,
    'event-lead-time', 'Positive offizielle Event-Führungszeit erreichen',
    false, 'tiered', 'standard', 'all_time', true),
  ('event-lead-time-silver', 'event_lead', 'silver', 'Führungszeit Silber',
    'Mindestens 10 Stunden offizielle Event-Führungszeit.', 36000, 221,
    'event-lead-time', '10 Stunden offizielle Event-Führungszeit erreichen',
    false, 'tiered', 'standard', 'all_time', true),
  ('event-lead-time-gold', 'event_lead', 'gold', 'Führungszeit Gold',
    'Mindestens 100 Stunden offizielle Event-Führungszeit.', 360000, 222,
    'event-lead-time', '100 Stunden offizielle Event-Führungszeit erreichen',
    false, 'tiered', 'standard', 'all_time', true),
  ('event-lead-time-diamond', 'event_lead', 'diamond', 'Führungszeit Diamant',
    'Mindestens 1.000 Stunden offizielle Event-Führungszeit.', 3600000, 223,
    'event-lead-time', '1.000 Stunden offizielle Event-Führungszeit erreichen',
    false, 'tiered', 'standard', 'all_time', true)
on conflict (badge_key) do update set
  category = excluded.category, tier = excluded.tier, name = excluded.name,
  description = excluded.description, threshold = excluded.threshold,
  sort_order = excluded.sort_order, family_key = excluded.family_key,
  requirement = excluded.requirement, is_secret = excluded.is_secret,
  badge_kind = excluded.badge_kind, design_variant = excluded.design_variant,
  scope_type = excluded.scope_type;

create view public.event_lead_time_badge_awards
with (security_invoker = true)
as
with tiers(badge_key, threshold) as (
  values ('event-lead-time-bronze'::text, 1::bigint),
    ('event-lead-time-silver', 36000::bigint),
    ('event-lead-time-gold', 360000::bigint),
    ('event-lead-time-diamond', 3600000::bigint)
), progression as (
  select segments.*,
    coalesce(sum(duration_seconds) over (
      partition by player_id order by lead_started_at, event_id, sequence
      rows between unbounded preceding and 1 preceding
    ), 0)::bigint prior_total,
    sum(duration_seconds) over (partition by player_id)::bigint current_total
  from public.event_lead_segments segments
  where duration_seconds > 0
), crossings as (
  select progression.*, tiers.badge_key, tiers.threshold,
    row_number() over (
      partition by progression.player_id, tiers.badge_key
      order by progression.lead_started_at, progression.event_id,
        progression.sequence
    ) crossing_sequence
  from progression
  join tiers on progression.prior_total < tiers.threshold
    and progression.prior_total + progression.duration_seconds >= tiers.threshold
)
select concat(player_id, ':', badge_key) award_key, player_id, badge_key,
  'event'::text source_type, null::uuid source_attempt_id,
  null::uuid source_historical_attempt_id, event_id source_event_id,
  lead_started_at + make_interval(
    secs => (threshold - prior_total)::double precision
  ) awarded_at,
  jsonb_build_object('progress', current_total) metadata
from crossings
where crossing_sequence = 1;

create or replace view public.public_player_badges
with (security_invoker = true)
as
with combined_awards as (
  select * from public.player_badge_awards
  union all select * from public.pre_p11_badge_awards
  union all select * from public.event_lead_time_badge_awards
)
select awards.award_key, awards.player_id, p.display_name, p.avatar_url,
  awards.badge_key, bd.category, bd.tier, bd.name, bd.description,
  awards.source_type, awards.source_attempt_id,
  awards.source_historical_attempt_id, awards.source_event_id,
  awards.awarded_at, awards.metadata, bd.badge_kind,
  bd.design_variant, bd.scope_type
from combined_awards awards
join public.badge_definitions bd
  on bd.badge_key = awards.badge_key and bd.is_active
join public.players p on p.id = awards.player_id
where not p.is_ak and not p.is_archived;

alter table public.award_assets
  drop constraint if exists award_assets_asset_id_check;

create or replace function public.get_visible_player_badges(p_player_id uuid)
returns table (
  award_key text,
  player_id uuid,
  display_name text,
  avatar_url text,
  avatar_path text,
  badge_key text,
  category text,
  tier public.badge_tier,
  name text,
  description text,
  family_key text,
  requirement text,
  threshold integer,
  sort_order integer,
  is_secret boolean,
  source_type text,
  source_attempt_id uuid,
  source_historical_attempt_id uuid,
  source_event_id uuid,
  source_event_name text,
  source_event_date date,
  awarded_at timestamptz,
  metadata jsonb,
  tier_rank integer,
  recipient_count integer,
  regular_player_count integer,
  rarity_percent integer,
  source_attempt_number integer,
  source_time_hundredths integer,
  next_badge_key text,
  next_badge_name text,
  next_requirement text,
  next_tier public.badge_tier,
  next_threshold integer,
  current_progress integer,
  is_special_event_badge boolean,
  badge_kind text,
  design_variant text,
  scope_type text
)
language sql
stable
security invoker
set search_path = public
as $$
  with requested_awards as materialized (
    select awards.*
    from (
      select pba.*
      from public.player_badge_awards pba
      where pba.player_id = p_player_id
      union all
      select supplemental.*
      from public.pre_p11_badge_awards supplemental
      where supplemental.player_id = p_player_id
      union all
      select lead_award.*
      from public.event_lead_time_badge_awards lead_award
      where lead_award.player_id = p_player_id
    ) awards
    join public.players p on p.id = awards.player_id
    where not p.is_ak
      and not p.is_archived
  ), enriched as (
    select
      ra.*,
      p.display_name,
      p.avatar_url,
      p.avatar_path,
      bd.category,
      bd.tier,
      bd.name,
      bd.description,
      bd.family_key,
      bd.requirement,
      bd.threshold,
      bd.sort_order,
      bd.is_secret,
      e.name as source_event_name,
      e.start_date as source_event_date,
      ead.attempt_number as source_attempt_number,
      ead.time_hundredths as source_time_hundredths,
      case when ra.source_historical_attempt_id is not null
        then h.attempt_date::timestamp at time zone 'Europe/Berlin'
        else ra.awarded_at end as canonical_awarded_at,
      case bd.tier
        when 'special' then 6 when 'diamond' then 5 when 'gold' then 4
        when 'silver' then 3 when 'bronze' then 2 end as tier_rank,
      bd.badge_kind,
      bd.design_variant,
      bd.scope_type
    from requested_awards ra
    join public.players p on p.id = ra.player_id
    join public.badge_definitions bd
      on bd.badge_key = ra.badge_key and bd.is_active
    left join public.events e
      on e.id = ra.source_event_id and e.deleted_at is null
    left join public.historical_attempts h
      on h.id = ra.source_historical_attempt_id and h.deleted_at is null
    left join public.event_attempt_details ead
      on ead.attempt_id = ra.source_attempt_id
  ), ranked as materialized (
    select enriched.*, row_number() over (
      partition by player_id, coalesce(family_key, award_key)
      order by tier_rank desc, threshold desc nulls last, awarded_at, award_key
    ) as family_position
    from enriched
  ), relevant_badge_keys as materialized (
    select distinct badge_key
    from ranked
    where family_position = 1
  ), relevant_award_recipients as materialized (
    select pba.player_id, pba.badge_key
    from public.player_badge_awards pba
    join relevant_badge_keys relevant on relevant.badge_key = pba.badge_key
    union all
    select supplemental.player_id, supplemental.badge_key
    from public.pre_p11_badge_awards supplemental
    join relevant_badge_keys relevant
      on relevant.badge_key = supplemental.badge_key
    union all
    select lead_award.player_id, lead_award.badge_key
    from public.event_lead_time_badge_awards lead_award
    join relevant_badge_keys relevant
      on relevant.badge_key = lead_award.badge_key
  ), rarity as materialized (
    select
      awards.badge_key,
      count(distinct awards.player_id)::integer as recipient_count
    from relevant_award_recipients awards
    join public.players recipient on recipient.id = awards.player_id
    where not recipient.is_ak
      and not recipient.is_archived
    group by awards.badge_key
  ), population as materialized (
    select count(*)::integer as regular_player_count
    from public.players
    where not is_ak and not is_archived
  )
  select
    r.award_key, r.player_id, r.display_name, r.avatar_url, r.avatar_path,
    r.badge_key, r.category, r.tier, r.name, r.description, r.family_key,
    r.requirement, r.threshold, r.sort_order, r.is_secret, r.source_type,
    r.source_attempt_id, r.source_historical_attempt_id, r.source_event_id,
    r.source_event_name, r.source_event_date,
    r.canonical_awarded_at as awarded_at, r.metadata, r.tier_rank,
    rarity.recipient_count, population.regular_player_count,
    case when population.regular_player_count = 0 then null
      else round(rarity.recipient_count * 100.0 /
        population.regular_player_count)::integer
      end as rarity_percent,
    r.source_attempt_number, r.source_time_hundredths,
    next_badge.badge_key as next_badge_key,
    next_badge.name as next_badge_name,
    next_badge.requirement as next_requirement,
    next_badge.tier as next_tier,
    next_badge.threshold as next_threshold,
    coalesce((r.metadata->>'progress')::integer,
      case r.category
        when 'attempts' then ps.valid_attempts
        when 'wins' then ps.event_wins
        when 'performance' then ps.personal_best_hundredths
        else null end) as current_progress,
    false as is_special_event_badge,
    r.badge_kind,
    r.design_variant,
    r.scope_type
  from ranked r
  join rarity on rarity.badge_key = r.badge_key
  cross join population
  left join public.player_statistics ps on ps.player_id = r.player_id
  left join lateral (
    select bd.badge_key, bd.name, bd.requirement, bd.tier, bd.threshold,
      case bd.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end as next_rank
    from public.badge_definitions bd
    where bd.family_key = r.family_key and bd.is_active
      and case bd.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end > r.tier_rank
    order by next_rank, bd.threshold nulls last, bd.sort_order
    limit 1
  ) next_badge on true
  where r.family_position = 1
  order by r.tier_rank desc, is_special_event_badge desc,
    rarity.recipient_count, r.sort_order, r.award_key;
$$;

revoke all on function public.get_visible_player_badges(uuid) from public;
grant execute on function public.get_visible_player_badges(uuid) to anon, authenticated;

alter table public.award_assets
  add constraint award_assets_asset_id_check check (
    asset_id ~ '^medal:podium:(gold|silver|bronze)$'
    or asset_id ~ '^badge:[a-z0-9][a-z0-9-]{1,119}$'
    or asset_id ~ '^trophy:(season|denmark):2026:(gold|silver|bronze)$'
    or asset_id ~ '^trophy:historical:(first-sub-3|first-sub-2|first-bingo-card)$'
  );

grant select on public.event_best_breaks,
  public.event_lead_player_statistics_v2,
  public.event_lead_participant_statistics,
  public.event_lead_time_badge_awards to anon, authenticated;
revoke all on function public.get_player_event_lead_statistics(uuid, integer)
  from public;
grant execute on function public.get_player_event_lead_statistics(uuid, integer)
  to anon, authenticated;
