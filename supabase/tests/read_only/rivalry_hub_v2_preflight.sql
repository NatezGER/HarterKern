-- After migration 066, execute in one Supabase SQL Editor run.
-- No fixtures or writes. Canonical views may be expensive; no timeout changes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL ROLE authenticated;

-- Formula-only synthetic scalar diagnostics, not inserted data.
with fixtures(label, e, t, l, expected_score, expected_intensity) as (
  values ('A',1,1,0,58,33), ('B',1,2,0,82,67), ('C',1,3,1,100,100),
    ('D',4,3,0,114,25), ('E',6,8,1,236,44), ('F',10,3,1,91,10),
    ('G',5,10,2,287,67), ('H',8,18,4,506,75)
)
select f.*, m.rivalry_score, m.intensity_percent,
  case when m.rivalry_score = f.expected_score and m.intensity_percent = f.expected_intensity
    then 'OK' else 'FAIL' end status
from fixtures f cross join lateral public.calculate_rivalry_metrics_v1(f.t, f.e, f.l) m
order by label;

-- Structure/invariants: absent 2026 data is SKIP, never an invented event.
with scopes as (
  select null::integer season_year
  union all select 2026 where exists (
    select 1 from public.events where deleted_at is null and status = 'closed'
      and extract(year from start_date)::integer = 2026)
), snapshots as materialized (
  select season_year, public.get_rivalry_hub_v2(season_year) payload from scopes
), checks as (
  select season_year, payload,
    (select count(*) from jsonb_array_elements(payload->'pairs') p where
      (p->>'h2hWinsA')::integer + (p->>'h2hWinsB')::integer + (p->>'ties')::integer
        <> (p->>'comparableH2hEvents')::integer
      or (p->>'rivalryLength')::integer <> (p->>'rivalryEvents')::integer
      or (p->>'totalDirectTakeovers')::numeric > (p->>'canonicalDirectTakeovers')::numeric
      or ((p->>'comparableH2hEvents')::integer = 0 and p->'intensityPercent' <> 'null'::jsonb)
      or ((p->>'totalDirectTakeovers')::integer = 0 and not (p->>'rivalryStatusAllTime')::boolean)
    ) bad_rows
  from snapshots
)
select coalesce(season_year::text, 'All-Time') scope,
  case when jsonb_typeof(payload) = 'object' and jsonb_typeof(payload->'pairs') = 'array'
    and bad_rows = 0 then 'OK' else 'FAIL' end status,
  jsonb_array_length(payload->'pairs') pair_count, bad_rows, payload->'summary' summary
from checks
union all
select '2026', 'SKIP: no closed events', 0, 0, null::jsonb
where not exists (select 1 from scopes where season_year = 2026);

-- Actual ranking and historical status, no hardcoded player IDs.
with scopes as (
  select null::integer season_year
  union all select 2026 where exists (
    select 1 from public.events where deleted_at is null and status = 'closed'
      and extract(year from start_date)::integer = 2026)
), snapshots as materialized (
  select season_year, public.get_rivalry_hub_v2(season_year) payload from scopes
)
select coalesce(season_year::text, 'All-Time') scope, ordinal position,
  p->>'playerADisplayName' player_a, p->>'playerBDisplayName' player_b,
  p->>'rivalryScore' score, p->>'intensityPercent' intensity_percent,
  p->>'comparableH2hEvents' comparable_events, p->>'totalDirectTakeovers' takeovers,
  p->>'rivalryLength' rivalry_length, p->>'h2hWinsA' wins_a, p->>'h2hWinsB' wins_b,
  p->>'ties' ties, p->>'formalRivalryInScope' formal_in_scope,
  p->>'historicalRivalry' historical_rivalry, p->>'duelOnly' duel_only,
  p->>'firstRivalryEventDateAllTime' first_rivalry_all_time,
  p->>'canonicalCommonEvents' canonical_common_events,
  p->>'canonicalDirectTakeovers' canonical_takeovers
from snapshots cross join lateral jsonb_array_elements(payload->'pairs') with ordinality entries(p, ordinal)
order by season_year nulls first, ordinal;

EXPLAIN (ANALYZE, BUFFERS)
SELECT public.get_rivalry_hub_v2(NULL);

EXPLAIN (ANALYZE, BUFFERS)
SELECT public.get_rivalry_hub_v2(2026)
WHERE EXISTS (select 1 from public.events where deleted_at is null and status = 'closed'
  and extract(year from start_date)::integer = 2026);

ROLLBACK;
