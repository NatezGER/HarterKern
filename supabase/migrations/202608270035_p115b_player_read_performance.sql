-- P11.5 B: keep public award semantics unchanged while moving profile filters
-- ahead of league-wide enrichment and combining repeated BINGO/rarity reads.

create index if not exists attempts_player_profile_read_idx
  on public.attempts (player_id, submitted_at, id)
  include (event_id, time_hundredths, is_dnf)
  where status = 'approved' and deleted_at is null and not is_ak;

create index if not exists historical_attempts_player_profile_read_idx
  on public.historical_attempts (player_id, attempt_date, sort_order, id)
  include (time_hundredths)
  where deleted_at is null and not is_guest and not out_of_competition;

-- Migration 033 deliberately centralized the visible set, but routing the
-- player RPC through visible_player_badges also evaluates its league-wide
-- ranking/rarity chain. Keep the same four award sources and enrich only the
-- requested player's rows before calculating rarity for the surviving keys.
create or replace function public.get_visible_player_badges(p_player_id uuid)
returns table (
  award_key text, player_id uuid, display_name text, avatar_url text,
  avatar_path text, badge_key text, category text, tier public.badge_tier,
  name text, description text, family_key text, requirement text,
  threshold integer, sort_order integer, is_secret boolean, source_type text,
  source_attempt_id uuid, source_historical_attempt_id uuid,
  source_event_id uuid, source_event_name text, source_event_date date,
  awarded_at timestamptz, metadata jsonb, tier_rank integer,
  recipient_count integer, regular_player_count integer, rarity_percent integer,
  source_attempt_number integer, source_time_hundredths integer,
  next_badge_key text, next_badge_name text, next_requirement text,
  next_tier public.badge_tier, next_threshold integer, current_progress integer,
  is_special_event_badge boolean, badge_kind text, design_variant text,
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
      select source.* from public.player_badge_awards source
        where source.player_id = p_player_id
      union all
      select source.* from public.pre_p11_badge_awards source
        where source.player_id = p_player_id
      union all
      select source.* from public.event_lead_time_badge_awards source
        where source.player_id = p_player_id
      union all
      select source.* from public.bingo_line_diamond_badge_awards source
        where source.player_id = p_player_id
    ) awards
    join public.players p on p.id = awards.player_id
    where not p.is_ak and not p.is_archived
  ), enriched as (
    select ra.*, p.display_name, p.avatar_url, p.avatar_path,
      bd.category, bd.tier, bd.name, bd.description, bd.family_key,
      bd.requirement, bd.threshold, bd.sort_order, bd.is_secret,
      e.name source_event_name, e.start_date source_event_date,
      ead.attempt_number source_attempt_number,
      coalesce(ead.time_hundredths,
        (ra.metadata->>'timeHundredths')::integer) source_time_hundredths,
      case when ra.source_historical_attempt_id is not null
        then h.attempt_date::timestamp at time zone 'Europe/Berlin'
        else ra.awarded_at end canonical_awarded_at,
      case bd.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end tier_rank,
      bd.badge_kind, bd.design_variant, bd.scope_type
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
    ) family_position
    from enriched
  ), relevant_badge_keys as materialized (
    select distinct badge_key from ranked where family_position = 1
  ), relevant_award_recipients as materialized (
    select source.player_id, source.badge_key
    from public.player_badge_awards source
    join relevant_badge_keys relevant using (badge_key)
    union all
    select source.player_id, source.badge_key
    from public.pre_p11_badge_awards source
    join relevant_badge_keys relevant using (badge_key)
    union all
    select source.player_id, source.badge_key
    from public.event_lead_time_badge_awards source
    join relevant_badge_keys relevant using (badge_key)
    union all
    select source.player_id, source.badge_key
    from public.bingo_line_diamond_badge_awards source
    join relevant_badge_keys relevant using (badge_key)
  ), rarity as materialized (
    select awards.badge_key,
      count(distinct awards.player_id)::integer recipient_count
    from relevant_award_recipients awards
    join public.players recipient on recipient.id = awards.player_id
    where not recipient.is_ak and not recipient.is_archived
    group by awards.badge_key
  ), population as materialized (
    select count(*)::integer regular_player_count
    from public.players where not is_ak and not is_archived
  )
  select r.award_key, r.player_id, r.display_name, r.avatar_url, r.avatar_path,
    r.badge_key, r.category, r.tier, r.name, r.description, r.family_key,
    r.requirement, r.threshold, r.sort_order, r.is_secret, r.source_type,
    r.source_attempt_id, r.source_historical_attempt_id, r.source_event_id,
    r.source_event_name, r.source_event_date, r.canonical_awarded_at,
    r.metadata, r.tier_rank, rarity.recipient_count,
    population.regular_player_count,
    case when population.regular_player_count = 0 then null
      else round(rarity.recipient_count * 100.0 /
        population.regular_player_count)::integer end,
    r.source_attempt_number, r.source_time_hundredths,
    next_badge.badge_key, next_badge.name, next_badge.requirement,
    next_badge.tier, next_badge.threshold,
    coalesce((r.metadata->>'progress')::integer,
      case r.category when 'attempts' then ps.valid_attempts
        when 'wins' then ps.event_wins
        when 'performance' then ps.personal_best_hundredths else null end),
    false, r.badge_kind, r.design_variant, r.scope_type
  from ranked r
  join rarity using (badge_key)
  cross join population
  left join public.player_statistics ps on ps.player_id = r.player_id
  left join lateral (
    select bd.badge_key, bd.name, bd.requirement, bd.tier, bd.threshold,
      case bd.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end next_rank
    from public.badge_definitions bd
    where bd.family_key = r.family_key and bd.is_active
      and case bd.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end > r.tier_rank
    order by next_rank, bd.threshold nulls last, bd.sort_order
    limit 1
  ) next_badge on true
  where r.family_position = 1
  order by r.tier_rank desc, rarity.recipient_count,
    r.sort_order, r.award_key;
$$;

-- Avoid evaluating the event-trophy union for every player before filtering.
create or replace function public.get_player_trophies(p_player_id uuid)
returns setof public.player_trophies
language sql
stable
security invoker
set search_path = public
as $$
  select trophies.*
  from (
    select concat('event-trophy:', ep.event_id, ':', ep.player_id, ':', ep.rank),
      'event'::text, 'event'::text, ep.event_id, null::text,
      coalesce(nullif(trim(e.name), ''), concat('Event ', e.start_date::text)),
      extract(year from e.start_date)::integer, e.start_date, ep.rank::integer,
      case ep.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end,
      ep.player_id, ep.guest_id, ep.display_name, p.avatar_url, p.avatar_path,
      ep.is_guest, ep.best_time_hundredths, coalesce(e.closed_at, e.ends_at)
    from public.event_podium ep
    join public.events e on e.id = ep.event_id
    join public.players p on p.id = ep.player_id
    where ep.player_id = p_player_id and e.status = 'closed'
      and e.deleted_at is null and e.awards_trophies and ep.rank between 1 and 3
    union all
    select * from public.historical_player_trophies
      where player_id = p_player_id
    union all
    select concat('season-trophy:', hof.season_year, ':', hof.player_id, ':', hof.rank),
      'season'::text, 'season'::text,
      concat('00000000-0000-0000-0000-',
        lpad(hof.season_year::text, 12, '0'))::uuid,
      hof.season_year::text,
      case hof.rank when 1 then concat('Saisonmeister ', hof.season_year)
        else concat('Saison ', hof.season_year, ' · Platz ', hof.rank) end,
      hof.season_year, make_date(hof.season_year, 12, 31), hof.rank,
      case hof.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end,
      hof.player_id, null::uuid, hof.display_name, hof.avatar_url,
      hof.avatar_path, false, hof.personal_best_hundredths, status.finalized_at
    from public.season_hall_of_fame hof
    join public.get_season_finalization_status(now()) status
      on status.season_year = hof.season_year and status.is_finalized
    where hof.player_id = p_player_id and hof.rank between 1 and 3
  ) trophies(
    trophy_key, competition_type, scope_type, competition_id, season_key,
    competition_name, competition_year, event_date, placement, trophy_tier,
    player_id, guest_id, display_name, avatar_url, avatar_path, is_guest,
    best_time_hundredths, awarded_at
  )
  order by trophies.awarded_at desc, trophies.trophy_key;
$$;

-- One player-scoped BINGO read replaces three separate evaluations of the
-- league-wide hits/fields/statistics view chain.
create or replace function public.get_player_bingo(p_player_id uuid)
returns table (
  ending integer, ending_label text, hit_count integer, field_tier text,
  hits jsonb, collected_endings integer, bronze_fields integer,
  silver_fields integer, gold_fields integer, diamond_fields integer,
  bronze_lines integer, silver_lines integer, gold_lines integer,
  diamond_lines integer, highest_badge_tier text
)
language sql
stable
security invoker
set search_path = public
as $$
  with requested_hits as materialized (
    select h.* from public.player_bingo_hits h
    where h.player_id = p_player_id
  ), hit_payloads as materialized (
    select h.ending,
      coalesce(jsonb_agg(jsonb_build_object(
        'id', h.source_id, 'sourceType', h.source_type,
        'eventId', h.event_id, 'timeHundredths', h.time_hundredths,
        'occurredAt', h.occurred_at, 'occurredDate', h.occurred_date,
        'hasExactTime', h.has_exact_time, 'sourceLabel', h.source_label
      ) order by h.occurred_at, h.source_priority, h.source_order, h.source_id),
        '[]'::jsonb) hits
    from requested_hits h group by h.ending
  ), requested_fields as materialized (
    select f.* from public.player_bingo_fields f
    where f.player_id = p_player_id
  ), requested_statistics as materialized (
    select s.* from public.player_bingo_statistics s
    where s.player_id = p_player_id
  )
  select fields.ending, fields.ending_label, fields.hit_count,
    fields.field_tier, coalesce(payloads.hits, '[]'::jsonb),
    stats.collected_endings, stats.bronze_fields, stats.silver_fields,
    stats.gold_fields, stats.diamond_fields, stats.bronze_lines,
    stats.silver_lines, stats.gold_lines, stats.diamond_lines,
    stats.highest_badge_tier
  from requested_fields fields
  cross join requested_statistics stats
  left join hit_payloads payloads using (ending)
  order by fields.ending;
$$;

-- /stats previously expanded public_player_badges once for grouped rarity and
-- a second time for recipients. Materialize it once inside one RPC.
create or replace function public.get_badge_rarity()
returns table (
  badge_key text, name text, tier public.badge_tier, tier_rank integer,
  sort_order integer, design_variant text, recipient_count integer,
  regular_player_count integer, rarity_percent integer, recipients jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with awards as materialized (
    select distinct ppb.badge_key, ppb.player_id, ppb.display_name,
      ppb.avatar_url, ppb.name, ppb.tier, ppb.design_variant
    from public.public_player_badges ppb
  ), population as (
    select count(*)::integer regular_player_count
    from public.players where not is_ak and not is_archived
  )
  select awards.badge_key, max(awards.name), awards.tier,
    case awards.tier when 'special' then 6 when 'diamond' then 5
      when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end,
    bd.sort_order, max(awards.design_variant), count(*)::integer,
    population.regular_player_count,
    case when population.regular_player_count = 0 then null
      else round(count(*) * 100.0 / population.regular_player_count)::integer end,
    jsonb_agg(jsonb_build_object('playerId', awards.player_id,
      'playerName', awards.display_name, 'avatarUrl', awards.avatar_url)
      order by awards.display_name, awards.player_id)
  from awards
  join public.badge_definitions bd
    on bd.badge_key = awards.badge_key and bd.is_active
  cross join population
  group by awards.badge_key, awards.tier, bd.sort_order,
    population.regular_player_count
  order by 4 desc, 7, bd.sort_order;
$$;

revoke all on function public.get_visible_player_badges(uuid),
  public.get_player_trophies(uuid), public.get_player_bingo(uuid),
  public.get_badge_rarity() from public;
grant execute on function public.get_visible_player_badges(uuid),
  public.get_player_trophies(uuid), public.get_player_bingo(uuid),
  public.get_badge_rarity() to anon, authenticated;
