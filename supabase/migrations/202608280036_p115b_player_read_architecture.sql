-- P11.5 B: keep profile reads small and player-scoped. Award eligibility and
-- BINGO rules remain in their existing canonical views; profile presentation
-- no longer asks those reads for global rarity or unused progress data.

create or replace view public.bingo_line_cells
with (security_invoker = true)
as
select concat('row-', row_number) line_key, 'row'::text line_type,
  row_number line_number, row_number * 10 + column_number ending
from generate_series(0, 9) row_number
cross join generate_series(0, 9) column_number
union all
select concat('column-', column_number), 'column'::text, column_number,
  row_number * 10 + column_number
from generate_series(0, 9) column_number
cross join generate_series(0, 9) row_number
union all
select 'diagonal-main', 'diagonal'::text, 0, step * 11
from generate_series(0, 9) step
union all
select 'diagonal-anti', 'diagonal'::text, 1, 9 + step * 9
from generate_series(0, 9) step;

-- Keep the public line view canonical while sharing its grid with the profile
-- RPC below. Threshold semantics are unchanged.
create or replace view public.player_bingo_lines
with (security_invoker = true)
as
with evaluated as (
  select fields.player_id, cells.line_key, cells.line_type,
    cells.line_number, min(fields.hit_count)::integer minimum_hit_count,
    array_agg(cells.ending order by cells.ending) endings,
    max(fields.bronze_achieved_at) bronze_achieved_at,
    max(fields.silver_achieved_at) silver_achieved_at,
    max(fields.gold_achieved_at) gold_achieved_at,
    max(fields.diamond_achieved_at) diamond_achieved_at
  from public.player_bingo_fields fields
  join public.bingo_line_cells cells on cells.ending = fields.ending
  group by fields.player_id, cells.line_key, cells.line_type, cells.line_number
)
select player_id, line_key, line_type, line_number, endings, minimum_hit_count,
  minimum_hit_count >= 1 qualifies_bronze,
  minimum_hit_count >= 2 qualifies_silver,
  minimum_hit_count >= 3 qualifies_gold,
  case when minimum_hit_count >= 5 then 'diamond'
    when minimum_hit_count >= 3 then 'gold'
    when minimum_hit_count >= 2 then 'silver'
    when minimum_hit_count >= 1 then 'bronze' else 'open' end line_tier,
  case when minimum_hit_count >= 1 then bronze_achieved_at end bronze_achieved_at,
  case when minimum_hit_count >= 2 then silver_achieved_at end silver_achieved_at,
  case when minimum_hit_count >= 3 then gold_achieved_at end gold_achieved_at,
  minimum_hit_count >= 5 qualifies_diamond,
  case when minimum_hit_count >= 5 then diamond_achieved_at end diamond_achieved_at
from evaluated;

create or replace function public.get_player_visible_badges(p_player_id uuid)
returns table (
  award_key text, player_id uuid, display_name text, avatar_url text,
  avatar_path text, badge_key text, category text, tier public.badge_tier,
  name text, description text, family_key text, requirement text,
  threshold integer, source_type text, source_attempt_id uuid,
  source_historical_attempt_id uuid, source_event_id uuid,
  source_event_name text, awarded_at timestamptz, metadata jsonb,
  source_attempt_number integer, source_time_hundredths integer,
  is_special_event_badge boolean, badge_kind text, design_variant text,
  scope_type text
)
language sql
stable
security invoker
set search_path = public
as $$
  with requested_awards as materialized (
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
  ), enriched as materialized (
    select awards.*, p.display_name, p.avatar_url, p.avatar_path,
      definitions.category, definitions.tier, definitions.name,
      definitions.description, definitions.family_key,
      definitions.requirement, definitions.threshold,
      definitions.sort_order, definitions.badge_kind,
      definitions.design_variant, definitions.scope_type,
      event.name source_event_name,
      details.attempt_number source_attempt_number,
      coalesce(details.time_hundredths,
        (awards.metadata->>'timeHundredths')::integer) source_time_hundredths,
      case when awards.source_historical_attempt_id is not null
        then historical.attempt_date::timestamp at time zone 'Europe/Berlin'
        else awards.awarded_at end canonical_awarded_at,
      case definitions.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end tier_rank
    from requested_awards awards
    join public.players p on p.id = awards.player_id
      and not p.is_ak and not p.is_archived
    join public.badge_definitions definitions
      on definitions.badge_key = awards.badge_key and definitions.is_active
    left join public.events event
      on event.id = awards.source_event_id and event.deleted_at is null
    left join public.historical_attempts historical
      on historical.id = awards.source_historical_attempt_id
      and historical.deleted_at is null
    left join public.event_attempt_details details
      on details.attempt_id = awards.source_attempt_id
  ), ranked as (
    select enriched.*, row_number() over (
      partition by player_id, coalesce(family_key, award_key)
      order by tier_rank desc, threshold desc nulls last,
        awarded_at, award_key
    ) family_position
    from enriched
  )
  select award_key, player_id, display_name, avatar_url, avatar_path,
    badge_key, category, tier, name, description, family_key, requirement,
    threshold, source_type, source_attempt_id, source_historical_attempt_id,
    source_event_id, source_event_name, canonical_awarded_at, metadata,
    source_attempt_number, source_time_hundredths, false,
    badge_kind, design_variant, scope_type
  from ranked
  where family_position = 1
  order by tier_rank desc, sort_order, award_key;
$$;

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
    select hits.*
    from public.player_bingo_hits hits
    where hits.player_id = p_player_id
  ), thresholds as materialized (
    select max(threshold) filter (where tier = 'bronze')::integer bronze,
      max(threshold) filter (where tier = 'silver')::integer silver,
      max(threshold) filter (where tier = 'gold')::integer gold,
      max(threshold) filter (where tier = 'diamond')::integer diamond
    from public.badge_definitions
    where family_key = 'bingo' and is_active
  ), grouped_hits as materialized (
    select requested_hits.ending, count(*)::integer hit_count,
      jsonb_agg(jsonb_build_object(
        'id', requested_hits.source_id,
        'sourceType', requested_hits.source_type,
        'eventId', requested_hits.event_id,
        'timeHundredths', requested_hits.time_hundredths,
        'occurredAt', requested_hits.occurred_at,
        'occurredDate', requested_hits.occurred_date,
        'hasExactTime', requested_hits.has_exact_time,
        'sourceLabel', requested_hits.source_label
      ) order by requested_hits.occurred_at, requested_hits.source_priority,
        requested_hits.source_order, requested_hits.source_id) hits
    from requested_hits
    group by requested_hits.ending
  ), fields as materialized (
    select endings.ending, lpad(endings.ending::text, 2, '0') ending_label,
      coalesce(grouped_hits.hit_count, 0)::integer hit_count,
      case when coalesce(grouped_hits.hit_count, 0) >= thresholds.diamond then 'diamond'
        when coalesce(grouped_hits.hit_count, 0) >= thresholds.gold then 'gold'
        when coalesce(grouped_hits.hit_count, 0) >= thresholds.silver then 'silver'
        when coalesce(grouped_hits.hit_count, 0) >= thresholds.bronze then 'bronze'
        else 'open' end field_tier,
      coalesce(grouped_hits.hits, '[]'::jsonb) hits
    from generate_series(0, 99) endings(ending)
    cross join thresholds
    left join grouped_hits using (ending)
  ), evaluated_lines as materialized (
    select cells.line_key, min(fields.hit_count)::integer minimum_hit_count
    from fields
    join public.bingo_line_cells cells using (ending)
    group by cells.line_key
  ), summary as (
    select count(*) filter (where fields.hit_count >= thresholds.bronze)::integer
        collected_endings,
      count(*) filter (where fields.hit_count >= thresholds.bronze)::integer
        bronze_fields,
      count(*) filter (where fields.hit_count >= thresholds.silver)::integer
        silver_fields,
      count(*) filter (where fields.hit_count >= thresholds.gold)::integer
        gold_fields,
      count(*) filter (where fields.hit_count >= thresholds.diamond)::integer
        diamond_fields,
      (select count(*)::integer from evaluated_lines
        where minimum_hit_count >= thresholds.bronze) bronze_lines,
      (select count(*)::integer from evaluated_lines
        where minimum_hit_count >= thresholds.silver) silver_lines,
      (select count(*)::integer from evaluated_lines
        where minimum_hit_count >= thresholds.gold) gold_lines,
      (select count(*)::integer from evaluated_lines
        where minimum_hit_count >= thresholds.diamond) diamond_lines
    from fields cross join thresholds
    group by thresholds.bronze, thresholds.silver, thresholds.gold,
      thresholds.diamond
  )
  select fields.ending, fields.ending_label, fields.hit_count,
    fields.field_tier, fields.hits, summary.collected_endings,
    summary.bronze_fields, summary.silver_fields, summary.gold_fields,
    summary.diamond_fields, summary.bronze_lines, summary.silver_lines,
    summary.gold_lines, summary.diamond_lines,
    case when summary.diamond_lines > 0 then 'diamond'
      when summary.gold_lines > 0 then 'gold'
      when summary.silver_lines > 0 then 'silver'
      when summary.bronze_lines > 0 then 'bronze' else null end
  from fields cross join summary
  order by fields.ending;
$$;

create or replace function public.get_player_qualified_times(
  p_player_id uuid,
  p_season_year integer default null
)
returns table (time_hundredths integer)
language sql
stable
security invoker
set search_path = public
as $$
  select source.time_hundredths
  from (
    select attempts.time_hundredths, events.start_date occurred_date
    from public.attempts
    left join public.events on events.id = attempts.event_id
    join public.players on players.id = attempts.player_id
    where attempts.player_id = p_player_id
      and attempts.status = 'approved' and attempts.deleted_at is null
      and not attempts.is_dnf and attempts.time_hundredths is not null
      and not attempts.is_ak and not players.is_ak and not players.is_archived
      and (attempts.event_id is null or events.deleted_at is null)
    union all
    select historical.time_hundredths, historical.attempt_date
    from public.historical_attempts historical
    join public.players on players.id = historical.player_id
    where historical.player_id = p_player_id
      and historical.deleted_at is null and not historical.is_guest
      and not historical.out_of_competition
      and not players.is_ak and not players.is_archived
  ) source
  where p_season_year is null or (
    source.occurred_date >= make_date(p_season_year, 1, 1)
    and source.occurred_date < make_date(p_season_year + 1, 1, 1)
  )
  order by source.time_hundredths;
$$;

create or replace function public.get_player_attempt_number_statistics(
  p_player_id uuid
)
returns table (
  attempt_number integer, attempt_count bigint, valid_attempts bigint,
  dnf_count bigint, average_hundredths integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with ordered_attempts as materialized (
    select attempts.time_hundredths, attempts.is_dnf,
      row_number() over (
        partition by attempts.event_id
        order by attempts.submitted_at, attempts.id
      )::integer attempt_number
    from public.attempts
    join public.events on events.id = attempts.event_id
      and events.deleted_at is null
    join public.players on players.id = attempts.player_id
    where attempts.player_id = p_player_id
      and attempts.status = 'approved' and attempts.deleted_at is null
      and not attempts.is_ak and not players.is_ak and not players.is_archived
  )
  select ordered_attempts.attempt_number, count(*),
    count(*) filter (where not ordered_attempts.is_dnf),
    count(*) filter (where ordered_attempts.is_dnf),
    round(avg(ordered_attempts.time_hundredths)
      filter (where not ordered_attempts.is_dnf))::integer
  from ordered_attempts
  group by ordered_attempts.attempt_number
  order by ordered_attempts.attempt_number;
$$;

create or replace function public.get_player_event_history(p_player_id uuid)
returns table (
  event_id uuid, event_name text, event_date date,
  best_time_hundredths integer, rank integer, attempt_count bigint,
  valid_attempts bigint, dnf_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select events.id, coalesce(nullif(trim(events.name), ''), 'Spieleabend'),
    events.start_date,
    min(attempts.time_hundredths) filter (
      where attempts.status = 'approved' and attempts.deleted_at is null
        and not attempts.is_dnf and not attempts.is_ak),
    podium.rank,
    count(attempts.id) filter (where attempts.status = 'approved'
      and attempts.deleted_at is null and not attempts.is_ak),
    count(attempts.id) filter (where attempts.status = 'approved'
      and attempts.deleted_at is null and not attempts.is_dnf
      and not attempts.is_ak),
    count(attempts.id) filter (where attempts.status = 'approved'
      and attempts.deleted_at is null and attempts.is_dnf
      and not attempts.is_ak)
  from public.event_participants participants
  join public.events on events.id = participants.event_id
    and events.deleted_at is null
  join public.players on players.id = participants.player_id
    and not players.is_ak and not players.is_archived
  left join public.attempts on attempts.event_id = participants.event_id
    and attempts.player_id = participants.player_id
  left join public.event_podium podium on podium.event_id = participants.event_id
    and podium.player_id = participants.player_id
  where participants.player_id = p_player_id
  group by events.id, events.name, events.start_date, podium.rank
  order by events.start_date desc;
$$;

revoke all on function public.get_player_visible_badges(uuid),
  public.get_player_bingo(uuid),
  public.get_player_qualified_times(uuid, integer),
  public.get_player_attempt_number_statistics(uuid),
  public.get_player_event_history(uuid) from public;
grant execute on function public.get_player_visible_badges(uuid),
  public.get_player_bingo(uuid),
  public.get_player_qualified_times(uuid, integer),
  public.get_player_attempt_number_statistics(uuid),
  public.get_player_event_history(uuid) to anon, authenticated;

grant select on public.bingo_line_cells to anon, authenticated;
