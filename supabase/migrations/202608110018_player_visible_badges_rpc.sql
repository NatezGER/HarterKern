-- Player-scoped badge gallery read model. The existing visible_player_badges
-- view remains unchanged for consumers that need the league-wide result.
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
    select pba.*
    from public.player_badge_awards pba
    join public.players p on p.id = pba.player_id
    where pba.player_id = p_player_id
      and not p.is_ak
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
  ), rarity as materialized (
    select
      pba.badge_key,
      count(distinct pba.player_id)::integer as recipient_count
    from public.player_badge_awards pba
    join relevant_badge_keys relevant
      on relevant.badge_key = pba.badge_key
    join public.players recipient on recipient.id = pba.player_id
    where not recipient.is_ak
      and not recipient.is_archived
    group by pba.badge_key
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
