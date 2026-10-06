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
