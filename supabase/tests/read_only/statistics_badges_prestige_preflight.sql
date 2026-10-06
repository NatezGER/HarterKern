BEGIN;

-- Badge reads only: no eligibility, award writes or changes to existing migrations.
create or replace function public.get_statistics_badge_dashboard(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with bingo_scope as materialized (
  -- Same regular qualified population as 017/026; no attempt numbering needed.
  select a.player_id, mod(a.time_hundredths, 100)::integer ending
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and not p.is_ak and not p.is_archived and a.guest_id is null
    and (a.event_id is null or e.deleted_at is null)
    and (p_season_year is null or (e.id is not null
      and extract(year from e.start_date)::integer = p_season_year and p_season_year >= 2026))
  union all
  select h.player_id, mod(h.time_hundredths, 100)::integer
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.out_of_competition and not h.is_guest
    and not p.is_ak and not p.is_archived
    and (p_season_year is null or (extract(year from h.attempt_date)::integer = p_season_year
      and p_season_year >= 2026))
), ending_popularity as (
  select ending, count(distinct player_id) players from bingo_scope group by ending
), bingo_player as (
  select b.player_id, count(distinct b.ending)::numeric fields,
    count(distinct b.ending) filter (where p.players <= 3)::numeric rare_fields
  from bingo_scope b join ending_popularity p using (ending) group by b.player_id
), family_maximums as (
  select ledger.player_id, definitions.family_key,
    max(case definitions.tier when 'bronze' then 1 when 'silver' then 2
      when 'gold' then 3 when 'diamond' then 4 else 0 end)::numeric tier_rank
  from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
  where p_season_year is null and definitions.is_active
    and definitions.design_variant = 'standard' and definitions.family_key is not null
  group by ledger.player_id, definitions.family_key
), badge_ladder as (
  select player_id, count(*)::numeric family_total,
    count(*) filter (where tier_rank >= 1)::numeric bronze,
    count(*) filter (where tier_rank >= 2)::numeric silver,
    count(*) filter (where tier_rank >= 3)::numeric gold,
    count(*) filter (where tier_rank >= 4)::numeric diamond
  from family_maximums group by player_id
), badge_specials as (
  select ledger.player_id,
    count(distinct ledger.badge_key) filter (where definitions.design_variant = 'positive_special')::numeric positive,
    count(distinct ledger.badge_key) filter (where definitions.design_variant = 'consolation')::numeric consolation
  from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
  where p_season_year is null and definitions.is_active
    and definitions.design_variant in ('positive_special', 'consolation')
  group by ledger.player_id
), badge_population as (
  select player_id from badge_ladder union select player_id from badge_specials
), badge_counts as (
  select population.player_id, coalesce(ladder.family_total, 0)::numeric family_total,
    coalesce(ladder.bronze, 0)::numeric bronze, coalesce(ladder.silver, 0)::numeric silver,
    coalesce(ladder.gold, 0)::numeric gold, coalesce(ladder.diamond, 0)::numeric diamond,
    coalesce(specials.positive, 0)::numeric positive,
    coalesce(specials.consolation, 0)::numeric consolation
  from badge_population population
  left join badge_ladder ladder using (player_id)
  left join badge_specials specials using (player_id)

), metrics as materialized (
  select 'bingo-fields'::text metric_key, player_id, fields::numeric value,
    fields::numeric hit_count, 100::numeric sample_count, null::text detail
  from bingo_player where fields > 0
  union all select 'rare-hunter'::text, player_id, rare_fields::numeric,
    rare_fields::numeric, fields::numeric, null::text
  from bingo_player where rare_fields > 0
union all select 'badge-total'::text, player_id::uuid,
  (family_total + positive + consolation)::numeric,
  null::numeric, null::numeric, null::text
from badge_counts
where family_total + positive + consolation > 0
union all select 'badge-bronze'::text, player_id::uuid, bronze::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where bronze > 0
union all select 'badge-silver'::text, player_id::uuid, silver::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where silver > 0
union all select 'badge-gold'::text, player_id::uuid, gold::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where gold > 0
union all select 'badge-diamond'::text, player_id::uuid, diamond::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where diamond > 0
union all select 'badge-positive'::text, player_id::uuid, positive::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where positive > 0
union all select 'badge-consolation'::text, player_id::uuid, consolation::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where consolation > 0

), ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by metric_key order by value desc) placement,
    row_number() over (partition by metric_key order by value desc,
      sample_count desc nulls last, p.display_name, player_id) display_position
  from metrics m join public.players p on p.id = m.player_id
), summary as (
  select metric_key, round(avg(value), 2)::numeric value,
    sum(hit_count)::numeric hit_count, sum(sample_count)::numeric sample_count
  from metrics group by metric_key
)
select jsonb_build_object('metrics', coalesce((select jsonb_agg(jsonb_build_object(
  'key', s.metric_key, 'overallValue', s.value, 'overallCount', s.hit_count,
  'overallTotal', s.sample_count, 'overallDetail', null,
  'rankings', coalesce((select jsonb_agg(jsonb_build_object(
    'rank', r.placement, 'playerId', r.player_id, 'name', r.display_name,
    'avatarUrl', r.avatar_url, 'avatarPath', r.avatar_path,
    'value', r.value, 'count', r.hit_count, 'total', r.sample_count, 'detail', r.detail
  ) order by r.display_position) from ranked r
    where r.metric_key = s.metric_key and r.display_position <= 10), '[]'::jsonb)
) order by s.metric_key) from summary s), '[]'::jsonb));
$$;
revoke all on function public.get_statistics_badge_dashboard(integer) from public;
grant execute on function public.get_statistics_badge_dashboard(integer) to anon, authenticated;

create or replace function public.get_prestige_activity_feed_v2(p_limit integer default 18)
returns table (
  activity_id text, activity_type text, occurred_at timestamptz,
  player_id uuid, display_name text, avatar_url text, avatar_path text,
  event_id uuid, event_name text, title text, description text,
  time_hundredths integer, badge_key text, tier public.badge_tier, priority integer
)
language sql stable security invoker set search_path = public as $$
with ledger_ranked as materialized (
  -- Same family winner as get_player_visible_badges; the ledger is authoritative.
  select l.*, p.display_name, p.avatar_url, d.name, d.tier,
    row_number() over (
      partition by l.player_id, coalesce(d.family_key, l.award_key)
      order by case d.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end desc,
        d.threshold desc nulls last, l.source_awarded_at, l.award_key
    ) family_position
  from public.player_badge_award_ledger l
  join public.players p on p.id = l.player_id and not p.is_ak and not p.is_archived
  join public.badge_definitions d on d.badge_key = l.badge_key and d.is_active
), wr_activities as (
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
  from ledger_ranked ppb
  join public.players p on p.id = ppb.player_id
  left join public.events e on e.id = ppb.source_event_id and e.deleted_at is null
  where ppb.family_position = 1
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
select * from (
  select * from wr_activities
  union all select * from pb_activities
  union all select * from badge_activities
  union all select * from milestone_activities
) activities
-- Keep time/priority semantics; add a deterministic tie-break where legacy was unspecified.
order by occurred_at desc, priority desc, activity_id
limit greatest(0, p_limit);

$$;
revoke all on function public.get_prestige_activity_feed_v2(integer) from public;
grant execute on function public.get_prestige_activity_feed_v2(integer) to anon, authenticated;

-- Observe committed award changes, never recalculate eligibility on a read.
-- Publication membership is transactional DDL, not an award/data backfill.
do $publication$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'player_badge_award_ledger') then
      alter publication supabase_realtime add table public.player_badge_award_ledger;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'badge_definitions') then
      alter publication supabase_realtime add table public.badge_definitions;
    end if;
  end if;
end;
$publication$;

SET LOCAL ROLE authenticated;

EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT public.get_statistics_badge_dashboard(NULL);

EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT public.get_statistics_badge_dashboard(season_year)
FROM (
  SELECT max(season_year) season_year FROM (
    SELECT extract(year from start_date)::integer season_year FROM public.events WHERE deleted_at IS NULL
    UNION SELECT extract(year from attempt_date)::integer FROM public.historical_attempts WHERE deleted_at IS NULL
  ) years WHERE season_year >= 2026
) latest WHERE season_year IS NOT NULL;

EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT * FROM public.get_badge_rarity();

EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT * FROM public.get_prestige_activity_feed_v2(18);

-- 1. Exact visible metric parity. Legacy expansion may be slow; it is NOT used by the new RPC.
with latest as (
  select max(season_year) season_year from (
    select extract(year from start_date)::integer season_year from public.events where deleted_at is null
    union select extract(year from attempt_date)::integer from public.historical_attempts where deleted_at is null
  ) years where season_year >= 2026
), scopes as (
  select 'all-time'::text scope, null::integer season_year
  union all select 'season', season_year from latest where season_year is not null
), payloads as materialized (
  select scope, public.get_statistics_badge_dashboard(season_year) actual,
    public.get_unified_statistics_dashboard(season_year, null) legacy from scopes
), compared as (
  select scope,
    coalesce((select jsonb_agg(m order by m->>'key')
      from jsonb_array_elements(actual->'metrics') m), '[]'::jsonb) actual,
    coalesce((select jsonb_agg(m order by m->>'key')
      from jsonb_array_elements(legacy->'metrics') m
      where m->>'key' in ('bingo-fields','rare-hunter','badge-total','badge-bronze',
        'badge-silver','badge-gold','badge-diamond','badge-positive','badge-consolation')), '[]'::jsonb) expected
  from payloads
)
select scope, 'visible_metric_parity' check_name,
  case when actual = expected then 'OK' else 'FAIL' end result,
  case when actual = expected then null else jsonb_build_object('actual',actual,'expected',expected) end detail
from compared
union all select 'season','available_season','SKIP',to_jsonb('No existing season'::text)
where (select season_year from latest) is null;

-- 2. Canonical gallery/rarity are already ledger RPCs. Verify new feed against the gallery.
with canonical as materialized (
  select b.* from public.players p
  cross join lateral public.get_player_visible_badges(p.id) b
  where not p.is_ak and not p.is_archived
), feed as materialized (
  select * from public.get_prestige_activity_feed_v2(2147483647) where activity_type = 'badge'
), differences as (
  select coalesce(f.activity_id, concat('badge:',c.award_key)) activity_id
  from feed f full join canonical c on f.activity_id = concat('badge:',c.award_key)
  where f.player_id is distinct from c.player_id or f.badge_key is distinct from c.badge_key
    or f.occurred_at is distinct from c.awarded_at or f.tier is distinct from c.tier
), expected_rarity as (
  select l.badge_key, count(distinct l.player_id)::integer recipients
  from public.player_badge_award_ledger l
  join public.players p on p.id = l.player_id and not p.is_ak and not p.is_archived
  join public.badge_definitions d on d.badge_key = l.badge_key and d.is_active
  group by l.badge_key
), rarity_diff as (
  select coalesce(r.badge_key,e.badge_key) badge_key
  from public.get_badge_rarity() r full join expected_rarity e using (badge_key)
  where r.recipient_count is distinct from e.recipients
    or r.regular_player_count <> (select count(*) from public.players where not is_ak and not is_archived)
    or jsonb_array_length(r.recipients) <> e.recipients
    or r.rarity_percent is distinct from (
      select case when count(*) = 0 then null
        else round(e.recipients * 100.0 / count(*))::integer end
      from public.players where not is_ak and not is_archived)
)
select 'ledger_gallery_badge_tiers' check_name,
  case when count(*) = 0 then 'OK' else 'FAIL' end result,
  coalesce(string_agg(activity_id, ', '), 'all canonical gallery awards represented') detail from differences
union all
select 'ledger_rarity', case when count(*) = 0 then 'OK' else 'FAIL' end,
  coalesce(string_agg(badge_key, ', '), 'counts, population, percentages and recipient lengths match')
from rarity_diff;

-- 3. Real production impact. Complete feeds are compared before limiting to the visible 12/18.
-- Badge differences are not blanket-accepted: the canonical gallery provides the ledger proof.
with old_feed as materialized (
  select f.*, row_number() over (order by occurred_at desc, priority desc, activity_id) position
  from public.prestige_activity_feed f
), new_feed as materialized (
  select f.*, row_number() over (order by occurred_at desc, priority desc, activity_id) position
  from public.get_prestige_activity_feed_v2(2147483647) f
), canonical as materialized (
  select b.* from public.players p
  cross join lateral public.get_player_visible_badges(p.id) b
  where not p.is_ak and not p.is_archived
), joined as (
  select coalesce(n.activity_id,o.activity_id) activity_id,
    coalesce(n.activity_type,o.activity_type) activity_type,
    coalesce(n.badge_key,o.badge_key) badge_key,
    to_jsonb(o) old_row, to_jsonb(n) new_row,
    o.position old_position, n.position new_position,
    o.occurred_at old_time, n.occurred_at new_time,
    exists(select 1 from canonical c where concat('badge:',c.award_key) = n.activity_id
      and c.awarded_at = n.occurred_at and c.badge_key = n.badge_key
      and c.player_id = n.player_id and c.tier = n.tier
      and c.display_name = n.display_name
      and c.source_event_id is not distinct from n.event_id
      and n.title = concat('Badge: ', c.name)
      and n.description = concat(c.display_name, ' erhielt „', c.name, '“.')) ledger_proof,
    exists(select 1 from canonical c join public.badge_definitions d
      on d.badge_key = o.badge_key
      where c.player_id = o.player_id and c.family_key = d.family_key
        and c.award_key <> substring(o.activity_id from 7)) family_replaced
  from old_feed o full join new_feed n using (activity_id)
), classified as (
  select *, case
    when (old_row - 'position') is not distinct from (new_row - 'position') then 'OK'
    when activity_type <> 'badge' then 'FAIL_CANONICAL_NON_BADGE'
    when new_row is null and family_replaced then 'EXPECTED_LEDGER_FAMILY_SUPERSESSION'
    when new_row is null then 'FAIL_LEGACY_AWARD_MISSING_WITHOUT_LEDGER_REPLACEMENT'
    when not ledger_proof then 'FAIL_NEW_BADGE_WITHOUT_CANONICAL_LEDGER_PROOF'
    when badge_key = 'matrix-glitch' then 'EXPECTED_MATRIX_GLITCH_LEDGER_VS_LEGACY'
    when old_row is null then 'EXPECTED_CANONICAL_LEDGER_ADDITION'
    when (old_row - 'position' - 'occurred_at') = (new_row - 'position' - 'occurred_at')
      then 'EXPECTED_CANONICAL_LEDGER_TIMESTAMP'
    else 'REVIEW_OTHER_LEDGER_DIFFERENCE'
  end classification from joined
), report as (
  select 'summary'::text axis, 'ALL'::text activity_id, 'INFO'::text result,
    jsonb_build_object(
      'old_count',(select count(*) from old_feed),'new_count',(select count(*) from new_feed),
      'expected_changes',count(*) filter (where classification like 'EXPECTED_%'),
      'failures',count(*) filter (where classification like 'FAIL_%'),
      'review',count(*) filter (where classification like 'REVIEW_%'),
      'matrix_glitch_conflicts',count(*) filter (where classification = 'EXPECTED_MATRIX_GLITCH_LEDGER_VS_LEGACY')
    ) detail from classified
  union all
  select 'award_key_or_payload',activity_id,classification,
    jsonb_build_object('legacy',old_row - 'position','ledger_feed',new_row - 'position',
      'canonical_ledger_proof',ledger_proof,'family_replaced',family_replaced)
  from classified where classification <> 'OK'
  union all
  select 'timestamp',activity_id,classification,
    jsonb_build_object('legacy',old_time,'ledger_feed',new_time)
  from classified where old_time is distinct from new_time
  union all
  select 'order',activity_id,
    case when classification like 'FAIL_%' then classification
      when exists(select 1 from classified where classification like 'FAIL_%' or classification like 'REVIEW_%')
        then 'REVIEW_ORDER_SHIFT'
      else 'EXPECTED_LEDGER_ORDER_SHIFT' end,
    jsonb_build_object('legacy_position',old_position,'ledger_position',new_position,
      'note','time/priority preserved; activity_id resolves previously unspecified ties')
  from classified where old_position is distinct from new_position
)
select * from report order by axis, activity_id;

ROLLBACK;
