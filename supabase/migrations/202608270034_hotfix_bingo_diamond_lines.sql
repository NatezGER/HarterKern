-- Hotfix: derive every BINGO line material from the same canonical line grid.
-- Migration 033's lateral alias could lose the outer ending correlation and
-- therefore awarded Diamond for unrelated frequently hit endings.

create or replace view public.player_bingo_fields
with (security_invoker = true)
as
with endings as (
  select generate_series(0, 99)::integer ending
), hit_counts as (
  select player_id, ending, count(*)::integer hit_count,
    min(occurred_at) filter (where hit_sequence = 1) bronze_achieved_at,
    min(occurred_at) filter (where hit_sequence = 2) silver_achieved_at,
    min(occurred_at) filter (where hit_sequence = 3) gold_achieved_at,
    min(occurred_at) filter (where hit_sequence = 5) diamond_achieved_at
  from public.player_bingo_hits
  group by player_id, ending
)
select p.id player_id, e.ending, lpad(e.ending::text, 2, '0') ending_label,
  coalesce(h.hit_count, 0)::integer hit_count,
  case when coalesce(h.hit_count, 0) >= 5 then 'diamond'
    when coalesce(h.hit_count, 0) >= 3 then 'gold'
    when coalesce(h.hit_count, 0) = 2 then 'silver'
    when coalesce(h.hit_count, 0) = 1 then 'bronze'
    else 'open' end field_tier,
  h.bronze_achieved_at, h.silver_achieved_at, h.gold_achieved_at,
  h.diamond_achieved_at
from public.players p
cross join endings e
left join hit_counts h on h.player_id = p.id and h.ending = e.ending
where not p.is_ak and not p.is_archived;

create or replace view public.player_bingo_lines
with (security_invoker = true)
as
with line_cells as (
  select concat('row-', row_number) line_key, 'row'::text line_type,
    row_number line_number, row_number * 10 + column_number ending
  from generate_series(0, 9) row_number cross join generate_series(0, 9) column_number
  union all
  select concat('column-', column_number), 'column'::text, column_number,
    row_number * 10 + column_number
  from generate_series(0, 9) column_number cross join generate_series(0, 9) row_number
  union all select 'diagonal-main', 'diagonal'::text, 0, step * 11
    from generate_series(0, 9) step
  union all select 'diagonal-anti', 'diagonal'::text, 1, 9 + step * 9
    from generate_series(0, 9) step
), evaluated as (
  select f.player_id, l.line_key, l.line_type, l.line_number,
    min(f.hit_count)::integer minimum_hit_count,
    array_agg(l.ending order by l.ending) endings,
    max(f.bronze_achieved_at) bronze_achieved_at,
    max(f.silver_achieved_at) silver_achieved_at,
    max(f.gold_achieved_at) gold_achieved_at,
    max(f.diamond_achieved_at) diamond_achieved_at
  from public.player_bingo_fields f join line_cells l on l.ending = f.ending
  group by f.player_id, l.line_key, l.line_type, l.line_number
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

create or replace view public.player_bingo_statistics
with (security_invoker = true)
as
with field_totals as (
  select player_id,
    count(*) filter (where hit_count >= 1)::integer collected_endings,
    count(*) filter (where hit_count >= 1)::integer bronze_fields,
    count(*) filter (where hit_count >= 2)::integer silver_fields,
    count(*) filter (where hit_count >= 3)::integer gold_fields,
    count(*) filter (where hit_count >= 5)::integer diamond_fields
  from public.player_bingo_fields group by player_id
), line_totals as (
  select player_id,
    count(*) filter (where qualifies_bronze)::integer bronze_lines,
    count(*) filter (where qualifies_silver)::integer silver_lines,
    count(*) filter (where qualifies_gold)::integer gold_lines,
    min(bronze_achieved_at) filter (where qualifies_bronze) bronze_badge_achieved_at,
    min(silver_achieved_at) filter (where qualifies_silver) silver_badge_achieved_at,
    min(gold_achieved_at) filter (where qualifies_gold) gold_badge_achieved_at,
    count(*) filter (where qualifies_diamond)::integer diamond_lines,
    min(diamond_achieved_at) filter (where qualifies_diamond) diamond_badge_achieved_at
  from public.player_bingo_lines group by player_id
)
select f.player_id, f.collected_endings, f.bronze_fields, f.silver_fields,
  f.gold_fields, coalesce(l.bronze_lines, 0)::integer bronze_lines,
  coalesce(l.silver_lines, 0)::integer silver_lines,
  coalesce(l.gold_lines, 0)::integer gold_lines,
  case when coalesce(l.diamond_lines, 0) > 0 then 'diamond'
    when coalesce(l.gold_lines, 0) > 0 then 'gold'
    when coalesce(l.silver_lines, 0) > 0 then 'silver'
    when coalesce(l.bronze_lines, 0) > 0 then 'bronze' else null end highest_badge_tier,
  l.bronze_badge_achieved_at, l.silver_badge_achieved_at,
  l.gold_badge_achieved_at, f.diamond_fields,
  coalesce(l.diamond_lines, 0)::integer diamond_lines,
  l.diamond_badge_achieved_at
from field_totals f left join line_totals l on l.player_id = f.player_id;

-- Keep the source for public_player_badges, but make it a projection of the
-- canonical statistics instead of a second line-detection engine.
create or replace view public.bingo_line_diamond_badge_awards
with (security_invoker = true)
as
select concat(b.player_id, ':bingo-diamond') award_key, b.player_id,
  'bingo-diamond'::text badge_key, 'bingo'::text source_type,
  null::uuid source_attempt_id, null::uuid source_historical_attempt_id,
  null::uuid source_event_id, b.diamond_badge_achieved_at awarded_at,
  jsonb_build_object('progress', b.diamond_lines,
    'bronzeLines', b.bronze_lines, 'silverLines', b.silver_lines,
    'goldLines', b.gold_lines, 'diamondLines', b.diamond_lines,
    'lineCountsAreCumulative', true) metadata
from public.player_bingo_statistics b
where b.diamond_lines > 0;
