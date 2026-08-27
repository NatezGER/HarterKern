-- PR #36 final review: correct Favorite Time thresholds and complete the
-- existing BINGO line badge family without changing either calculation engine.

update public.badge_definitions
set threshold = case tier
    when 'bronze' then 2 when 'silver' then 3
    when 'gold' then 5 when 'diamond' then 10 end,
  description = case tier
    when 'bronze' then 'Dieselbe vollständige Zeit zweimal erreicht.'
    when 'silver' then 'Dieselbe vollständige Zeit dreimal erreicht.'
    when 'gold' then 'Dieselbe vollständige Zeit fünfmal erreicht.'
    when 'diamond' then 'Dieselbe vollständige Zeit zehnmal erreicht.' end,
  requirement = case tier
    when 'bronze' then 'Dieselbe Zeit mit zwei Nachkommastellen 2-mal erreichen'
    when 'silver' then 'Dieselbe Zeit mit zwei Nachkommastellen 3-mal erreichen'
    when 'gold' then 'Dieselbe Zeit mit zwei Nachkommastellen 5-mal erreichen'
    when 'diamond' then 'Dieselbe Zeit mit zwei Nachkommastellen 10-mal erreichen' end
where family_key = 'favorite-time';

insert into public.badge_definitions (
  badge_key, category, tier, name, description, threshold, sort_order,
  family_key, requirement, is_secret, badge_kind, design_variant,
  scope_type, is_active
) values (
  'bingo-diamond', 'bingo', 'diamond', 'BINGO Diamond',
  'Mindestens eine vollständige BINGO-Linie mit je fünf eigenen Treffern.',
  5, 133, 'bingo', 'Eine vollständige Diamond-BINGO-Linie', false,
  'tiered', 'standard', 'all_time', true
)
on conflict (badge_key) do update set
  category = excluded.category, tier = excluded.tier, name = excluded.name,
  description = excluded.description, threshold = excluded.threshold,
  sort_order = excluded.sort_order, family_key = excluded.family_key,
  requirement = excluded.requirement, badge_kind = excluded.badge_kind,
  design_variant = excluded.design_variant, scope_type = excluded.scope_type,
  is_active = excluded.is_active;

-- The existing line grid is the canonical source. Diamond means the same
-- line has reached the already established five-hit top material threshold.
create or replace view public.bingo_line_diamond_badge_awards
with (security_invoker = true)
as
with fifth_hits as (
  select l.player_id, l.line_key,
    max(hit.occurred_at) as achieved_at
  from public.player_bingo_lines l
  cross join lateral unnest(l.endings) ending
  join lateral (
    select h.occurred_at
    from public.player_bingo_hits h
    where h.player_id = l.player_id and h.ending = ending
    order by h.occurred_at, h.source_priority, h.source_order, h.source_id
    offset 4 limit 1
  ) hit on true
  group by l.player_id, l.line_key
  having count(*) = 10
), first_line as (
  select distinct on (player_id) player_id, achieved_at
  from fifth_hits
  order by player_id, achieved_at, line_key
)
select concat(player_id, ':bingo-diamond') award_key, player_id,
  'bingo-diamond'::text badge_key, 'bingo'::text source_type,
  null::uuid source_attempt_id, null::uuid source_historical_attempt_id,
  null::uuid source_event_id, achieved_at awarded_at,
  jsonb_build_object('progress', 1, 'diamondLines', 1,
    'lineCountsAreCumulative', true) metadata
from first_line;

grant select on public.bingo_line_diamond_badge_awards to anon, authenticated;

create or replace view public.public_player_badges
with (security_invoker = true)
as
with combined_awards as (
  select * from public.player_badge_awards
  union all select * from public.pre_p11_badge_awards
  union all select * from public.event_lead_time_badge_awards
  union all select * from public.bingo_line_diamond_badge_awards
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

-- Keep the player-scoped RPC on the same canonical visible award set. This
-- avoids repeating a source list that can drift from public_player_badges.
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
  select visible.*
  from public.visible_player_badges visible
  where visible.player_id = p_player_id
  order by visible.tier_rank desc, visible.is_special_event_badge desc,
    visible.recipient_count, visible.sort_order, visible.award_key;
$$;

revoke all on function public.get_visible_player_badges(uuid) from public;
grant execute on function public.get_visible_player_badges(uuid) to anon, authenticated;
