-- P11.7 hotfix: event badge unlocks must use the persisted canonical ledger.
-- The previous view expanded live eligibility and global rarity on every event read.

create index if not exists player_badge_award_ledger_event_idx
  on public.player_badge_award_ledger (source_event_id)
  where source_event_id is not null;

create or replace view public.event_badge_unlocks
with (security_invoker = true)
as
with population as materialized (
  select count(*)::integer regular_player_count
  from public.players
  where not is_ak and not is_archived
)
select
  ledger.award_key, ledger.player_id, players.display_name,
  players.avatar_url, players.avatar_path, ledger.badge_key,
  definitions.category, definitions.tier, definitions.name,
  definitions.description, definitions.family_key,
  definitions.requirement, definitions.threshold,
  definitions.sort_order, definitions.is_secret, ledger.source_type,
  ledger.source_attempt_id, ledger.source_historical_attempt_id,
  ledger.source_event_id, events.name source_event_name,
  events.start_date source_event_date, ledger.awarded_at,
  ledger.metadata,
  case definitions.tier when 'special' then 6 when 'diamond' then 5
    when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end tier_rank,
  rarity.recipient_count, population.regular_player_count,
  case when population.regular_player_count = 0 then null
    else round(rarity.recipient_count * 100.0 /
      population.regular_player_count)::integer end rarity_percent,
  ledger.source_attempt_number, ledger.source_time_hundredths,
  null::text next_badge_key, null::text next_badge_name,
  null::text next_requirement, null::public.badge_tier next_tier,
  null::integer next_threshold,
  (ledger.metadata->>'progress')::integer current_progress,
  definitions.category = 'podium' is_special_event_badge,
  definitions.badge_kind, definitions.design_variant,
  definitions.scope_type
from public.player_badge_award_ledger ledger
join public.players players on players.id = ledger.player_id
  and not players.is_ak and not players.is_archived
join public.badge_definitions definitions
  on definitions.badge_key = ledger.badge_key and definitions.is_active
join public.events events
  on events.id = ledger.source_event_id and events.deleted_at is null
cross join population
join lateral (
  select count(distinct awards.player_id)::integer recipient_count
  from public.player_badge_award_ledger awards
  join public.players recipients on recipients.id = awards.player_id
    and not recipients.is_ak and not recipients.is_archived
  where awards.badge_key = ledger.badge_key
) rarity on true;

grant select on public.event_badge_unlocks to anon, authenticated;
