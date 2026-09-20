-- A BINGO line must never qualify a full-card award. The original line award
-- source joins definitions by category='bingo'; completion definitions were
-- added later with that same category, so one line leaked into both families.
-- Completion eligibility itself remains the canonical 100-ending view.
alter table public.badge_definitions
  drop constraint badge_definitions_category_check;

alter table public.badge_definitions
  add constraint badge_definitions_category_check check (category in (
    'attempts', 'wins', 'streak', 'win_streak', 'sub3_streak', 'flawless',
    'favorite_time', 'activity', 'community', 'events', 'podiums',
    'precision', 'most_wanted', 'bingo', 'bingo_completion', 'performance',
    'record', 'first_attempt', 'dnf', 'glitch', 'consolation', 'podium',
    'event_attempts', 'rapid_fire', 'teamwork'
  ));

-- The definition-change trigger normally calls sync_all_player_badge_award_ledgers().
-- Suppress it only for this one update, then immediately sync existing
-- completion recipients in one batch. If this block fails, PostgreSQL rolls
-- back the trigger-state change together with the update.
do $$
declare
  affected_player_ids uuid[];
begin
  select array_agg(distinct ledger.player_id order by ledger.player_id)
  into affected_player_ids
  from public.player_badge_award_ledger ledger
  where ledger.badge_key like 'bingo-completion-%';

  alter table public.badge_definitions
    disable trigger badge_definitions_refresh_badge_ledger;
  update public.badge_definitions
  set category = 'bingo_completion'
  where family_key = 'bingo-completion'
    and category is distinct from 'bingo_completion';
  alter table public.badge_definitions
    enable trigger badge_definitions_refresh_badge_ledger;

  if coalesce(cardinality(affected_player_ids), 0) > 0 then
    perform public.sync_player_badge_award_ledgers(affected_player_ids);
  end if;
end;
$$;
