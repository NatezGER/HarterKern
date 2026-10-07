-- Diagnostic only. Verified source: origin/main bbe98a5, migrations 036/042/060/061.
-- No product definition is selected or changed. No fixture/DDL/DML/RPC sync.
-- Execute the complete file in Supabase SQL Editor. The three data statements
-- repeat canonical reads to expose separate tabular result sets without temp tables.
-- These views can be expensive; no timeout changes. No database execution was
-- performed while preparing this file.
-- A/B follow UUID low/high, not alphabetical order. Times are hundredths.
-- "Duell" is ambiguous today: Compare counts comparable closed H2H events;
-- Stats direct duels require >=1 takeover. Both flags are exposed below.
-- Rivalry qualification is >=3 takeovers in ONE closed pair/event.
-- No immutable lifetime status exists: source corrections can revoke qualification.
-- Existing badge counts qualifying EVENT-PAIRINGS, not distinct rival players.
-- Formula percentages are unbounded rates, NOT shares capped at 100.
-- Highest season means latest non-deleted EVENT year >=2026; historical-only
-- attempts do not form H2H events. Open-only latest seasons can have no closed pairs.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

-- 0. Availability. SKIP is expected when no season/closed pair exists.
select 'All-Time'::text scope,
  case when exists (select 1 from public.rivalry_pair_events)
    then 'OK' else 'SKIP: no closed pair events' end status
union all
select 'Latest season',
  case when max(extract(year from start_date)::integer) is null
    then 'SKIP: no event season >=2026'
    else 'Selected ' || max(extract(year from start_date)::integer)::text
      || '; empty season results mean SKIP: no closed pair events' end
from public.events
where deleted_at is null and extract(year from start_date) >= 2026;

-- 1. Every canonical pair: All-Time first, highest season second.
-- canonical_common_events can exceed comparable_h2h_events (DNF-only or
-- missing event_participants). Such rows are NOT silently dropped.
with latest_season as (
  -- Event-based diagnosis: latest non-deleted event year, including open events.
  select max(extract(year from start_date)::integer) season_year
  from public.events
  where deleted_at is null and extract(year from start_date) >= 2026
), scopes as (
  select 0 scope_order, 'All-Time'::text scope, null::integer season_year
  union all
  select 1, 'Season ' || season_year::text, season_year
  from latest_season where season_year is not null
), canonical_pairs as materialized (
  -- 060: closed-only; includes official DNF-only participation.
  select * from public.rivalry_pair_events
), final_times as materialized (
  select event_id, player_id,
    min(time_hundredths) filter (where is_valid_time) best_hundredths
  from public.official_event_attempts
  group by event_id, player_id
), enriched as materialized (
  select pairs.*, events.name event_name,
    extract(year from pairs.event_date)::integer event_season,
    low.display_name player_a, high.display_name player_b,
    a.best_hundredths player_a_best_hundredths,
    b.best_hundredths player_b_best_hundredths,
    -- Mirrors Compare history membership + valid best-time requirements.
    (a.best_hundredths is not null and b.best_hundredths is not null
      and exists (select 1 from public.event_participants p
        where p.event_id = pairs.event_id and p.player_id = pairs.player_low_id)
      and exists (select 1 from public.event_participants p
        where p.event_id = pairs.event_id and p.player_id = pairs.player_high_id)
    ) comparable_h2h,
    pairs.direct_takeovers >= 1 is_direct_duel
  from canonical_pairs pairs
  join public.events events on events.id = pairs.event_id
  join public.players low on low.id = pairs.player_low_id
  join public.players high on high.id = pairs.player_high_id
  left join final_times a on a.event_id = pairs.event_id
    and a.player_id = pairs.player_low_id
  left join final_times b on b.event_id = pairs.event_id
    and b.player_id = pairs.player_high_id
), scoped_events as materialized (
  select scopes.scope_order, scopes.scope, scopes.season_year, enriched.*,
    case when not comparable_h2h then 'NOT_COMPARABLE'
      when player_a_best_hundredths = player_b_best_hundredths then 'TIE'
      when player_a_best_hundredths < player_b_best_hundredths then 'A'
      else 'B' end h2h_result
  from scopes join enriched
    on scopes.season_year is null or enriched.event_season = scopes.season_year
), first_rivalry as (
  -- E uses first qualifying event within the selected scope, including that
  -- whole event (not merely attempts after its third takeover).
  select distinct on (scope_order, player_low_id, player_high_id)
    scope_order, player_low_id, player_high_id,
    event_date first_event_date, pair_started_at first_pair_started_at,
    event_id first_event_id
  from scoped_events where is_rivalry_event
  order by scope_order, player_low_id, player_high_id,
    event_date, pair_started_at, event_id
), rollup as (
  select e.scope_order, e.scope, e.season_year,
    e.player_low_id player_a_id, e.player_high_id player_b_id,
    e.player_a, e.player_b,
    count(*) canonical_common_events,
    count(*) filter (where e.comparable_h2h) comparable_h2h_events,
    count(*) filter (where e.is_direct_duel) events_with_at_least_one_takeover,
    sum(e.direct_takeovers) total_direct_takeovers,
    count(*) filter (where e.is_rivalry_event) rivalry_events,
    count(*) filter (where e.is_rivalry_event) rivalry_length,
    coalesce(sum(e.direct_takeovers) filter (where e.is_rivalry_event), 0)
      takeovers_inside_rivalry_events,
    coalesce(sum(e.direct_takeovers) filter (where not e.is_rivalry_event), 0)
      takeovers_outside_rivalry_events,
    bool_or(e.is_rivalry_event) rivalry_status_in_scope,
    exists (select 1 from canonical_pairs lifetime
      where lifetime.player_low_id = e.player_low_id
        and lifetime.player_high_id = e.player_high_id
        and lifetime.is_rivalry_event) rivalry_status_all_time,
    (array_agg(e.event_id order by e.event_date, e.pair_started_at, e.event_id)
      filter (where e.is_rivalry_event))[1] first_rivalry_event_id,
    min(e.event_date) filter (where e.is_rivalry_event) first_rivalry_date,
    (array_agg(e.event_id order by e.event_date desc, e.pair_started_at desc, e.event_id desc)
      filter (where e.is_rivalry_event))[1] last_rivalry_event_id,
    max(e.event_date) filter (where e.is_rivalry_event) last_rivalry_date,
    count(*) filter (where e.h2h_result = 'A') h2h_wins_a,
    count(*) filter (where e.h2h_result = 'B') h2h_wins_b,
    count(*) filter (where e.h2h_result = 'TIE') h2h_ties,
    count(*) filter (where not e.comparable_h2h) non_comparable_common_events,
    coalesce(sum(e.direct_takeovers) filter (where not e.comparable_h2h), 0)
      takeovers_in_non_comparable_events,
    sum(e.direct_takeovers) filter (where
      (e.event_date, e.pair_started_at, e.event_id) >=
      (f.first_event_date, f.first_pair_started_at, f.first_event_id))
      takeovers_since_first_rivalry_event,
    count(*) filter (where e.comparable_h2h and
      (e.event_date, e.pair_started_at, e.event_id) >=
      (f.first_event_date, f.first_pair_started_at, f.first_event_id))
      comparable_events_since_first_rivalry_event
  from scoped_events e
  left join first_rivalry f on f.scope_order = e.scope_order
    and f.player_low_id = e.player_low_id and f.player_high_id = e.player_high_id
  group by e.scope_order, e.scope, e.season_year,
    e.player_low_id, e.player_high_id, e.player_a, e.player_b
), formulas as (
  select rollup.*,
    case when rivalry_status_in_scope then 'RIVALRY_IN_SCOPE'
      when events_with_at_least_one_takeover > 0 then 'DIRECT_DUEL_ONLY_IN_SCOPE'
      else 'H2H_OR_OFFICIAL_PARTICIPATION_ONLY' end pair_class,
    round(total_direct_takeovers::numeric * 100
      / nullif(comparable_h2h_events, 0)) formula_a_percent,
    round(total_direct_takeovers::numeric * 100
      / nullif(events_with_at_least_one_takeover, 0)) formula_b_percent,
    round(takeovers_inside_rivalry_events::numeric * 100
      / nullif(rivalry_events, 0)) formula_c_percent,
    round(takeovers_inside_rivalry_events::numeric * 100
      / nullif(rivalry_events * 3, 0)) formula_d_percent,
    round(takeovers_since_first_rivalry_event::numeric * 100
      / nullif(comparable_events_since_first_rivalry_event, 0)) formula_e_percent
  from rollup
)
select * from formulas
order by scope_order, rivalry_status_in_scope desc, rivalry_events desc,
  total_direct_takeovers desc, player_a_id, player_b_id;

-- 2. Every closed pair/event, including zero-takeover and non-comparable cases.
-- Tie states have NULL leader; A -> tie -> B is not a direct takeover.
with latest_season as (
  -- Event-based diagnosis: latest non-deleted event year, including open events.
  select max(extract(year from start_date)::integer) season_year
  from public.events
  where deleted_at is null and extract(year from start_date) >= 2026
), scopes as (
  select 0 scope_order, 'All-Time'::text scope, null::integer season_year
  union all
  select 1, 'Season ' || season_year::text, season_year
  from latest_season where season_year is not null
), canonical_pairs as materialized (
  -- 060: closed-only; includes official DNF-only participation.
  select * from public.rivalry_pair_events
), final_times as materialized (
  select event_id, player_id,
    min(time_hundredths) filter (where is_valid_time) best_hundredths
  from public.official_event_attempts
  group by event_id, player_id
), enriched as materialized (
  select pairs.*, events.name event_name,
    extract(year from pairs.event_date)::integer event_season,
    low.display_name player_a, high.display_name player_b,
    a.best_hundredths player_a_best_hundredths,
    b.best_hundredths player_b_best_hundredths,
    -- Mirrors Compare history membership + valid best-time requirements.
    (a.best_hundredths is not null and b.best_hundredths is not null
      and exists (select 1 from public.event_participants p
        where p.event_id = pairs.event_id and p.player_id = pairs.player_low_id)
      and exists (select 1 from public.event_participants p
        where p.event_id = pairs.event_id and p.player_id = pairs.player_high_id)
    ) comparable_h2h,
    pairs.direct_takeovers >= 1 is_direct_duel
  from canonical_pairs pairs
  join public.events events on events.id = pairs.event_id
  join public.players low on low.id = pairs.player_low_id
  join public.players high on high.id = pairs.player_high_id
  left join final_times a on a.event_id = pairs.event_id
    and a.player_id = pairs.player_low_id
  left join final_times b on b.event_id = pairs.event_id
    and b.player_id = pairs.player_high_id
), scoped_events as materialized (
  select scopes.scope_order, scopes.scope, scopes.season_year, enriched.*,
    case when not comparable_h2h then 'NOT_COMPARABLE'
      when player_a_best_hundredths = player_b_best_hundredths then 'TIE'
      when player_a_best_hundredths < player_b_best_hundredths then 'A'
      else 'B' end h2h_result
  from scopes join enriched
    on scopes.season_year is null or enriched.event_season = scopes.season_year
)
select scope, season_year, player_low_id player_a_id, player_high_id player_b_id,
  player_a, player_b, event_id, event_name, event_date, event_season,
  player_a_best_hundredths, player_b_best_hundredths, h2h_result,
  comparable_h2h is_compare_duel, direct_takeovers,
  is_direct_duel, is_rivalry_event,
  case when is_rivalry_event
    then '060: closed event; direct_takeovers >= 3'
    when is_direct_duel then 'Stats direct duel: direct_takeovers >= 1 but < 3'
    when comparable_h2h then 'Compare H2H: both valid best times; zero direct takeovers'
    else '060 common pair only; Compare valid-time/participant condition not met'
  end classification_reason,
  first_takeover_at, last_takeover_at, pair_started_at, pair_ended_at
from scoped_events
order by scope_order, player_low_id, player_high_id, event_date, pair_started_at, event_id;

-- 3. Top 10 for EACH formula and scope, comparable H2H population only.
-- Sporting rank permits ties; row_number bounds output to ten deterministically.
-- Missing denominators are NULL in block 1 and do not enter these rankings.
with latest_season as (
  -- Event-based diagnosis: latest non-deleted event year, including open events.
  select max(extract(year from start_date)::integer) season_year
  from public.events
  where deleted_at is null and extract(year from start_date) >= 2026
), scopes as (
  select 0 scope_order, 'All-Time'::text scope, null::integer season_year
  union all
  select 1, 'Season ' || season_year::text, season_year
  from latest_season where season_year is not null
), canonical_pairs as materialized (
  -- 060: closed-only; includes official DNF-only participation.
  select * from public.rivalry_pair_events
), final_times as materialized (
  select event_id, player_id,
    min(time_hundredths) filter (where is_valid_time) best_hundredths
  from public.official_event_attempts
  group by event_id, player_id
), enriched as materialized (
  select pairs.*, events.name event_name,
    extract(year from pairs.event_date)::integer event_season,
    low.display_name player_a, high.display_name player_b,
    a.best_hundredths player_a_best_hundredths,
    b.best_hundredths player_b_best_hundredths,
    -- Mirrors Compare history membership + valid best-time requirements.
    (a.best_hundredths is not null and b.best_hundredths is not null
      and exists (select 1 from public.event_participants p
        where p.event_id = pairs.event_id and p.player_id = pairs.player_low_id)
      and exists (select 1 from public.event_participants p
        where p.event_id = pairs.event_id and p.player_id = pairs.player_high_id)
    ) comparable_h2h,
    pairs.direct_takeovers >= 1 is_direct_duel
  from canonical_pairs pairs
  join public.events events on events.id = pairs.event_id
  join public.players low on low.id = pairs.player_low_id
  join public.players high on high.id = pairs.player_high_id
  left join final_times a on a.event_id = pairs.event_id
    and a.player_id = pairs.player_low_id
  left join final_times b on b.event_id = pairs.event_id
    and b.player_id = pairs.player_high_id
), scoped_events as materialized (
  select scopes.scope_order, scopes.scope, scopes.season_year, enriched.*,
    case when not comparable_h2h then 'NOT_COMPARABLE'
      when player_a_best_hundredths = player_b_best_hundredths then 'TIE'
      when player_a_best_hundredths < player_b_best_hundredths then 'A'
      else 'B' end h2h_result
  from scopes join enriched
    on scopes.season_year is null or enriched.event_season = scopes.season_year
), first_rivalry as (
  -- E uses first qualifying event within the selected scope, including that
  -- whole event (not merely attempts after its third takeover).
  select distinct on (scope_order, player_low_id, player_high_id)
    scope_order, player_low_id, player_high_id,
    event_date first_event_date, pair_started_at first_pair_started_at,
    event_id first_event_id
  from scoped_events where is_rivalry_event
  order by scope_order, player_low_id, player_high_id,
    event_date, pair_started_at, event_id
), rollup as (
  select e.scope_order, e.scope, e.season_year,
    e.player_low_id player_a_id, e.player_high_id player_b_id,
    e.player_a, e.player_b,
    count(*) canonical_common_events,
    count(*) filter (where e.comparable_h2h) comparable_h2h_events,
    count(*) filter (where e.is_direct_duel) events_with_at_least_one_takeover,
    sum(e.direct_takeovers) total_direct_takeovers,
    count(*) filter (where e.is_rivalry_event) rivalry_events,
    count(*) filter (where e.is_rivalry_event) rivalry_length,
    coalesce(sum(e.direct_takeovers) filter (where e.is_rivalry_event), 0)
      takeovers_inside_rivalry_events,
    coalesce(sum(e.direct_takeovers) filter (where not e.is_rivalry_event), 0)
      takeovers_outside_rivalry_events,
    bool_or(e.is_rivalry_event) rivalry_status_in_scope,
    exists (select 1 from canonical_pairs lifetime
      where lifetime.player_low_id = e.player_low_id
        and lifetime.player_high_id = e.player_high_id
        and lifetime.is_rivalry_event) rivalry_status_all_time,
    (array_agg(e.event_id order by e.event_date, e.pair_started_at, e.event_id)
      filter (where e.is_rivalry_event))[1] first_rivalry_event_id,
    min(e.event_date) filter (where e.is_rivalry_event) first_rivalry_date,
    (array_agg(e.event_id order by e.event_date desc, e.pair_started_at desc, e.event_id desc)
      filter (where e.is_rivalry_event))[1] last_rivalry_event_id,
    max(e.event_date) filter (where e.is_rivalry_event) last_rivalry_date,
    count(*) filter (where e.h2h_result = 'A') h2h_wins_a,
    count(*) filter (where e.h2h_result = 'B') h2h_wins_b,
    count(*) filter (where e.h2h_result = 'TIE') h2h_ties,
    count(*) filter (where not e.comparable_h2h) non_comparable_common_events,
    coalesce(sum(e.direct_takeovers) filter (where not e.comparable_h2h), 0)
      takeovers_in_non_comparable_events,
    sum(e.direct_takeovers) filter (where
      (e.event_date, e.pair_started_at, e.event_id) >=
      (f.first_event_date, f.first_pair_started_at, f.first_event_id))
      takeovers_since_first_rivalry_event,
    count(*) filter (where e.comparable_h2h and
      (e.event_date, e.pair_started_at, e.event_id) >=
      (f.first_event_date, f.first_pair_started_at, f.first_event_id))
      comparable_events_since_first_rivalry_event
  from scoped_events e
  left join first_rivalry f on f.scope_order = e.scope_order
    and f.player_low_id = e.player_low_id and f.player_high_id = e.player_high_id
  group by e.scope_order, e.scope, e.season_year,
    e.player_low_id, e.player_high_id, e.player_a, e.player_b
), formulas as (
  select rollup.*,
    case when rivalry_status_in_scope then 'RIVALRY_IN_SCOPE'
      when events_with_at_least_one_takeover > 0 then 'DIRECT_DUEL_ONLY_IN_SCOPE'
      else 'H2H_OR_OFFICIAL_PARTICIPATION_ONLY' end pair_class,
    round(total_direct_takeovers::numeric * 100
      / nullif(comparable_h2h_events, 0)) formula_a_percent,
    round(total_direct_takeovers::numeric * 100
      / nullif(events_with_at_least_one_takeover, 0)) formula_b_percent,
    round(takeovers_inside_rivalry_events::numeric * 100
      / nullif(rivalry_events, 0)) formula_c_percent,
    round(takeovers_inside_rivalry_events::numeric * 100
      / nullif(rivalry_events * 3, 0)) formula_d_percent,
    round(takeovers_since_first_rivalry_event::numeric * 100
      / nullif(comparable_events_since_first_rivalry_event, 0)) formula_e_percent
  from rollup
), unpivoted as (
  select f.*, v.formula, v.percent_value
  from formulas f cross join lateral (values
    ('A'::text, f.formula_a_percent), ('B', f.formula_b_percent),
    ('C', f.formula_c_percent), ('D', f.formula_d_percent),
    ('E', f.formula_e_percent)
  ) v(formula, percent_value)
  where comparable_h2h_events > 0 and v.percent_value is not null
), ranked as (
  select unpivoted.*,
    rank() over (partition by scope_order, formula order by percent_value desc)
      diagnostic_rank,
    row_number() over (partition by scope_order, formula
      order by percent_value desc, player_a_id, player_b_id) display_position
  from unpivoted
)
select scope, season_year, formula, diagnostic_rank, display_position,
  player_a_id, player_b_id, player_a, player_b, pair_class,
  rivalry_status_all_time, percent_value,
  comparable_h2h_events, events_with_at_least_one_takeover,
  rivalry_length, total_direct_takeovers, takeovers_inside_rivalry_events,
  takeovers_outside_rivalry_events, takeovers_in_non_comparable_events,
  first_rivalry_date, last_rivalry_date
from ranked where display_position <= 10
order by scope_order, formula, display_position;

ROLLBACK;

